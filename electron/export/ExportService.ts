/**
 * Export Service
 * Handles data export to Excel, CSV, and PDF formats
 */

import ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import type { Database } from 'better-sqlite3';

export interface ExportColumn {
    header: string;
    key: string;
    width?: number;
    style?: Partial<ExcelJS.Style>;
}

export interface ExportOptions {
    format: 'excel' | 'csv' | 'pdf';
    startDate?: string;
    endDate?: string;
    status?: 'active' | 'inactive' | 'all';
}

export class ExportService {
    constructor(private db: Database) { }

    /**
     * Show save dialog and get file path
     */
    private async getSaveFilePath(defaultName: string, format: 'excel' | 'csv' | 'pdf'): Promise<string | null> {
        const extension = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : 'pdf';
        const filters = format === 'excel'
            ? [{ name: 'Excel Files', extensions: ['xlsx'] }]
            : format === 'csv'
            ? [{ name: 'CSV Files', extensions: ['csv'] }]
            : [{ name: 'PDF Files', extensions: ['pdf'] }];

        const result = await dialog.showSaveDialog({
            title: 'Export Data',
            defaultPath: `${defaultName}.${extension}`,
            filters,
        });

        return result.canceled ? null : result.filePath || null;
    }

    /**
     * Export data to Excel format
     */
    private async exportToExcel(
        data: any[],
        columns: ExportColumn[],
        filePath: string,
        sheetName: string = 'Sheet1'
    ): Promise<void> {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(sheetName);

        // Set columns
        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 15,
        }));

        // Style header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' },
        };
        worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };

        // Add data rows
        data.forEach(row => {
            worksheet.addRow(row);
        });

        // Apply column-specific styles
        columns.forEach((col, index) => {
            const columnIndex = index + 1;
            if (col.style) {
                worksheet.getColumn(columnIndex).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                    if (rowNumber > 1) { // Skip header
                        Object.assign(cell, col.style);
                    }
                });
            }
        });

        // Auto-filter
        worksheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: 1, column: columns.length },
        };

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        // Write to file
        await workbook.xlsx.writeFile(filePath);
    }

    /**
     * Export data to CSV format
     */
    private async exportToCSV(
        data: any[],
        columns: ExportColumn[],
        filePath: string
    ): Promise<void> {
        const csvData = stringify(data, {
            header: true,
            columns: columns.map(col => ({ key: col.key, header: col.header })),
        });

        fs.writeFileSync(filePath, csvData, 'utf-8');
    }

    /**
     * Export data to PDF format
     */
    private async exportToPDF(
        data: any[],
        columns: ExportColumn[],
        filePath: string,
        title: string = 'Report'
    ): Promise<void> {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4',
        });

        // Add title
        doc.setFontSize(16);
        doc.text(title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        // Add date
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

        // Prepare table data
        const tableColumns = columns.map(col => col.header);
        const tableRows = data.map(row => 
            columns.map(col => {
                const value = row[col.key];
                return value != null ? String(value) : '-';
            })
        );

        // Generate table using autoTable
        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 30,
            theme: 'striped',
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            headStyles: {
                fillColor: [71, 85, 105], // slate-600
                textColor: 255,
                fontStyle: 'bold',
                halign: 'left',
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252], // slate-50
            },
            margin: { top: 30, right: 10, bottom: 20, left: 10 },
            didDrawPage: (data) => {
                // Footer with page number
                const pageCount = doc.getNumberOfPages();
                const pageSize = doc.internal.pageSize;
                const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                doc.setFontSize(8);
                doc.text(
                    `Page ${data.pageNumber} of ${pageCount}`,
                    pageSize.width / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            },
        });

        // Save PDF
        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        fs.writeFileSync(filePath, pdfBuffer);
    }

    /**
     * Export customers to PDF in vertical layout with only required fields
     */
    private async exportCustomersToVerticalPDF(customers: any[], filePath: string): Promise<void> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 12;
        const reportDate = new Date().toISOString().split('T')[0];
        const formatCurrency = (value: any) =>
            `PKR ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const drawHeader = () => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(19);
            doc.text('Customer Report', pageWidth / 2, 16, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.text(`Date: ${reportDate}`, pageWidth / 2, 23, { align: 'center' });
            doc.setDrawColor(203, 213, 225);
            doc.line(marginX, 26, pageWidth - marginX, 26);
        };

        drawHeader();
        let currentY = 30;

        if (!customers.length) {
            doc.setFontSize(10);
            doc.text('No customer data available', marginX, currentY);
        } else {
            customers.forEach((customer, index) => {
                const blockX = marginX;
                const blockW = pageWidth - (marginX * 2);
                const blockH = 44;
                const textX = blockX + 5;
                const valueX = textX + 40;
                let textY = currentY + 10;

                const drawField = (label: string, value: string) => {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(51, 65, 85);
                    doc.text(`${label}:`, textX, textY);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(15, 23, 42);
                    doc.text(value || '-', valueX, textY);
                    textY += 8;
                };

                if (currentY + blockH > pageHeight - 12) {
                    doc.addPage();
                    drawHeader();
                    currentY = 30;
                    textY = currentY + 10;
                }

                doc.setFillColor(246, 248, 252);
                doc.roundedRect(blockX, currentY, blockW, blockH, 2, 2, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.roundedRect(blockX, currentY, blockW, blockH, 2, 2, 'S');

                doc.setFontSize(11);
                drawField('Name', customer.name || '-');
                drawField('Opening Balance', formatCurrency(customer.opening_balance));
                drawField('Current Balance', formatCurrency(customer.current_balance));
                drawField('Created At', customer.created_at || '-');

                currentY += blockH + (index < customers.length - 1 ? 6 : 0);
            });
        }

        const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
        fs.writeFileSync(filePath, pdfBuffer);
    }

    /**
     * Export customers
     */
    async exportCustomers(format: 'excel' | 'csv' | 'pdf', status: 'active' | 'inactive' | 'all' = 'all'): Promise<string> {
        const defaultName = `customers_${new Date().toISOString().split('T')[0]}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch customers
        let sql = 'SELECT * FROM customers';
        if (status !== 'all') {
            sql += ` WHERE status = '${status}'`;
        }
        sql += ' ORDER BY name ASC';

        const customers = this.db.prepare(sql).all();

        const columns: ExportColumn[] = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Name (Urdu)', key: 'name_urdu', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'Opening Balance', key: 'opening_balance', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Current Balance', key: 'current_balance', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(customers, columns, filePath, 'Customers');
        } else if (format === 'csv') {
            await this.exportToCSV(customers, columns, filePath);
        } else {
            await this.exportCustomersToVerticalPDF(customers, filePath);
        }

        return filePath;
    }

    /**
     * Export suppliers
     */
    async exportSuppliers(format: 'excel' | 'csv' | 'pdf', status: 'active' | 'inactive' | 'all' = 'all'): Promise<string> {
        const defaultName = `suppliers_${new Date().toISOString().split('T')[0]}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch suppliers
        let sql = 'SELECT * FROM suppliers';
        if (status !== 'all') {
            sql += ` WHERE status = '${status}'`;
        }
        sql += ' ORDER BY name ASC';

        const suppliers = this.db.prepare(sql).all();

        const columns: ExportColumn[] = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Name (Urdu)', key: 'name_urdu', width: 25 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Email', key: 'email', width: 25 },
            { header: 'Address', key: 'address', width: 30 },
            { header: 'City', key: 'city', width: 15 },
            { header: 'Opening Balance', key: 'opening_balance', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Current Balance', key: 'current_balance', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(suppliers, columns, filePath, 'Suppliers');
        } else if (format === 'csv') {
            await this.exportToCSV(suppliers, columns, filePath);
        } else {
            await this.exportToPDF(suppliers, columns, filePath, 'Suppliers Report');
        }

        return filePath;
    }

    /**
     * Export items
     */
    async exportItems(format: 'excel' | 'csv', status: 'active' | 'inactive' | 'all' = 'all'): Promise<string> {
        const defaultName = `items_${new Date().toISOString().split('T')[0]}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch items
        let sql = 'SELECT * FROM items';
        if (status !== 'all') {
            sql += ` WHERE status = '${status}'`;
        }
        sql += ' ORDER BY name ASC';

        const items = this.db.prepare(sql).all();

        const columns: ExportColumn[] = [
            { header: 'ID', key: 'id', width: 15 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Name (Urdu)', key: 'name_urdu', width: 30 },
            { header: 'SKU', key: 'sku', width: 15 },
            { header: 'Description', key: 'description', width: 35 },
            { header: 'Sale Price', key: 'sale_price', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Purchase Price', key: 'purchase_price', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Opening Stock', key: 'opening_stock', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Current Stock', key: 'stock_quantity', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Low Stock Threshold', key: 'low_stock_threshold', width: 20, style: { numFmt: '#,##0.00' } },
            { header: 'Unit', key: 'unit', width: 12 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(items, columns, filePath, 'Items');
        } else {
            await this.exportToCSV(items, columns, filePath);
        }

        return filePath;
    }

    /**
     * Export sales register
     */
    async exportSales(format: 'excel' | 'csv', startDate?: string, endDate?: string): Promise<string> {
        const dateStr = startDate && endDate
            ? `${startDate}_to_${endDate}`
            : new Date().toISOString().split('T')[0];
        const defaultName = `sales_register_${dateStr}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch sales
        let sql = 'SELECT * FROM sales';
        const params: string[] = [];

        if (startDate && endDate) {
            sql += ' WHERE sale_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        sql += ' ORDER BY sale_date DESC, created_at DESC';

        const sales = this.db.prepare(sql).all(...params);

        const columns: ExportColumn[] = [
            { header: 'Invoice Number', key: 'invoice_number', width: 18 },
            { header: 'Sale Date', key: 'sale_date', width: 15 },
            { header: 'Customer ID', key: 'customer_id', width: 15 },
            { header: 'Customer Name', key: 'customer_name', width: 25 },
            { header: 'Subtotal', key: 'subtotal', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Discount %', key: 'discount_percent', width: 12, style: { numFmt: '0.00' } },
            { header: 'Discount Amount', key: 'discount_amount', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Total Amount', key: 'total_amount', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Paid Amount', key: 'paid_amount', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Due Amount', key: 'due_amount', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Payment Status', key: 'payment_status', width: 15 },
            { header: 'Payment Method', key: 'payment_method', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(sales, columns, filePath, 'Sales Register');
        } else {
            await this.exportToCSV(sales, columns, filePath);
        }

        return filePath;
    }

    /**
     * Export purchases register
     */
    async exportPurchases(format: 'excel' | 'csv', startDate?: string, endDate?: string): Promise<string> {
        const dateStr = startDate && endDate
            ? `${startDate}_to_${endDate}`
            : new Date().toISOString().split('T')[0];
        const defaultName = `purchases_register_${dateStr}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch purchases
        let sql = 'SELECT * FROM purchases';
        const params: string[] = [];

        if (startDate && endDate) {
            sql += ' WHERE purchase_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        }

        sql += ' ORDER BY purchase_date DESC, created_at DESC';

        const purchases = this.db.prepare(sql).all(...params);

        const columns: ExportColumn[] = [
            { header: 'Bill Number', key: 'bill_number', width: 18 },
            { header: 'Purchase Date', key: 'purchase_date', width: 15 },
            { header: 'Supplier ID', key: 'supplier_id', width: 15 },
            { header: 'Supplier Name', key: 'supplier_name', width: 25 },
            { header: 'Subtotal', key: 'subtotal', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Discount %', key: 'discount_percent', width: 12, style: { numFmt: '0.00' } },
            { header: 'Discount Amount', key: 'discount_amount', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Total Amount', key: 'total_amount', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Paid Amount', key: 'paid_amount', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Due Amount', key: 'due_amount', width: 15, style: { numFmt: '#,##0.00' } },
            { header: 'Payment Status', key: 'payment_status', width: 15 },
            { header: 'Payment Method', key: 'payment_method', width: 15 },
            { header: 'Notes', key: 'notes', width: 30 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(purchases, columns, filePath, 'Purchases Register');
        } else {
            await this.exportToCSV(purchases, columns, filePath);
        }

        return filePath;
    }

    /**
     * Export ledger report
     */
    async exportLedger(
        format: 'excel' | 'csv',
        accountId?: string,
        startDate?: string,
        endDate?: string
    ): Promise<string> {
        const dateStr = startDate && endDate
            ? `${startDate}_to_${endDate}`
            : new Date().toISOString().split('T')[0];
        const defaultName = accountId
            ? `ledger_${accountId}_${dateStr}`
            : `ledger_all_${dateStr}`;
        const filePath = await this.getSaveFilePath(defaultName, format);

        if (!filePath) {
            throw new Error('Export cancelled by user');
        }

        // Fetch transactions
        let sql = 'SELECT * FROM transactions';
        const params: string[] = [];
        const conditions: string[] = [];

        if (accountId) {
            conditions.push('account_id = ?');
            params.push(accountId);
        }

        if (startDate && endDate) {
            conditions.push('transaction_date BETWEEN ? AND ?');
            params.push(startDate, endDate);
        }

        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }

        sql += ' ORDER BY transaction_date ASC, created_at ASC';

        const transactions = this.db.prepare(sql).all(...params);

        const columns: ExportColumn[] = [
            { header: 'Date', key: 'transaction_date', width: 15 },
            { header: 'Reference Type', key: 'reference_type', width: 18 },
            { header: 'Reference ID', key: 'reference_id', width: 18 },
            { header: 'Description', key: 'description', width: 35 },
            { header: 'Direction', key: 'direction', width: 12 },
            { header: 'Amount', key: 'amount', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Balance After', key: 'balance_after', width: 18, style: { numFmt: '#,##0.00' } },
            { header: 'Account ID', key: 'account_id', width: 15 },
            { header: 'Customer ID', key: 'customer_id', width: 15 },
            { header: 'Supplier ID', key: 'supplier_id', width: 15 },
            { header: 'Created At', key: 'created_at', width: 20 },
        ];

        if (format === 'excel') {
            await this.exportToExcel(transactions, columns, filePath, 'Ledger');
        } else {
            await this.exportToCSV(transactions, columns, filePath);
        }

        return filePath;
    }
}
