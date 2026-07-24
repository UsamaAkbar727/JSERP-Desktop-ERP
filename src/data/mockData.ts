import { Account, Customer, Supplier, Item, Sale, Purchase, Payment, Transaction, CustomerFormSettings, SupplierFormSettings, Unit, MenuVisibilitySettings, InvoiceSettings, PaymentMethodSettings } from '@/types/erp';

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  accountId: string;
  accountName: string;
  notes?: string;
  createdAt: string;
}

// Units
export const mockUnits: Unit[] = [
  { id: '1', name: 'Piece', nameUrdu: 'عدد', symbol: 'pcs', status: 'active' },
  { id: '2', name: 'Kilogram', nameUrdu: 'کلوگرام', symbol: 'kg', status: 'active' },
  { id: '3', name: 'Gram', nameUrdu: 'گرام', symbol: 'g', status: 'active' },
  { id: '4', name: 'Meter', nameUrdu: 'میٹر', symbol: 'm', status: 'active' },
  { id: '5', name: 'Liter', nameUrdu: 'لیٹر', symbol: 'L', status: 'active' },
  { id: '6', name: 'Box', nameUrdu: 'ڈبہ', symbol: 'box', status: 'active' },
  { id: '7', name: 'Dozen', nameUrdu: 'درجن', symbol: 'dz', status: 'active' },
  { id: '8', name: 'Carton', nameUrdu: 'کارٹن', symbol: 'ctn', status: 'active' },
];

export const mockAccounts: Account[] = [
  {
    id: '1',
    accountName: 'Cash',
    accountType: 'cash',
    openingBalance: 50000,
    currentBalance: 125000,
    status: 'active',
  },
  {
    id: '2',
    accountName: 'HBL Bank',
    accountType: 'bank',
    accountNumber: '1234567890',
    bankName: 'Habib Bank Limited',
    openingBalance: 200000,
    currentBalance: 350000,
    status: 'active',
  },
  {
    id: '3',
    accountName: 'JazzCash',
    accountType: 'mobile_wallet',
    accountNumber: '03001234567',
    openingBalance: 10000,
    currentBalance: 25000,
    status: 'active',
  },
  {
    id: '4',
    accountName: 'EasyPaisa',
    accountType: 'mobile_wallet',
    accountNumber: '03451234567',
    openingBalance: 5000,
    currentBalance: 15000,
    status: 'active',
  },
];

// Walk-in customer is always first
export const mockCustomers: Customer[] = [
  {
    id: 'walk-in',
    name: 'Walk-in Customer',
    nameUrdu: 'واک ان گاہک',
    openingBalance: 0,
    currentBalance: 0,
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: '1',
    name: 'Ahmed Electronics',
    nameUrdu: 'احمد الیکٹرانکس',
    email: 'ahmed@electronics.pk',
    phone: '0321-1234567',
    address: '123 Main Market',
    city: 'Lahore',
    openingBalance: 0,
    currentBalance: 45000,
    status: 'active',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Khan Trading Co.',
    nameUrdu: 'خان ٹریڈنگ کمپنی',
    email: 'khan@trading.pk',
    phone: '0333-9876543',
    address: '456 Commercial Area',
    city: 'Karachi',
    openingBalance: 10000,
    currentBalance: 78500,
    status: 'active',
    createdAt: '2024-02-20',
  },
  {
    id: '3',
    name: 'Malik Enterprises',
    nameUrdu: 'ملک انٹرپرائزز',
    phone: '0300-5551234',
    city: 'Islamabad',
    openingBalance: 0,
    currentBalance: 0,
    status: 'active',
    createdAt: '2024-03-10',
  },
];

export const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Global Imports Ltd',
    nameUrdu: 'گلوبل امپورٹس',
    email: 'info@globalimports.pk',
    phone: '042-35123456',
    address: '789 Industrial Area',
    city: 'Lahore',
    openingBalance: 0,
    currentBalance: 125000,
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    name: 'Prime Distributors',
    nameUrdu: 'پرائم ڈسٹری بیوٹرز',
    phone: '021-34567890',
    city: 'Karachi',
    openingBalance: 50000,
    currentBalance: 95000,
    status: 'active',
    createdAt: '2024-01-15',
  },
];

export const mockItems: Item[] = [
  {
    id: '1',
    name: 'LED TV 42"',
    nameUrdu: 'ایل ای ڈی ٹی وی 42"',
    sku: 'TV-LED-42',
    salePrice: 45000,
    purchasePrice: 38000,
    openingStock: 10,
    stockQuantity: 15,
    lowStockThreshold: 5,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
  {
    id: '2',
    name: 'Washing Machine',
    nameUrdu: 'واشنگ مشین',
    sku: 'WM-AUTO-01',
    salePrice: 35000,
    purchasePrice: 28000,
    openingStock: 5,
    stockQuantity: 8,
    lowStockThreshold: 3,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
  {
    id: '3',
    name: 'Refrigerator 12cft',
    nameUrdu: 'ریفریجریٹر 12 کیوبک فٹ',
    sku: 'REF-12CFT',
    salePrice: 65000,
    purchasePrice: 52000,
    openingStock: 8,
    stockQuantity: 10,
    lowStockThreshold: 4,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
  {
    id: '4',
    name: 'Air Conditioner 1.5 Ton',
    nameUrdu: 'ایئر کنڈیشنر 1.5 ٹن',
    sku: 'AC-1.5T',
    salePrice: 85000,
    purchasePrice: 70000,
    openingStock: 4,
    stockQuantity: 6,
    lowStockThreshold: 2,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
  {
    id: '5',
    name: 'Microwave Oven',
    nameUrdu: 'مائیکروویو اوون',
    sku: 'MW-001',
    salePrice: 15000,
    purchasePrice: 11000,
    openingStock: 15,
    stockQuantity: 20,
    lowStockThreshold: 5,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
  {
    id: '6',
    name: 'Electric Iron',
    nameUrdu: 'الیکٹرک استری',
    sku: 'IR-001',
    salePrice: 3500,
    purchasePrice: 2500,
    openingStock: 25,
    stockQuantity: 30,
    lowStockThreshold: 10,
    unitId: '1',
    unit: 'pcs',
    status: 'active',
  },
];

export const mockSales: Sale[] = [
  {
    id: '1',
    invoiceNumber: 'INV-000001',
    customerId: '1',
    customerName: 'Ahmed Electronics',
    saleDate: '2024-01-20',
    subtotal: 80000,
    discountAmount: 5000,
    discountPercent: 0,
    totalAmount: 75000,
    paidAmount: 30000,
    dueAmount: 45000,
    paymentStatus: 'partial',
    paymentMethod: 'cash',
    accountId: '1',
    items: [
      { id: '1', saleId: '1', itemId: '1', itemName: 'LED TV 42"', quantity: 1, unitPrice: 45000, totalPrice: 45000, unit: 'pcs' },
      { id: '2', saleId: '1', itemId: '2', itemName: 'Washing Machine', quantity: 1, unitPrice: 35000, totalPrice: 35000, unit: 'pcs' },
    ],
  },
  {
    id: '2',
    invoiceNumber: 'INV-000002',
    customerId: '2',
    customerName: 'Khan Trading Co.',
    saleDate: '2024-01-22',
    subtotal: 130000,
    discountAmount: 0,
    discountPercent: 0,
    totalAmount: 130000,
    paidAmount: 130000,
    dueAmount: 0,
    paymentStatus: 'paid',
    paymentMethod: 'bank',
    accountId: '2',
    items: [
      { id: '3', saleId: '2', itemId: '3', itemName: 'Refrigerator 12cft', quantity: 2, unitPrice: 65000, totalPrice: 130000, unit: 'pcs' },
    ],
  },
  {
    id: '3',
    invoiceNumber: 'INV-000003',
    customerId: '3',
    customerName: 'Malik Enterprises',
    saleDate: '2024-01-25',
    subtotal: 100000,
    discountAmount: 5000,
    discountPercent: 5,
    totalAmount: 95000,
    paidAmount: 0,
    dueAmount: 95000,
    paymentStatus: 'due',
    items: [
      { id: '4', saleId: '3', itemId: '4', itemName: 'Air Conditioner 1.5 Ton', quantity: 1, unitPrice: 85000, totalPrice: 85000, unit: 'pcs' },
      { id: '5', saleId: '3', itemId: '5', itemName: 'Microwave Oven', quantity: 1, unitPrice: 15000, totalPrice: 15000, unit: 'pcs' },
    ],
  },
];

export const mockPurchases: Purchase[] = [
  {
    id: '1',
    billNumber: 'BILL-000001',
    supplierId: '1',
    supplierName: 'Global Imports Ltd',
    purchaseDate: '2024-01-10',
    subtotal: 190000,
    discountAmount: 0,
    discountPercent: 0,
    totalAmount: 190000,
    paidAmount: 65000,
    dueAmount: 125000,
    paymentStatus: 'partial',
    paymentMethod: 'cash',
    accountId: '1',
    items: [
      { id: '1', purchaseId: '1', itemId: '1', itemName: 'LED TV 42"', quantity: 5, unitPrice: 38000, totalPrice: 190000, unit: 'pcs' },
    ],
  },
  {
    id: '2',
    billNumber: 'BILL-000002',
    supplierId: '2',
    supplierName: 'Prime Distributors',
    purchaseDate: '2024-01-15',
    subtotal: 280000,
    discountAmount: 10000,
    discountPercent: 0,
    totalAmount: 270000,
    paidAmount: 175000,
    dueAmount: 95000,
    paymentStatus: 'partial',
    paymentMethod: 'bank',
    accountId: '2',
    items: [
      { id: '2', purchaseId: '2', itemId: '2', itemName: 'Washing Machine', quantity: 10, unitPrice: 28000, totalPrice: 280000, unit: 'pcs' },
    ],
  },
];

export const mockPayments: Payment[] = [
  {
    id: '1',
    paymentType: 'receipt',
    paymentDate: '2024-01-20',
    customerId: '1',
    saleId: '1',
    accountId: '1',
    accountName: 'Cash',
    paymentMethod: 'cash',
    amount: 30000,
    notes: 'Partial payment for INV-000001',
    isFullPayment: false,
  },
  {
    id: '2',
    paymentType: 'receipt',
    paymentDate: '2024-01-22',
    customerId: '2',
    saleId: '2',
    accountId: '2',
    accountName: 'HBL Bank',
    paymentMethod: 'bank',
    amount: 130000,
    notes: 'Full payment for INV-000002',
    isFullPayment: true,
  },
  {
    id: '3',
    paymentType: 'payment',
    paymentDate: '2024-01-15',
    supplierId: '1',
    purchaseId: '1',
    accountId: '1',
    accountName: 'Cash',
    paymentMethod: 'cash',
    amount: 65000,
    notes: 'Partial payment for BILL-000001',
    isFullPayment: false,
  },
];

export const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2024-01-15',
    category: 'Utilities',
    description: 'Electricity Bill - January',
    amount: 15000,
    accountId: '1',
    accountName: 'Cash',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    date: '2024-01-18',
    category: 'Rent',
    description: 'Shop Rent - January',
    amount: 50000,
    accountId: '2',
    accountName: 'HBL Bank',
    createdAt: '2024-01-18',
  },
  {
    id: '3',
    date: '2024-01-20',
    category: 'Salaries',
    description: 'Staff Salaries',
    amount: 80000,
    accountId: '1',
    accountName: 'Cash',
    createdAt: '2024-01-20',
  },
  {
    id: '4',
    date: '2024-01-22',
    category: 'Transport',
    description: 'Delivery Vehicle Fuel',
    amount: 5000,
    accountId: '1',
    accountName: 'Cash',
    createdAt: '2024-01-22',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionDate: '2024-01-15',
    referenceType: 'customer_payment',
    referenceId: '1',
    accountId: '1',
    customerId: '1',
    direction: 'in',
    amount: 30000,
    balanceAfter: 80000,
    description: 'Payment from Ahmed Electronics',
  },
  {
    id: '2',
    transactionDate: '2024-01-18',
    referenceType: 'supplier_payment',
    referenceId: '3',
    accountId: '1',
    supplierId: '1',
    direction: 'out',
    amount: 65000,
    balanceAfter: 15000,
    description: 'Payment to Global Imports Ltd',
  },
  {
    id: '3',
    transactionDate: '2024-01-20',
    referenceType: 'customer_payment',
    referenceId: '2',
    accountId: '2',
    customerId: '2',
    direction: 'in',
    amount: 130000,
    balanceAfter: 330000,
    description: 'Payment from Khan Trading Co.',
  },
];

export const expenseCategories = [
  'Utilities',
  'Rent',
  'Salaries',
  'Transport',
  'Office Supplies',
  'Maintenance',
  'Marketing',
  'Insurance',
  'Taxes',
  'Other',
];

// Customer form settings - controls which fields are visible
export const defaultCustomerFormSettings: CustomerFormSettings = {
  showEmail: false,
  showPhone: false,
  showAddress: false,
  showCity: false,
  showStatus: false,
  showNotes: false,
};

// Supplier form settings - controls which fields are visible
export const defaultSupplierFormSettings: SupplierFormSettings = {
  showEmail: false,
  showPhone: false,
  showAddress: false,
  showCity: false,
  showStatus: false,
  showNotes: false,
};

// Item form settings
export interface ItemFormSettings {
  autoGenerateSku: boolean;
  enableItems: boolean;
}

export const defaultItemFormSettings: ItemFormSettings = {
  autoGenerateSku: true,
  enableItems: true,
};

// Payment method settings - controls which payment methods are visible
export const defaultPaymentMethodSettings: PaymentMethodSettings = {
  showCheque: true,
  showCredit: true,
};

// Goods page settings
export interface GoodsSettings {
  enableGoodsPage: boolean;
}

export const defaultGoodsSettings: GoodsSettings = {
  enableGoodsPage: true,
};

// Menu visibility settings - controls which menu items are visible
export const defaultMenuVisibilitySettings: MenuVisibilitySettings = {
  dashboard: true,
  pos: true,
  customers: true,
  suppliers: true,
  items: true,
  sales: true,
  purchases: true,
  expenses: true,
  accounts: true,
  reports: true,
  goods: true,
};

// Invoice settings - controls invoice print layout
export const defaultInvoiceSettings: InvoiceSettings = {
  headerBannerUrl: '',
  columnLabels: {
    serialNo: 'تعداد',
    quantity: 'تفصیل',
    description: 'نرخ',
    rate: 'رقم',
    total: 'میزان',
  },
};

// Generate unique customer ID
export const generateCustomerId = (): string => {
  return `CUST-${Date.now().toString(36).toUpperCase()}`;
};

// Generate unique supplier ID
export const generateSupplierId = (): string => {
  return `SUPP-${Date.now().toString(36).toUpperCase()}`;
};

// Generate unique SKU
export const generateSku = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomChars = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SKU-${randomChars}-${randomNum}`;
};

// Generate unique invoice number
export const generateInvoiceNumber = (): string => {
  const num = mockSales.length + 1;
  return `INV-${num.toString().padStart(6, '0')}`;
};

// Generate unique bill number
export const generateBillNumber = (): string => {
  const num = mockPurchases.length + 1;
  return `BILL-${num.toString().padStart(6, '0')}`;
};
