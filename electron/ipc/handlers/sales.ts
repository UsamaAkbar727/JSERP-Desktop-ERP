/**
 * Sales IPC Handlers
 * Handles IPC communication for sales/invoice operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreateSaleInput, UpdateSaleInput } from '../../database/repositories';

type SaleItemInput = {
  item_id: string;
  quantity: number;
  unit_price: number;
};

/**
 * Register all sales-related IPC handlers
 */
export function registerSalesHandlers(): void {
  // List all sales
  registerIPCHandler('sales:list', async (event, args, repos) => {
    const { customerId, status, startDate, endDate, sort, pagination } = args || {};
    
    const sales = await repos.sales.getAll({
      filters: {
        ...(customerId && { customer_id: customerId }),
        ...(status && { status }),
      },
      sort: sort || { field: 'sale_date', order: 'DESC' },
      pagination,
    });
    return sales;
  });

  // Get sale by ID
  registerIPCHandler('sales:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Sale ID');
    
    const sale = await repos.sales.getById(id);
    if (!sale) {
      throw new Error(`Sale not found: ${id}`);
    }
    
    return sale;
  });

  // Get sale with items
  registerIPCHandler('sales:get-with-items', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Sale ID');
    
    const sale = await repos.sales.getById(id);
    if (!sale) {
      throw new Error(`Sale not found: ${id}`);
    }
    
    // Get sale items separately
    const items = await repos.sales.getSaleItems(id);
    
    return { ...sale, items };
  });

  /**
   * Complex create handler that:
   * - Creates sale with items
   * - Updates stock for each item
   * - Updates customer balance if credit sale
   * - Records payment if immediate payment
   * - Auto-generates invoice number from format settings when auto_generate=true
   */
  registerIPCHandler('sales:create', async (event, args: CreateSaleInput & { items: SaleItemInput[], payment?: { amount: number, account_id: string, method: string }, auto_generate?: boolean }, repos) => {
    console.log('🚀 [Sales IPC] Received create request with args:', {
      hasPayment: !!args.payment,
      paymentAmount: args.payment?.amount,
      paymentAccountId: args.payment?.account_id,
      paymentMethod: args.payment?.method,
      paidAmount: args.paid_amount,
      totalAmount: args.total_amount
    });

    // Validate required fields
    validators.requiredString(args.customer_id, 'Customer ID');
    validators.requiredNumber(args.total_amount, 'Total Amount');
    validators.requiredNumber(args.paid_amount, 'Paid Amount');
    validators.positiveNumber(args.total_amount, 'Total Amount');
    validators.nonNegativeNumber(args.paid_amount, 'Paid Amount');
    
    if (args.paid_amount > args.total_amount) {
      throw new Error('Paid amount cannot be greater than total amount');
    }

    if (!args.items || !Array.isArray(args.items) || args.items.length === 0) {
      throw new Error('Sale must have at least one item');
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

    // Create sale with items in a transaction
    // Extract payment and auto_generate flag from args before passing to repository
    const { payment, auto_generate, ...saleData } = args;

    // ── Invoice number resolution ───────────────────────────────────────────
    // auto_generate=true  → atomically get next number from format settings
    // auto_generate=false → use caller-supplied invoice_number (validate uniqueness)
    if (auto_generate) {
      // Atomically increment counter and get the invoice number
      saleData.invoice_number = repos.invoiceFormat.generateNextNumber('sale');
    } else {
      // User provided a custom invoice number – validate uniqueness
      if (!saleData.invoice_number) {
        throw new Error('Invoice number is required when auto_generate is false');
      }
      const isUnique = repos.invoiceFormat.isNumberUnique('sale', saleData.invoice_number);
      if (!isUnique) {
        throw new Error(`Invoice number "${saleData.invoice_number}" already exists. Please use a different number.`);
      }
    }

    // Items are already in correct format with unit_price
    const transformedSaleData = {
      ...saleData,
      items: saleData.items,
    };

    // Create the sale first
    const saleId = await repos.sales.create(transformedSaleData);

    console.log('💰 [Sales IPC] Payment received:', {
      hasPayment: !!payment,
      amount: payment?.amount,
      accountId: payment?.account_id,
      method: payment?.method
    });

    // Record payment if provided
    if (payment && payment.amount > 0) {
      try {
        const account = await repos.accounts.getById(payment.account_id);
        if (!account) {
          console.error('❌ [Sales IPC] Account not found:', payment.account_id);
          throw new Error('Account not found');
        }

        console.log('✅ [Sales IPC] Account found:', {
          accountId: account.id,
          accountName: account.account_name,
          currentBalance: account.current_balance
        });
           
        const paymentData = {
          id: `PAY-${Date.now()}`,
          payment_type: 'receipt' as const,
          customer_id: saleData.customer_id,
          sale_id: saleId,
          account_id: payment.account_id,
          account_name: account.account_name,
          payment_method: (payment.method || 'cash') as any,
          amount: payment.amount,
          payment_date: saleData.sale_date,
        };

        console.log('📝 [Sales IPC] Creating payment record:', paymentData);

        // Record the payment - PaymentsRepository will handle account balance update automatically
        const paymentId = await repos.payments.createPayment(paymentData);
        
        console.log('✅ [Sales IPC] Payment created successfully:', paymentId);
        
        // Verify account balance was updated
        const updatedAccount = await repos.accounts.getById(payment.account_id);
        console.log('📊 [Sales IPC] Account balance after payment:', {
          accountId: updatedAccount?.id,
          newBalance: updatedAccount?.current_balance,
          expectedIncrease: payment.amount
        });
      } catch (error) {
        console.error('❌ [Sales IPC] Failed to record payment:', error);
        throw new Error(`Payment processing failed: ${error}`);
      }
    } else {
      console.log('ℹ️ [Sales IPC] No payment to record (credit sale or zero payment)');
    }

    return { id: saleId };
  });

  // Update sale
  registerIPCHandler('sales:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredString(id, 'Sale ID');
    
    if (data.total_amount !== undefined) {
      validators.positiveNumber(data.total_amount, 'Total Amount');
    }
    if (data.paid_amount !== undefined) {
      validators.nonNegativeNumber(data.paid_amount, 'Paid Amount');
    }

    if (Array.isArray(data.items)) {
      if (data.items.length === 0) {
        throw new Error('Sale must have at least one item');
      }
      for (const item of data.items) {
        validators.requiredString(item.item_id, 'Item ID');
        validators.requiredNumber(item.quantity, 'Quantity');
        validators.requiredNumber(item.unit_price, 'Unit Price');
        validators.positiveNumber(item.quantity, 'Quantity');
        validators.positiveNumber(item.unit_price, 'Unit Price');
      }
    }

    // Validate invoice number uniqueness if being updated
    if (data.invoice_number !== undefined) {
      // Get the current sale to check if invoice number is changing
      const currentSale = await repos.sales.getById(id);
      if (currentSale && currentSale.invoice_number !== data.invoice_number) {
        const isUnique = repos.invoiceFormat.isNumberUnique('sale', data.invoice_number);
        if (!isUnique) {
          throw new Error(`Invoice number "${data.invoice_number}" already exists. Please use a different number.`);
        }
      }
    }

    const success = await repos.sales.update(id, data as UpdateSaleInput);
    if (!success) {
      throw new Error('Failed to update sale');
    }
    
    return { success: true };
  });

  // Update sale payment status
  registerIPCHandler('sales:update-status', async (event, args, repos) => {
    const { id, paidAmount, paymentStatus } = args;
    validators.requiredString(id, 'Sale ID');
    validators.requiredNumber(paidAmount, 'Paid Amount');
    validators.oneOf(paymentStatus, ['paid', 'partial', 'due'], 'Payment Status');

    const success = await repos.sales.updatePaymentStatus(id, paidAmount, paymentStatus);
    if (!success) {
      throw new Error('Failed to update sale status');
    }
    
    return { success: true };
  });

  // Delete sale (soft delete)
  registerIPCHandler('sales:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredString(id, 'Sale ID');

    const success = await repos.sales.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete sale');
    }
    
    return { success: true };
  });

  // Search sales
  registerIPCHandler('sales:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.sales.search(term);
  });

  // Get sales by customer
  registerIPCHandler('sales:by-customer', async (event, args, repos) => {
    const { customerId } = args;
    validators.requiredString(customerId, 'Customer ID');
    
    return repos.sales.getByCustomer(customerId);
  });

  // Get sales by date range
  registerIPCHandler('sales:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.sales.getSalesByDateRange(startDate, endDate);
  });

  // Get sales by payment status
  registerIPCHandler('sales:by-payment-status', async (event, args, repos) => {
    const { status } = args;
    validators.oneOf(status, ['paid', 'partial', 'due'], 'Payment Status');
    return repos.sales.getByPaymentStatus(status);
  });

  // Get sales summary
  registerIPCHandler('sales:summary', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    return repos.sales.getSalesSummary(startDate, endDate);
  });

  // Get top selling items
  registerIPCHandler('sales:top-selling-items', async (event, args, repos) => {
    const { limit, startDate, endDate } = args || {};
    return repos.sales.getTopSellingItems(limit || 10, startDate, endDate);
  });

  // Get daily sales report
  registerIPCHandler('sales:daily-report', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    return repos.sales.getDailySalesReport(startDate, endDate);
  });

  // Generate next invoice number
  registerIPCHandler('sales:next-invoice', async (event, args, repos) => {
    return repos.sales.getNextInvoiceNumber();
  });

  // Get sale by invoice number
  registerIPCHandler('sales:by-invoice', async (event, args, repos) => {
    const { invoiceNumber } = args;
    validators.requiredString(invoiceNumber, 'Invoice Number');
    return repos.sales.getByInvoiceNumber(invoiceNumber);
  });
}
