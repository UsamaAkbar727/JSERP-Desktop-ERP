// ERP System Types

export type Language = 'en' | 'ur';
export type UserRole = 'admin' | 'staff';
export type AccountType = 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom';
export type PaymentStatus = 'paid' | 'partial' | 'due';
export type PaymentType = 'full' | 'partial';
export type PaymentMethod = 'cash' | 'bank' | 'mobile_wallet' | 'cheque' | 'custom' | 'credit';
export type Status = 'active' | 'inactive';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: Status;
  languagePreference: Language;
}

export interface Unit {
  id: string;
  name: string;
  nameUrdu?: string;
  symbol: string;
  status: Status;
}

export interface Account {
  id: string;
  accountName: string;
  accountType: AccountType;
  accountNumber?: string;
  bankName?: string;
  openingBalance: number;
  currentBalance: number;
  status: Status;
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  nameUrdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  openingBalance: number;
  currentBalance: number; // Positive = they owe us
  status: Status;
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  nameUrdu?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  openingBalance: number;
  currentBalance: number; // Positive = we owe them
  status: Status;
  notes?: string;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  nameUrdu?: string;
  sku?: string;
  description?: string;
  salePrice: number;
  purchasePrice: number;
  openingStock: number;
  stockQuantity: number;
  lowStockThreshold: number;
  unitId: string;
  unit: string;
  status: Status;
  createdAt?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  saleDate: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  chequeAccountId?: string;
  notes?: string;
  items: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit: string;
}

export interface Purchase {
  id: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  purchaseDate: string;
  subtotal: number;
  discountAmount: number;
  discountPercent: number;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  accountId?: string;
  chequeAccountId?: string;
  notes?: string;
  items: PurchaseItem[];
}

export interface Payment {
  id: string;
  paymentType: 'receipt' | 'payment';
  paymentDate: string;
  customerId?: string;
  supplierId?: string;
  saleId?: string;
  purchaseId?: string;
  accountId: string;
  accountName: string;
  paymentMethod: PaymentMethod;
  chequeAccountId?: string;
  chequeNumber?: string;
  amount: number;
  referenceNumber?: string;
  notes?: string;
  isFullPayment?: boolean;
}

export interface Transaction {
  id: string;
  transactionDate: string;
  referenceType: 'sale' | 'purchase' | 'customer_payment' | 'supplier_payment';
  referenceId: string;
  accountId?: string;
  customerId?: string;
  supplierId?: string;
  direction: 'in' | 'out';
  amount: number;
  balanceAfter?: number;
  description: string;
}

// Customer Form Settings
export interface CustomerFormSettings {
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showCity: boolean;
  showStatus: boolean;
  showNotes: boolean;
}

// Supplier Form Settings
export interface SupplierFormSettings {
  showEmail: boolean;
  showPhone: boolean;
  showAddress: boolean;
  showCity: boolean;
  showStatus: boolean;
  showNotes: boolean;
}

// Item Form Settings
export interface ItemFormSettings {
  autoGenerateSku: boolean;
  enableItems: boolean;
}

// Payment Method Settings
export interface PaymentMethodSettings {
  showCheque: boolean;
  showCredit: boolean;
}

// Account Visibility Settings - controls which accounts show in payment selector
export interface AccountVisibilitySettings {
  [accountId: string]: boolean;
}

// Menu Visibility Settings
export interface MenuVisibilitySettings {
  dashboard: boolean;
  pos: boolean;
  customers: boolean;
  suppliers: boolean;
  items: boolean;
  sales: boolean;
  purchases: boolean;
  expenses: boolean;
  accounts: boolean;
  reports: boolean;
  goods: boolean;
}

// Invoice Settings
export interface InvoiceSettings {
  headerBannerUrl: string;
  columnLabels: {
    serialNo: string;
    quantity: string;
    description: string;
    rate: string;
    total: string;
  };
}
