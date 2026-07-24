/**
 * Payments IPC Handlers
 * Handles IPC communication for payment/receipt operations
 */

import { registerIPCHandler, validators } from '../index';
import type { CreatePaymentInput } from '../../database/repositories';

/**
 * Register all payments-related IPC handlers
 */
export function registerPaymentsHandlers(): void {
  // List all payments
  registerIPCHandler('payments:list', async (event, args, repos) => {
    const { type, customerId, supplierId, accountId, startDate, endDate, sort, pagination } = args || {};
    
    const payments = await repos.payments.getAll({
      filters: {
        ...(type && { type }),
        ...(customerId && { customer_id: customerId }),
        ...(supplierId && { supplier_id: supplierId }),
        ...(accountId && { account_id: accountId }),
      },
      sort: sort || { field: 'payment_date', order: 'DESC' },
      pagination,
    });
    return payments;
  });

  // Get payment by ID
  registerIPCHandler('payments:get', async (event, args, repos) => {
    const { id } = args;
    validators.requiredNumber(id, 'Payment ID');
    
    const payment = await repos.payments.getById(id);
    if (!payment) {
      throw new Error(`Payment not found: ${id}`);
    }
    
    return payment;
  });

  // Create new payment/receipt
  registerIPCHandler('payments:create', async (event, args: CreatePaymentInput, repos) => {
    // Validate required fields
    validators.requiredString(args.account_id, 'Account ID');
    validators.requiredNumber(args.amount, 'Amount');
    validators.positiveNumber(args.amount, 'Amount');

    // Validate customer or supplier
    if (!args.customer_id && !args.supplier_id) {
      throw new Error('Either Customer ID or Supplier ID is required');
    }

    // Get account details
    const account = await repos.accounts.getById(args.account_id);
    if (!account) {
      throw new Error('Account not found');
    }

    let actualPaymentAmount = args.amount;

    // For supplier payments, check account balance and limit amount
    if (args.supplier_id && args.payment_type === 'payment') {
      const availableBalance = account.current_balance;
      actualPaymentAmount = Math.min(args.amount, availableBalance);
      
      if (actualPaymentAmount <= 0) {
        throw new Error('Insufficient account balance for payment');
      }
    } 
    // For customer receipts, use full amount
    else if (args.customer_id && args.payment_type === 'receipt') {
      actualPaymentAmount = args.amount;
    }

    // Create payment with actual amount - PaymentsRepository will handle account balance updates automatically
    const paymentData = {
      ...args,
      amount: actualPaymentAmount,
    };
    
    const paymentId = await repos.payments.createPayment(paymentData);
    
    return { id: paymentId, actualAmount: actualPaymentAmount };
  });

  // Update payment
  registerIPCHandler('payments:update', async (event, args, repos) => {
    const { id, data } = args;
    validators.requiredNumber(id, 'Payment ID');
    
    if (data.amount !== undefined) {
      validators.positiveNumber(data.amount, 'Amount');
    }

    const success = await repos.payments.update(id, data);
    if (!success) {
      throw new Error('Failed to update payment');
    }
    
    return { success: true };
  });

  // Delete payment (soft delete)
  registerIPCHandler('payments:delete', async (event, args, repos) => {
    const { id } = args;
    validators.requiredNumber(id, 'Payment ID');

    const success = await repos.payments.delete(id, true);
    if (!success) {
      throw new Error('Failed to delete payment');
    }
    
    return { success: true };
  });

  // Search payments
  registerIPCHandler('payments:search', async (event, args, repos) => {
    const { term } = args;
    validators.requiredString(term, 'Search term');
    
    return repos.payments.search(term);
  });

  // Get customer receipts
  registerIPCHandler('payments:receipts', async (event, args, repos) => {
    return repos.payments.getAll({
      filters: { customer_id: { $ne: null } },
    });
  });

  // Get supplier payments
  registerIPCHandler('payments:supplier-payments', async (event, args, repos) => {
    return repos.payments.getAll({
      filters: { supplier_id: { $ne: null } },
    });
  });

  // Get payments by customer
  registerIPCHandler('payments:by-customer', async (event, args, repos) => {
    const { customerId } = args;
    validators.requiredString(customerId, 'Customer ID');
    
    return repos.payments.getByCustomer(customerId);
  });

  // Get payments by supplier
  registerIPCHandler('payments:by-supplier', async (event, args, repos) => {
    const { supplierId } = args;
    validators.requiredString(supplierId, 'Supplier ID');
    
    return repos.payments.getBySupplier(supplierId);
  });

  // Get payments by account
  registerIPCHandler('payments:by-account', async (event, args, repos) => {
    const { accountId } = args;
    validators.requiredString(accountId, 'Account ID');
    
    return repos.payments.getByAccount(accountId);
  });

  // Get payments by sale
  registerIPCHandler('payments:by-sale', async (event, args, repos) => {
    const { saleId } = args;
    validators.requiredString(saleId, 'Sale ID');
    
    return repos.payments.getBySale(saleId);
  });

  // Get payments by purchase
  registerIPCHandler('payments:by-purchase', async (event, args, repos) => {
    const { purchaseId } = args;
    validators.requiredString(purchaseId, 'Purchase ID');
    
    return repos.payments.getByPurchase(purchaseId);
  });

  // Get payments by date range
  registerIPCHandler('payments:by-date-range', async (event, args, repos) => {
    const { startDate, endDate } = args;
    validators.requiredString(startDate, 'Start Date');
    validators.requiredString(endDate, 'End Date');
    
    return repos.payments.getPaymentsByDateRange(startDate, endDate);
  });

  // Get total customer receipts
  registerIPCHandler('payments:total-receipts', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    return repos.payments.getTotalReceipts(startDate, endDate);
  });

  // Get total supplier payments
  registerIPCHandler('payments:total-payments', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    return repos.payments.getTotalPayments(startDate, endDate);
  });

  // Get payment summary
  registerIPCHandler('payments:summary', async (event, args, repos) => {
    const { startDate, endDate } = args || {};
    return repos.payments.getPaymentSummary(startDate, endDate);
  });
}
