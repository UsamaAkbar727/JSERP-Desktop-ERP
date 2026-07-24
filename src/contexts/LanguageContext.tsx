import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Language } from '@/types/erp';

// English translations
const en = {
  // Navigation
  dashboard: 'Dashboard',
  customers: 'Customers',
  suppliers: 'Suppliers',
  items: 'Items',
  sales: 'Sales',
  purchases: 'Purchases',
  accounts: 'Accounts',
  reports: 'Reports',
  settings: 'Settings',
  logout: 'Logout',
  expenses: 'Expenses',
  pos: 'POS',
  
  // Common Actions
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  save: 'Save',
  update: 'Update',
  updating: 'Updating...',
  cancel: 'Cancel',
  search: 'Search',
  searchItems: 'Search Items',
  filter: 'Filter',
  print: 'Print',
  view: 'View',
  back: 'Back',
  add: 'Add',
  addItems: 'Add Items',
  close: 'Close',
  confirm: 'Confirm',
  actions: 'Actions',
  
  // Customer
  customerName: 'Customer Name',
  customer: 'Customer',
  customerDetails: 'Customer Details',
  customerInfo: 'Customer Information',
  addCustomer: 'Add Customer',
  totalSales: 'Total Sales',
  totalReceived: 'Total Received',
  totalDue: 'Total Due',
  createSale: 'Create Sale',
  editSale: 'Edit Sale',
  updateSale: 'Update Sale',
  receivePayment: 'Receive Payment',
  recentInvoices: 'Recent Invoices',
  recentPayments: 'Recent Payments',
  
  // Supplier
  supplierName: 'Supplier Name',
  supplier: 'Supplier',
  supplierDetails: 'Supplier Details',
  supplierInfo: 'Supplier Information',
  addSupplier: 'Add Supplier',
  totalPurchases: 'Total Purchases',
  totalPaid: 'Total Paid',
  totalPayable: 'Total Payable',
  createPurchase: 'Create Purchase',
  editPurchase: 'Edit Purchase',
  updatePurchase: 'Update Purchase',
  makePayment: 'Make Payment',
  
  // Sale/Purchase
  invoiceNumber: 'Invoice Number',
  billNumber: 'Bill Number',
  saleDetails: 'Sale Details',
  purchaseDetails: 'Purchase Details',
  date: 'Date',
  quantity: 'Quantity',
  unitPrice: 'Unit Price',
  total: 'Total',
  subtotal: 'Subtotal',
  discount: 'Discount',
  grandTotal: 'Grand Total',
  paid: 'Paid',
  due: 'Due',
  partial: 'Partially Paid',
  
  // Payment
  amount: 'Amount',
  payment: 'Payment',
  paying: 'Paying',
  selectAccount: 'Select Account',
  paymentDate: 'Payment Date',
  notes: 'Notes',
  addNotes: 'Add Notes',
  paymentMethod: 'Payment Method',
  advancePayment: 'Advance Payment',
  cheque: 'Cheque',
  fullPayment: 'Full Payment',
  partialPayment: 'Partial Payment',
  
  // Accounts
  accountName: 'Account Name',
  accountType: 'Account Type',
  openingBalance: 'Opening Balance',
  currentBalance: 'Current Balance',
  cash: 'Cash',
  bank: 'Bank',
  mobileWallet: 'Mobile Wallet',
  custom: 'Custom',
  ledger: 'Ledger',
  
  // Items
  itemName: 'Item Name',
  sku: 'SKU',
  salePrice: 'Sale Price',
  purchasePrice: 'Purchase Price',
  stockQty: 'Stock Qty',
  unit: 'Unit',
  openingStock: 'Opening Stock',
  currentStock: 'Current Stock',
  lowStock: 'Low Stock',
  inStock: 'In Stock',
  outOfStock: 'Out of Stock',
  
  // Status
  active: 'Active',
  inactive: 'Inactive',
  status: 'Status',
  
  // Dashboard
  welcome: 'Welcome',
  todaySales: "Today's Sales",
  todayPurchases: "Today's Purchases",
  receivables: 'Receivables',
  payables: 'Payables',
  recentTransactions: 'Recent Transactions',
  quickActions: 'Quick Actions',
  
  // Common fields
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  address: 'Address',
  city: 'City',
  description: 'Description',
  fullName: 'Full Name',
  
  // Messages
  createdSuccessfully: 'Created successfully!',
  updatedSuccessfully: 'Updated successfully!',
  deletedSuccessfully: 'Deleted successfully!',
  paymentRecorded: 'Payment recorded successfully!',
  confirmDelete: 'Are you sure you want to delete this?',
  noDataFound: 'No data found',
  
  // Company
  companyName: 'Company Name',
  invoicePrefix: 'Invoice Prefix',
  language: 'Language',
  
  // Form Settings
  formSettings: 'Form Settings',
  customerFormFields: 'Customer Form Fields',
  enableDisableFields: 'Enable or disable optional fields in the customer form',
  supplierFormFields: 'Supplier Form Fields',
  enableDisableSupplierFields: 'Enable or disable optional fields in the supplier form',
  
  // Additional
  selectCustomer: 'Select Customer',
  selectSupplier: 'Select Supplier',
  payable: 'Payable',
  units: 'Units',
  addUnit: 'Add Unit',
  editUnit: 'Edit Unit',
  symbol: 'Symbol',
  profitLoss: 'Profit & Loss',
  productReport: 'Product Report',
  dateRange: 'Date Range',
  fromDate: 'From Date',
  toDate: 'To Date',
  grossProfit: 'Gross Profit',
  netProfit: 'Net Profit',
  totalExpenses: 'Total Expenses',
  soldQty: 'Sold Qty',
  purchasedQty: 'Purchased Qty',
  revenue: 'Revenue',
  cost: 'Cost',
  profit: 'Profit',
  applyFilter: 'Apply Filter',
  clearFilter: 'Clear Filter',
  refresh: 'Refresh',
  all: 'All',
  autoGenerateSku: 'Auto Generate SKU',
  itemSettings: 'Item Settings',
  enableItemManagement: 'Enable Item Management',
  
  // Goods Page
  goods: 'Goods',
  goodsDescription: 'Operational tracking for deliveries and logistics',
  addRider: 'Add Rider',
  addTask: 'Add Task',
  riderName: 'Rider Name',
  taskName: 'Task Name',
  totalUnits: 'Total Units',
  delivered: 'Delivered',
  pending: 'Pending',
  totalRiders: 'Total Riders',
  activeTasks: 'Active Tasks',
  completedTasks: 'Completed Tasks',
  selectRider: 'Select Rider',
  readOnly: 'Read Only',
  enableGoodsPage: 'Enable Goods Page',
  goodsSettings: 'Goods Settings',
  
  // Menu Visibility
  menuVisibility: 'Menu Visibility',
  menuVisibilityDescription: 'Show or hide menu items from the sidebar navigation',
  
  // Invoice Settings
  invoiceSettings: 'Invoice Settings',
  invoiceSettingsDescription: 'Customize invoice print layout and column labels',
  invoiceHeaderBanner: 'Header Banner',
  uploadBanner: 'Upload Banner',
  invoiceColumnLabels: 'Column Labels (Urdu)',
  
  // Create Sale/Purchase Page
  cartItems: 'Cart Items',
  purchaseItems: 'Purchase Items',
  item: 'Item',
  price: 'Price',
  left: 'left',
};

// Urdu translations
const ur: typeof en = {
  // Navigation
  dashboard: 'ڈیش بورڈ',
  customers: 'گاہک',
  suppliers: 'سپلائرز',
  items: 'اشیاء',
  sales: 'فروخت',
  purchases: 'خریداری',
  accounts: 'اکاؤنٹس',
  reports: 'رپورٹس',
  settings: 'ترتیبات',
  logout: 'لاگ آؤٹ',
  expenses: 'اخراجات',
  pos: 'پی او ایس',
  
  // Common Actions
  create: 'بنائیں',
  edit: 'ترمیم',
  delete: 'حذف کریں',
  save: 'محفوظ کریں',
  update: 'اپڈیٹ',
  updating: 'اپڈیٹ ہو رہا ہے...',
  cancel: 'منسوخ کریں',
  search: 'تلاش کریں',
  searchItems: 'اشیاء تلاش کریں',
  filter: 'فلٹر',
  print: 'پرنٹ',
  view: 'دیکھیں',
  back: 'واپس',
  add: 'شامل کریں',
  addItems: 'اشیاء شامل کریں',
  close: 'بند کریں',
  confirm: 'تصدیق کریں',
  actions: 'عمل',
  
  // Customer
  customerName: 'گاہک کا نام',
  customer: 'گاہک',
  customerDetails: 'گاہک کی تفصیلات',
  customerInfo: 'گاہک کی معلومات',
  addCustomer: 'گاہک شامل کریں',
  totalSales: 'کل فروخت',
  totalReceived: 'کل وصول شدہ',
  totalDue: 'کل واجب الادا',
  createSale: 'فروخت بنائیں',
  editSale: 'فروخت میں ترمیم',
  updateSale: 'فروخت اپڈیٹ کریں',
  receivePayment: 'رقم وصول کریں',
  recentInvoices: 'حالیہ انوائسز',
  recentPayments: 'حالیہ ادائیگیاں',
  
  // Supplier
  supplierName: 'سپلائر کا نام',
  supplier: 'سپلائر',
  supplierDetails: 'سپلائر کی تفصیلات',
  supplierInfo: 'سپلائر کی معلومات',
  addSupplier: 'سپلائر شامل کریں',
  totalPurchases: 'کل خریداری',
  totalPaid: 'کل ادا شدہ',
  totalPayable: 'کل واجب الادا',
  createPurchase: 'خریداری بنائیں',
  editPurchase: 'خریداری میں ترمیم',
  updatePurchase: 'خریداری اپڈیٹ کریں',
  makePayment: 'ادائیگی کریں',
  
  // Sale/Purchase
  invoiceNumber: 'انوائس نمبر',
  billNumber: 'بل نمبر',
  saleDetails: 'فروخت کی تفصیلات',
  purchaseDetails: 'خریداری کی تفصیلات',
  date: 'تاریخ',
  quantity: 'مقدار',
  unitPrice: 'یونٹ قیمت',
  total: 'کل',
  subtotal: 'ذیلی کل',
  discount: 'رعایت',
  grandTotal: 'مجموعی کل',
  paid: 'ادا شدہ',
  due: 'واجب الادا',
  partial: 'جزوی ادائیگی',
  
  // Payment
  amount: 'رقم',
  payment: 'ادائیگی',
  paying: 'ادا کر رہے ہیں',
  selectAccount: 'اکاؤنٹ منتخب کریں',
  paymentDate: 'ادائیگی کی تاریخ',
  notes: 'نوٹس',
  addNotes: 'نوٹس شامل کریں',
  paymentMethod: 'ادائیگی کا طریقہ',
  advancePayment: 'پیشگی ادائیگی',
  cheque: 'چیک',
  fullPayment: 'مکمل ادائیگی',
  partialPayment: 'جزوی ادائیگی',
  
  // Accounts
  accountName: 'اکاؤنٹ کا نام',
  accountType: 'اکاؤنٹ کی قسم',
  openingBalance: 'ابتدائی بیلنس',
  currentBalance: 'موجودہ بیلنس',
  cash: 'نقد',
  bank: 'بینک',
  mobileWallet: 'موبائل والیٹ',
  custom: 'دیگر',
  ledger: 'لیجر',
  
  // Items
  itemName: 'آئٹم کا نام',
  sku: 'ایس کے یو',
  salePrice: 'فروخت قیمت',
  purchasePrice: 'خریداری قیمت',
  stockQty: 'اسٹاک مقدار',
  unit: 'یونٹ',
  openingStock: 'ابتدائی اسٹاک',
  currentStock: 'موجودہ اسٹاک',
  lowStock: 'کم اسٹاک',
  inStock: 'دستیاب',
  outOfStock: 'دستیاب نہیں',
  
  // Status
  active: 'فعال',
  inactive: 'غیر فعال',
  status: 'حیثیت',
  
  // Dashboard
  welcome: 'خوش آمدید',
  todaySales: 'آج کی فروخت',
  todayPurchases: 'آج کی خریداری',
  receivables: 'وصولیات',
  payables: 'واجبات',
  recentTransactions: 'حالیہ لین دین',
  quickActions: 'فوری عمل',
  
  // Common fields
  name: 'نام',
  email: 'ای میل',
  phone: 'فون',
  address: 'پتہ',
  city: 'شہر',
  description: 'تفصیل',
  fullName: 'پورا نام',
  
  // Messages
  createdSuccessfully: 'کامیابی سے بنایا گیا!',
  updatedSuccessfully: 'کامیابی سے اپڈیٹ ہوا!',
  deletedSuccessfully: 'کامیابی سے حذف ہوا!',
  paymentRecorded: 'ادائیگی کامیابی سے درج ہوگئی!',
  confirmDelete: 'کیا آپ واقعی حذف کرنا چاہتے ہیں؟',
  noDataFound: 'کوئی ڈیٹا نہیں ملا',
  
  // Company
  companyName: 'کمپنی کا نام',
  invoicePrefix: 'انوائس پریفکس',
  language: 'زبان',
  
  // Form Settings
  formSettings: 'فارم کی ترتیبات',
  customerFormFields: 'گاہک فارم فیلڈز',
  enableDisableFields: 'گاہک فارم میں اختیاری فیلڈز کو فعال یا غیر فعال کریں',
  supplierFormFields: 'سپلائر فارم فیلڈز',
  enableDisableSupplierFields: 'سپلائر فارم میں اختیاری فیلڈز کو فعال یا غیر فعال کریں',
  
  // Additional
  selectCustomer: 'گاہک منتخب کریں',
  selectSupplier: 'سپلائر منتخب کریں',
  payable: 'واجب الادا',
  units: 'یونٹس',
  addUnit: 'یونٹ شامل کریں',
  editUnit: 'یونٹ میں ترمیم کریں',
  symbol: 'علامت',
  profitLoss: 'نفع و نقصان',
  productReport: 'مصنوعات کی رپورٹ',
  dateRange: 'تاریخ کی حد',
  fromDate: 'شروع تاریخ',
  toDate: 'آخری تاریخ',
  grossProfit: 'مجموعی منافع',
  netProfit: 'خالص منافع',
  totalExpenses: 'کل اخراجات',
  soldQty: 'فروخت شدہ مقدار',
  purchasedQty: 'خریدی گئی مقدار',
  revenue: 'آمدنی',
  cost: 'لاگت',
  profit: 'منافع',
  applyFilter: 'فلٹر لگائیں',
  clearFilter: 'فلٹر صاف کریں',
  refresh: 'تازہ کریں',
  all: 'سب',
  autoGenerateSku: 'خودکار ایس کے یو',
  itemSettings: 'آئٹم کی ترتیبات',
  enableItemManagement: 'آئٹم مینجمنٹ فعال کریں',
  
  // Goods Page
  goods: 'سامان',
  goodsDescription: 'ڈیلیوری اور لاجسٹکس کے لیے آپریشنل ٹریکنگ',
  addRider: 'رائیڈر شامل کریں',
  addTask: 'ٹاسک شامل کریں',
  riderName: 'رائیڈر کا نام',
  taskName: 'ٹاسک کا نام',
  totalUnits: 'کل یونٹس',
  delivered: 'ڈیلیور شدہ',
  pending: 'زیر التواء',
  totalRiders: 'کل رائیڈرز',
  activeTasks: 'فعال ٹاسک',
  completedTasks: 'مکمل ٹاسک',
  selectRider: 'رائیڈر منتخب کریں',
  readOnly: 'صرف پڑھنے کے لیے',
  enableGoodsPage: 'سامان پیج فعال کریں',
  goodsSettings: 'سامان کی ترتیبات',
  
  // Menu Visibility
  menuVisibility: 'مینو ویزیبلٹی',
  menuVisibilityDescription: 'سائیڈبار نیویگیشن سے مینو آئٹمز دکھائیں یا چھپائیں',
  
  // Invoice Settings
  invoiceSettings: 'انوائس کی ترتیبات',
  invoiceSettingsDescription: 'انوائس پرنٹ لے آؤٹ اور کالم کے لیبلز کو اپنی مرضی کے مطابق بنائیں',
  invoiceHeaderBanner: 'ہیڈر بینر',
  uploadBanner: 'بینر اپ لوڈ کریں',
  invoiceColumnLabels: 'کالم کے لیبلز (اردو)',
  
  // Create Sale/Purchase Page
  cartItems: 'کارٹ آئٹمز',
  purchaseItems: 'خریداری آئٹمز',
  item: 'آئٹم',
  price: 'قیمت',
  left: 'باقی',
};


const translations = { en, ur };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof en) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Load saved language from localStorage on mount
    const savedLanguage = localStorage.getItem('app_language');
    return (savedLanguage === 'ur' || savedLanguage === 'en') ? savedLanguage : 'en';
  });
  
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    // Save to localStorage
    localStorage.setItem('app_language', lang);
    // Set document direction and lang attribute
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, []);

  // Initialize document direction on mount
  useEffect(() => {
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: keyof typeof en): string => {
    return translations[language][key] || key;
  }, [language]);

  const isRTL = language === 'ur';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
