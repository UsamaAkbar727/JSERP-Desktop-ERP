/**
 * Purchases IPC Handlers
 * Handles IPC communication for purchase/bill operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreatePurchaseInput, UpdatePurchaseInput } from '../../database/repositories';

type PurchaseItemInput = {
  item_id: string;
  quantity: number;
  unit_price: number;
};

/**
 * Register all purchases-related IPC handlers
 */
export function registerPurchasesHandlers(): void {
  // List all purchases
  registerIPCHandler('purchases:list', async (event, args, repos) => {
    const { supplierId, status, startDate, endDate, sort, pagination } = args || {};
    
    const purchases = await repos.purchases.getAll({
      filters: {
        ...(supplierId && { supplier_id: supplierId }),
        ...(status && { status }),
      },
      sort: sort || { field: 'purchase_date', order: 'DESC' },
      pagination,
    });
    return purchases;
  });

  // Get purchase by ID
  registerIPCHandler('purchases:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Purchase ID');
    
    const purchase = await repos.purchases.getById(id);
    if (!purchase) {
      throw new Error(`Purchase not found: ${id}`);
    }
    
    return purchase;
  });

  // Get purchase with items
  registerIPCHandler('purchases:get-with-items', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Purchase ID');
    
    const purchase = await repos.purchases.getById(id);
    if (!purchase) {
      throw new Error(`Purchase not found: ${id}`);
    }
    
    return purchase;
  });

  /**
   * Complex create handler that:
   * - Creates purchase with items
   * - Updates stock for each item
   * - Updates supplier balance if credit purchase
   * - Records payment if immediate payment
   * - Auto-generates bill number from format settings when auto_generate=true
   */
  registerIPCHandler('purchases:create', async (event, args: CreatePurchaseInput & { items: PurchaseItemInput[], payment?: { amount: number, account_id: string, method: string }, auto_generate?: boolean }, repos) => {
    // Validate required fields
    validators.requiredString(args.supplier_id, 'Supplier ID');
    validators.requiredNumber(args.total_amount, 'Total Amount');
    validators.requiredNumber(args.paid_amount, 'Paid Amount');
    validators.positiveNumber(args.total_amount, 'Total Amount');
    validators.nonNegativeNumber(args.paid_amount, 'Paid Amount');
    
    if (args.paid_amount > args.total_amount) {
      throw new Error('Paid amount cannot be greater than total amount');
    }

    if (!args.items || !Array.isArray(args.items) || args.items.length === 0) {
      throw new Error('Purchase must have at least one item');
    }

    // Validate items
    for (const item of args.items) {
      validators.requiredString(item.item_id, 'Item ID');
      validators.requiredNumber(item.quantity, 'Quantity');
      validators.requiredNumber(item.unit_price, 'Unit Price');
      validators.positiveNumber(item.quantity, 'Quantity');
      validators.positiveNumber(item.unit_price, 'Unit Price');
    }

    // Validate payment if provided
    if (args.payment) {
      validators.requiredNumber(args.payment.amount, 'Payment Amount');
      validators.requiredString(args.payment.account_id, 'Payment Account');
      validators.requiredString(args.payment.method, 'Payment Method');
      validators.nonNegativeNumber(args.payment.amount, 'Payment Amount');
      
      if (args.payment.amount > args.paid_amount) {
        throw new Error('Payment amount cannot be greater than paid amount');
      }
    }

    // Create purchase with items in a transaction
    // Extract payment and auto_generate flag from args before passing to repository
    const { payment, auto_generate, ...purchaseData } = args;

    // ── Bill number resolution ────────────────────────────────────────────────
    if (auto_generate) {
      purchaseData.bill_number = repos.invoiceFormat.generateNextNumber('purchase');
    } else {
      if (!purchaseData.bill_number) {
        throw new Error('Bill number is required when auto_generate is false');
      }
      const isUnique = repos.invoiceFormat.isNumberUnique('purchase', purchaseData.bill_number);
      if (!isUnique) {
        throw new Error(`Bill number "${purchaseData.bill_number}" already exists. Please use a different number.`);
      }
    }

    // Items are already in correct format with unit_price
    const transformedPurchaseData = {
      ...purchaseData,
      items: purchaseData.items,
    };
    
    // Create the purchase first
    const purchaseId = await repos.purchases.createWithItems(transformedPurchaseData);
    
    // Record payment if provided and adjust based on account balance
    let actualPaidAmount = purchaseData.paid_amount;
    
    if (payment && payment.amount > 0) {
      try {
        const account = await repos.accounts.getById(payment.account_id);
        if (!account) {
          throw new Error('Account not found');
        }

        // Check available balance in the account (ensure it doesn't go negative)
        const availableBalance = Math.max(0, account.current_balance);
        const requestedPayment = payment.amount;
        
        // Determine actual payment amount based on available balance
        // This ensures account balance never goes below zero
        const actualPaymentAmount = Math.min(requestedPayment, availableBalance, purchaseData.total_amount);
        
        if (actualPaymentAmount > 0) {
          // Record the payment - PaymentsRepository will handle account balance updates automatically  
          await repos.payments.createPayment({
            id: `PAY-${Date.now()}`,
            payment_type: 'payment',
            supplier_id: purchaseData.supplier_id,
            purchase_id: purchaseId,
            account_id: payment.account_id,
            account_name: account.account_name,
            payment_method: (payment.method || 'cash') as any,
            amount: actualPaymentAmount,
            payment_date: new Date().toISOString(),
          });
          
          // Update actual paid amount if it differs from requested
          if (actualPaymentAmount < requestedPayment) {
            // Adjust the purchase paid_amount to reflect what was actually paid
            actualPaidAmount = purchaseData.paid_amount - (requestedPayment - actualPaymentAmount);
            
            // Update purchase payment status
            const dueAmount = purchaseData.total_amount - actualPaidAmount;
            const newPaymentStatus = actualPaidAmount === 0 ? 'due' : 
                                    actualPaidAmount >= purchaseData.total_amount ? 'paid' : 'partial';
            
            await repos.purchases.updatePaymentStatus(purchaseId, actualPaidAmount, newPaymentStatus);
          }
        } else {
          // No balance available, keep purchase as due
          console.warn('Insufficient account balance for payment');
        }
      } catch (error) {
        console.error('Failed to record payment:', error);
        throw new Error(`Payment processing failed: ${error}`);
      }
    }

    return { id: purchaseId, actualPaidAmount };
  });

  // Update purchase
  registerIPCHandler('purchases:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Purchase ID');
    
    if (data.total_amount !== undefined) {
      validators.positiveNumber(data.total_amount, 'Total Amount');
    }
    if (data.paid_amount !== undefined) {
      validators.positiveNumber(data.paid_amount, 'Paid Amount');
    }

    // Validate bill number uniqueness if being updated
    if (data.bill_number !== undefined) {
      // Get the current purchase to check if bill number is changing
      const currentPurchase = await repos.purchases.getById(id);
      if (currentPurchase && currentPurchase.bill_number !== data.bill_number) {
        const isUnique = repos.invoiceFormat.isNumberUnique('purchase', data.bill_number);
        if (!isUnique) {
          throw new Error(`Bill number "${data.bill_number}" already exists. Please use a different number.`);
        }
      }
    }

    const success = await repos.purchases.update(id, data as UpdatePurchaseInput);
    if (!success) {
      throw new Error('Failed to update purchase');
    }
    
    return { success: true };
  });

  // Update purchase payment status
  registerIPCHandler('purchases:update-status', async (event, args, repos) => {
    const { id, paidAmount, paymentStatus } = args;
    validators.requiredString(id, 'Purchase ID');
    validators.requiredNumber(paidAmount, 'Paid Amount');
    validators.oneOf(paymentStatus, ['paid', 'partial', 'due'], 'Payment Status');

    const success = await repos.purchases.updatePaymentStatus(id, paidAmount, paymentStatus);
    if (!success) {
      throw new Error('Failed to update purchase status');
    }
    
    return { success: true };
  });

  // Delete purchase (soft delete)
  registerIPCHandler('purchases:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Purchase ID');

    const success = await repos.purchases.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete purchase');
    }
    
    return { success: true };
  });

  // Search purchases
  registerIPCHandler('purchases:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.purchases.search(term);
  });

  // Get purchases by supplier
  registerIPCHandler('purchases:by-supplier', async (event, args, repos) => {
    const { supplierId } = args;
    validators.requiredString(supplierId, 'Supplier ID');
    
    return repos.purchases.getBySupplier(supplierId);
  });

  // Get purchases by date range
  registerIPCHandler('purchases:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.purchases.getPurchasesByDateRange(startDate, endDate);
  });

  // Get purchases by payment status
  registerIPCHandler('purchases:by-payment-status', async (event, args, repos) => {
    const { status } = args;
    validators.oneOf(status, ['paid', 'partial', 'due'], 'Payment Status');
    return repos.purchases.getByPaymentStatus(status);
  });

  // Get purchases summary
  registerIPCHandler('purchases:summary', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    return repos.purchases.getPurchasesSummary(startDate, endDate);
  });

  // Get daily purchases report
  registerIPCHandler('purchases:daily-report', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    return repos.purchases.getDailyPurchasesReport(startDate, endDate);
  });

  // Generate next bill number
  registerIPCHandler('purchases:next-bill', async (event, args, repos) => {
    return repos.purchases.getNextBillNumber();
  });

  // Get purchase by bill number
  registerIPCHandler('purchases:by-bill', async (event, args, repos) => {
    const { billNumber } = args;
    validators.requiredString(billNumber, 'Bill Number');
    return repos.purchases.getByBillNumber(billNumber);
  });
}
