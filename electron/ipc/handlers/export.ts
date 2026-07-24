/**
 * Export IPC Handlers
 * Handles IPC communication for data export operations
 */

import { registerIPCHandler, validators } from '../index';
import { ExportService } from '../../export/ExportService';

/**
 * Register all export-related IPC handlers
 */
export function registerExportHandlers(): void {
    // Export customers
    registerIPCHandler('export:customers', async (event, args, repos) => {

        const { format = 'excel', status = 'all' } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportCustomers(format, status);

        return { success: true, filePath };
    });

    // Export suppliers
    registerIPCHandler('export:suppliers', async (event, args, repos) => {

        const { format = 'excel', status = 'all' } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportSuppliers(format, status);

        return { success: true, filePath };
    });

    // Export items
    registerIPCHandler('export:items', async (event, args, repos) => {

        const { format = 'excel', status = 'all' } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportItems(format, status);

        return { success: true, filePath };
    });

    // Export sales
    registerIPCHandler('export:sales', async (event, args, repos) => {

        const { format = 'excel', startDate, endDate } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            throw new Error('Start date must be before or equal to end date');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportSales(format, startDate, endDate);

        return { success: true, filePath };
    });

    // Export purchases
    registerIPCHandler('export:purchases', async (event, args, repos) => {

        const { format = 'excel', startDate, endDate } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            throw new Error('Start date must be before or equal to end date');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportPurchases(format, startDate, endDate);

        return { success: true, filePath };
    });

    // Export ledger
    registerIPCHandler('export:ledger', async (event, args, repos) => {

        const { format = 'excel', accountId, startDate, endDate } = args || {};

        if (format !== 'excel' && format !== 'csv' && format !== 'pdf') {
            throw new Error('Invalid format. Must be "excel", "csv", or "pdf"');
        }

        // Validate date range if provided
        if (startDate && endDate && startDate > endDate) {
            throw new Error('Start date must be before or equal to end date');
        }

        const exportService = new ExportService(repos.db);
        const filePath = await exportService.exportLedger(format, accountId, startDate, endDate);

        return { success: true, filePath };
    });
}
