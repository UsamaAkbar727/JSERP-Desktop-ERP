import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Globe, Users, Plus, Shield, Edit, Trash2, FileText, Ruler, Package, Truck, Menu, Printer, Upload, CreditCard, Wallet, Banknote, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CustomerFormSettings, SupplierFormSettings, MenuVisibilitySettings, InvoiceSettings, PaymentMethodSettings, AccountVisibilitySettings } from '@/types/erp';
import { defaultCustomerFormSettings, defaultSupplierFormSettings, defaultItemFormSettings, ItemFormSettings, defaultGoodsSettings, GoodsSettings, defaultMenuVisibilitySettings, defaultInvoiceSettings, defaultPaymentMethodSettings } from '@/data/mockData';
import { useUnits, useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/useUnits';
import { useActiveExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory, useDeleteExpenseCategory } from '@/hooks/useExpenseCategories';
import { useCompanySettings, useSaveCompanySettings } from '@/hooks/useCompanySettings';
import { useCustomerFormSettings, useSaveCustomerFormSettings } from '@/hooks/useCustomerFormSettings';
import { useSupplierFormSettings, useSaveSupplierFormSettings } from '@/hooks/useSupplierFormSettings';
import { useItemFormSettings, useSaveItemFormSettings } from '@/hooks/useItemFormSettings';
import { useGoodsSettings, useSaveGoodsSettings } from '@/hooks/useGoodsSettings';
import { useInvoiceSettings, useSaveInvoiceSettings } from '@/hooks/useInvoiceSettings';
import { usePaymentMethodSettings, useSavePaymentMethodSettings } from '@/hooks/usePaymentMethodSettings';
import { useAccountVisibilitySettings, useSaveAccountVisibilitySettings } from '@/hooks/useAccountVisibilitySettings';
import { useAccounts } from '@/hooks/useAccounts';
import LicenseInfoSettings from '@/components/settings/LicenseInfoSettings';
import BackupSettings from '@/components/settings/BackupSettings';
import InvoiceNumberFormatSettings from '@/components/settings/InvoiceNumberFormatSettings';

// Menu items for visibility settings
const menuItems = [
  { key: 'dashboard', label: 'Dashboard', labelUrdu: 'ڈیش بورڈ' },
  { key: 'pos', label: 'POS', labelUrdu: 'پی او ایس' },
  { key: 'customers', label: 'Customers', labelUrdu: 'گاہک' },
  { key: 'suppliers', label: 'Suppliers', labelUrdu: 'سپلائرز' },
  { key: 'items', label: 'Items', labelUrdu: 'اشیاء' },
  { key: 'sales', label: 'Sales', labelUrdu: 'فروخت' },
  { key: 'purchases', label: 'Purchases', labelUrdu: 'خریداری' },
  { key: 'expenses', label: 'Expenses', labelUrdu: 'اخراجات' },
  { key: 'goods', label: 'Goods', labelUrdu: 'مال' },
  { key: 'accounts', label: 'Accounts', labelUrdu: 'اکاؤنٹس' },
  { key: 'reports', label: 'Reports', labelUrdu: 'رپورٹس' },
] as const;

export default function SettingsPage() {
  const { t, language, setLanguage, isRTL } = useLanguage();

  // Company settings hooks
  const { data: dbCompanySettings, isLoading: companySettingsLoading } = useCompanySettings();
  const saveCompanySettingsMutation = useSaveCompanySettings();

  // Local state for company settings
  const [companyName, setCompanyName] = useState('');
  const [invoicePrefix, setInvoicePrefix] = useState('');

  // Load company settings from database on mount and when data changes
  useEffect(() => {
    if (dbCompanySettings) {
      setCompanyName(dbCompanySettings.companyName);
      setInvoicePrefix(dbCompanySettings.invoicePrefix);
    }
  }, [dbCompanySettings]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'staff',
    password: '',
    confirmPassword: '',
  });
  const [editUserData, setEditUserData] = useState({
    id: 0,
    name: '',
    email: '',
    role: 'staff',
    password: '',
    confirmPassword: '',
  });
  const [newUnitData, setNewUnitData] = useState({
    id: '',
    name: '',
    nameUrdu: '',
    symbol: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [expenseCategoryDialogOpen, setExpenseCategoryDialogOpen] = useState(false);
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<any>(null);
  const [newExpenseCategoryData, setNewExpenseCategoryData] = useState({
    id: '',
    name: '',
    status: 'active' as 'active' | 'inactive',
  });

  // Fetch units from database
  const { data: units = [], isLoading: unitsLoading, error: unitsError } = useUnits();
  const createUnitMutation = useCreateUnit();
  const updateUnitMutation = useUpdateUnit();
  const deleteUnitMutation = useDeleteUnit();

  // Fetch active expense categories from database (deleted/inactive categories won't show)
  const { data: expenseCategories = [], isLoading: expenseCategoriesLoading } = useActiveExpenseCategories();
  const createExpenseCategoryMutation = useCreateExpenseCategory();
  const updateExpenseCategoryMutation = useUpdateExpenseCategory();
  const deleteExpenseCategoryMutation = useDeleteExpenseCategory();

  // Customer form settings hooks
  const { data: dbCustomerFormSettings, isLoading: customerFormSettingsLoading } = useCustomerFormSettings();
  const saveCustomerFormSettingsMutation = useSaveCustomerFormSettings();

  // Supplier form settings hooks
  const { data: dbSupplierFormSettings, isLoading: supplierFormSettingsLoading } = useSupplierFormSettings();
  const saveSupplierFormSettingsMutation = useSaveSupplierFormSettings();

  // Payment method settings hooks
  const { data: dbPaymentMethodSettings, isLoading: paymentMethodSettingsLoading } = usePaymentMethodSettings();
  const savePaymentMethodSettingsMutation = useSavePaymentMethodSettings();

  // Account visibility settings hooks
  const { data: dbAccountVisibilitySettings, isLoading: accountVisibilitySettingsLoading } = useAccountVisibilitySettings();
  const saveAccountVisibilitySettingsMutation = useSaveAccountVisibilitySettings();

  // Accounts hooks
  const { data: accounts = [] } = useAccounts();

  // Item form settings hooks
  const { data: dbItemFormSettings, isLoading: itemFormSettingsLoading } = useItemFormSettings();
  const saveItemFormSettingsMutation = useSaveItemFormSettings();

  // Goods settings hooks
  const { data: dbGoodsSettings, isLoading: goodsSettingsLoading } = useGoodsSettings();
  const saveGoodsSettingsMutation = useSaveGoodsSettings();

  // Invoice settings hooks
  const { data: dbInvoiceSettings, isLoading: invoiceSettingsLoading } = useInvoiceSettings();
  const saveInvoiceSettingsMutation = useSaveInvoiceSettings();

  // Debug log for units

  // Debug log for form data

  // Customer form settings
  const [customerFormSettings, setCustomerFormSettings] = useState<CustomerFormSettings>(defaultCustomerFormSettings);

  // Load customer form settings from database on mount and when data changes
  useEffect(() => {
    if (dbCustomerFormSettings) {
      setCustomerFormSettings(dbCustomerFormSettings);
    }
  }, [dbCustomerFormSettings]);

  // Supplier form settings
  const [supplierFormSettings, setSupplierFormSettings] = useState<SupplierFormSettings>(defaultSupplierFormSettings);

  // Load supplier form settings from database on mount and when data changes
  useEffect(() => {
    if (dbSupplierFormSettings) {
      setSupplierFormSettings(dbSupplierFormSettings);
    }
  }, [dbSupplierFormSettings]);

  // Payment method settings
  const [paymentMethodSettings, setPaymentMethodSettings] = useState<PaymentMethodSettings>(defaultPaymentMethodSettings);

  // Load payment method settings from database on mount and when data changes
  useEffect(() => {
    if (dbPaymentMethodSettings) {
      setPaymentMethodSettings(dbPaymentMethodSettings);
    }
  }, [dbPaymentMethodSettings]);

  // Account visibility settings
  const [accountVisibilitySettings, setAccountVisibilitySettings] = useState<AccountVisibilitySettings>({});

  // Load account visibility settings from database on mount and when data changes
  useEffect(() => {
    if (dbAccountVisibilitySettings) {
      setAccountVisibilitySettings(dbAccountVisibilitySettings);
    }
  }, [dbAccountVisibilitySettings]);

  // Goods page settings
  const [goodsSettings, setGoodsSettings] = useState<GoodsSettings>(defaultGoodsSettings);

  // Item form settings
  const [itemFormSettings, setItemFormSettings] = useState<ItemFormSettings>(defaultItemFormSettings);

  // Load goods settings from database on mount and when data changes
  useEffect(() => {
    if (dbGoodsSettings) {
      setGoodsSettings(dbGoodsSettings);
    }
  }, [dbGoodsSettings]);

  // Load item form settings from database on mount and when data changes
  useEffect(() => {
    if (dbItemFormSettings) {
      setItemFormSettings(dbItemFormSettings);
    }
  }, [dbItemFormSettings]);

  // Menu visibility settings
  const [menuVisibility, setMenuVisibility] = useState<MenuVisibilitySettings>(() => {
    const saved = localStorage.getItem('menuVisibilitySettings');
    return saved ? JSON.parse(saved) : defaultMenuVisibilitySettings;
  });

  // Invoice settings
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>(defaultInvoiceSettings);

  // Load invoice settings from database on mount and when data changes
  useEffect(() => {
    if (dbInvoiceSettings) {
      // Ensure all fields have values to prevent controlled/uncontrolled warnings
      setInvoiceSettings({
        headerBannerUrl: dbInvoiceSettings.headerBannerUrl ?? '',
        columnLabels: {
          serialNo: dbInvoiceSettings.columnLabels?.serialNo ?? defaultInvoiceSettings.columnLabels.serialNo,
          quantity: dbInvoiceSettings.columnLabels?.quantity ?? defaultInvoiceSettings.columnLabels.quantity,
          description: dbInvoiceSettings.columnLabels?.description ?? defaultInvoiceSettings.columnLabels.description,
          rate: dbInvoiceSettings.columnLabels?.rate ?? defaultInvoiceSettings.columnLabels.rate,
          total: dbInvoiceSettings.columnLabels?.total ?? defaultInvoiceSettings.columnLabels.total,
        },
      });
    }
  }, [dbInvoiceSettings]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Team members from database
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [teamMembersError, setTeamMembersError] = useState<string | null>(null);

  // Load team members from database on mount and after adding new user
  const loadTeamMembers = async () => {
    try {
      setTeamMembersLoading(true);
      setTeamMembersError(null);

      const response = await window.api.auth.getUsers();

      if (!response.success) {
        setTeamMembersError(response.error || 'Failed to load users');
        return;
      }

      const userData = response.data?.users;

      if (!userData || !Array.isArray(userData)) {
        setTeamMembers([]);
        return;
      }

      const mappedMembers = userData.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role === 'super_admin' ? 'admin' : user.role,
        status: user.active ? 'active' : 'inactive',
      }));

      setTeamMembers(mappedMembers);
    } catch (error: any) {
      console.error('❌ [SettingsPage] Error loading team members:', error);
      setTeamMembersError(error?.message || 'Failed to load team members');
    } finally {
      setTeamMembersLoading(false);
    }
  };

  // Load team members on mount
  useEffect(() => {
    loadTeamMembers();
  }, []);

  // Handle scroll to section if hash is present in URL
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, []);

  const handleSaveSettings = async () => {

    if (!companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!invoicePrefix.trim()) {
      toast({
        title: 'Error',
        description: 'Invoice prefix is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const settingsToSave = {
        companyName: companyName.trim(),
        invoicePrefix: invoicePrefix.trim(),
      };
      await saveCompanySettingsMutation.mutateAsync(settingsToSave);
    } catch (error) {
      console.error('❌ [handleSaveSettings] Error saving company settings:', error);
    }
  };

  const handleAddUser = async () => {
    // Validation
    if (!newUserData.name || !newUserData.email || !newUserData.password || !newUserData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }
    if (newUserData.password !== newUserData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    if (newUserData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters',
        variant: 'destructive',
      });
      return;
    }

    // Call IPC to create user in database
    try {
      const response = await window.api.auth.createUser({
        name: newUserData.name,
        email: newUserData.email,
        password: newUserData.password,
        role: newUserData.role === 'admin' ? 'super_admin' : 'staff',
      });


      if (response.success) {
        toast({
          title: t('createdSuccessfully'),
          description: `User "${newUserData.name}" has been added`,
        });

        // Reset form
        setNewUserData({
          name: '',
          email: '',
          role: 'staff',
          password: '',
          confirmPassword: '',
        });

        // Close dialog
        setUserDialogOpen(false);

        // Reload team members
        await loadTeamMembers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create user',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ [handleAddUser] Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    }
    setNewUserData({ name: '', email: '', role: 'staff', password: '', confirmPassword: '' });
  };

  const handleOpenEditUser = (member: any) => {
    setEditingUser(member);
    setEditUserData({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      password: '',
      confirmPassword: '',
    });
    setEditUserDialogOpen(true);
  };

  const handleEditUser = async () => {
    // Validation
    if (!editUserData.name || !editUserData.email) {
      toast({
        title: 'Error',
        description: 'Please fill required fields',
        variant: 'destructive',
      });
      return;
    }

    // If password is provided, validate it
    if (editUserData.password || editUserData.confirmPassword) {
      if (editUserData.password !== editUserData.confirmPassword) {
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive',
        });
        return;
      }
      if (editUserData.password.length < 6) {
        toast({
          title: 'Error',
          description: 'Password must be at least 6 characters',
          variant: 'destructive',
        });
        return;
      }
    }

    // Call IPC to update user
    try {
      const updateData: any = {
        name: editUserData.name,
        email: editUserData.email,
        role: editUserData.role === 'admin' ? 'super_admin' : 'staff',
      };

      if (editUserData.password) {
        updateData.password = editUserData.password;
      }

      const response = await window.api.auth.updateUser(editUserData.id, updateData);

      if (response.success) {
        toast({
          title: 'Updated Successfully',
          description: `User "${editUserData.name}" has been updated`,
        });

        setEditUserDialogOpen(false);
        setEditingUser(null);
        setEditUserData({
          id: 0,
          name: '',
          email: '',
          role: 'staff',
          password: '',
          confirmPassword: '',
        });

        // Reload team members
        await loadTeamMembers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update user',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ [handleEditUser] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDeleteConfirm = (member: any) => {
    setUserToDelete(member);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await window.api.auth.deleteUser(userToDelete.id);

      if (response.success) {
        toast({
          title: 'Deleted Successfully',
          description: `User "${userToDelete.name}" has been deleted`,
        });

        setDeleteConfirmOpen(false);
        setUserToDelete(null);

        // Reload team members
        await loadTeamMembers();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('❌ [handleDeleteUser] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleAddUnit = async () => {

    if (!newUnitData.name || !newUnitData.symbol) {
      toast({
        title: 'Error',
        description: 'Please fill name and symbol',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate ID from name (lowercase, replace spaces with underscores)
      const generatedId = newUnitData.name.toLowerCase().replace(/\s+/g, '_');

      if (editingUnit) {
        // Update existing unit
        await updateUnitMutation.mutateAsync({
          id: editingUnit.id,
          data: {
            name: newUnitData.name,
            name_urdu: newUnitData.nameUrdu || undefined,
            symbol: newUnitData.symbol,
            status: newUnitData.status,
          },
        });
        toast({
          title: t('updatedSuccessfully'),
          description: `Unit "${newUnitData.name}" has been updated`,
        });
      } else {
        // Create new unit
        await createUnitMutation.mutateAsync({
          id: generatedId,
          name: newUnitData.name,
          name_urdu: newUnitData.nameUrdu || undefined,
          symbol: newUnitData.symbol,
          status: newUnitData.status,
        });
        toast({
          title: t('createdSuccessfully'),
          description: `Unit "${newUnitData.name}" has been added`,
        });
      }
      handleCloseUnitDialog(false);
    } catch (error: any) {
      console.error('❌ [handleAddUnit] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save unit',
        variant: 'destructive',
      });
    }
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setNewUnitData({
      id: unit.id,
      name: unit.name,
      nameUrdu: unit.name_urdu || '',
      symbol: unit.symbol,
      status: unit.status,
    });
    setUnitDialogOpen(true);
  };

  const handleDeleteUnit = async (unitId: string, unitName: string) => {
    if (!confirm(`Are you sure you want to delete "${unitName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteUnitMutation.mutateAsync(unitId);
      toast({
        title: t('deletedSuccessfully'),
        description: `Unit "${unitName}" has been deleted`,
      });
    } catch (error: any) {
      console.error('❌ [handleDeleteUnit] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete unit',
        variant: 'destructive',
      });
    }
  };

  const handleCloseUnitDialog = (open: boolean) => {
    setUnitDialogOpen(open);

    if (!open) {
      // Only reset when closing
      setEditingUnit(null);
      setNewUnitData({ id: '', name: '', nameUrdu: '', symbol: '', status: 'active' });
    }
  };

  // Expense Category Handlers
  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategoryData.name) {
      toast({
        title: 'Error',
        description: 'Please fill category name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Generate ID from name (lowercase, replace spaces with underscores)
      const generatedId = newExpenseCategoryData.name.toLowerCase().replace(/\s+/g, '_');

      if (editingExpenseCategory) {
        // Update existing category
        await updateExpenseCategoryMutation.mutateAsync({
          id: editingExpenseCategory.id,
          data: {
            name: newExpenseCategoryData.name,
            status: newExpenseCategoryData.status,
          },
        });
        toast({
          title: t('updatedSuccessfully'),
          description: `Category "${newExpenseCategoryData.name}" has been updated`,
        });
      } else {
        // Create new category
        await createExpenseCategoryMutation.mutateAsync({
          id: generatedId,
          name: newExpenseCategoryData.name,
          status: newExpenseCategoryData.status,
        });
        toast({
          title: t('createdSuccessfully'),
          description: `Category "${newExpenseCategoryData.name}" has been added`,
        });
      }
      handleCloseExpenseCategoryDialog(false);
    } catch (error: any) {
      console.error('❌ [handleAddExpenseCategory] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save expense category',
        variant: 'destructive',
      });
    }
  };

  const handleEditExpenseCategory = (category: any) => {
    setEditingExpenseCategory(category);
    setNewExpenseCategoryData({
      id: category.id,
      name: category.name,
      status: category.status,
    });
    setExpenseCategoryDialogOpen(true);
  };

  const handleDeleteExpenseCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteExpenseCategoryMutation.mutateAsync(categoryId);
      toast({
        title: t('deletedSuccessfully'),
        description: `Category "${categoryName}" has been deleted`,
      });
    } catch (error: any) {
      console.error('❌ [handleDeleteExpenseCategory] Error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete expense category',
        variant: 'destructive',
      });
    }
  };

  const handleCloseExpenseCategoryDialog = (open: boolean) => {
    setExpenseCategoryDialogOpen(open);

    if (!open) {
      // Only reset when closing
      setEditingExpenseCategory(null);
      setNewExpenseCategoryData({ id: '', name: '', status: 'active' });
    }
  };

  const toggleFormField = (field: keyof CustomerFormSettings) => {
    const currentValue = customerFormSettings[field];
    const newSettings: CustomerFormSettings = {
      showEmail: customerFormSettings.showEmail,
      showPhone: customerFormSettings.showPhone,
      showAddress: customerFormSettings.showAddress,
      showCity: customerFormSettings.showCity,
      showStatus: customerFormSettings.showStatus,
      showNotes: customerFormSettings.showNotes,
      [field]: !currentValue
    };

    // Update local state immediately
    setCustomerFormSettings(newSettings);

    // Save to database (non-blocking)
    saveCustomerFormSettingsMutation.mutate(newSettings, {
      onError: () => {
        // Revert on error
        setCustomerFormSettings(customerFormSettings);
      }
    });
  };

  const toggleSupplierFormField = (field: keyof SupplierFormSettings) => {
    const currentValue = supplierFormSettings[field];
    const newSettings: SupplierFormSettings = {
      showEmail: supplierFormSettings.showEmail,
      showPhone: supplierFormSettings.showPhone,
      showAddress: supplierFormSettings.showAddress,
      showCity: supplierFormSettings.showCity,
      showStatus: supplierFormSettings.showStatus,
      showNotes: supplierFormSettings.showNotes,
      [field]: !currentValue
    };

    // Update local state immediately
    setSupplierFormSettings(newSettings);

    // Save to database (non-blocking)
    saveSupplierFormSettingsMutation.mutate(newSettings, {
      onError: () => {
        // Revert on error
        setSupplierFormSettings(supplierFormSettings);
      }
    });
  };

  const togglePaymentMethodSetting = (field: keyof PaymentMethodSettings) => {
    const currentValue = paymentMethodSettings[field];
    const newSettings: PaymentMethodSettings = {
      showCheque: paymentMethodSettings.showCheque,
      showCredit: paymentMethodSettings.showCredit,
      [field]: !currentValue
    };

    // Update local state immediately
    setPaymentMethodSettings(newSettings);

    // Save to database (non-blocking)
    savePaymentMethodSettingsMutation.mutate(newSettings, {
      onError: () => {
        // Revert on error
        setPaymentMethodSettings(paymentMethodSettings);
      }
    });
  };

  const toggleAccountVisibility = (accountId: string) => {
    const currentValue = accountVisibilitySettings[accountId];
    const newSettings: AccountVisibilitySettings = {
      ...accountVisibilitySettings,
      [accountId]: currentValue === undefined ? false : !currentValue
    };

    // Update local state immediately
    setAccountVisibilitySettings(newSettings);

    // Save to database (non-blocking)
    saveAccountVisibilitySettingsMutation.mutate(newSettings, {
      onError: () => {
        // Revert on error
        setAccountVisibilitySettings(accountVisibilitySettings);
      }
    });
  };

  const toggleItemSetting = (field: keyof ItemFormSettings) => {
    const currentValue = itemFormSettings[field];
    const newSettings: ItemFormSettings = {
      autoGenerateSku: itemFormSettings.autoGenerateSku,
      enableItems: itemFormSettings.enableItems,
      [field]: !currentValue
    };

    // Update local state immediately
    setItemFormSettings(newSettings);

    // Save to database (non-blocking)
    saveItemFormSettingsMutation.mutate(newSettings, {
      onError: () => {
        // Revert on error
        setItemFormSettings(itemFormSettings);
      }
    });
  };

  return (
    <MainLayout title={t('settings')}>
      <div className="space-y-6 ">
        <PageHeader title={t('settings')} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('companyName')}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">{t('invoicePrefix')}</Label>
                <Input
                  id="invoicePrefix"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                  placeholder="INV"
                  className="w-32"
                />
              </div>

              <Button
                onClick={handleSaveSettings}
                disabled={saveCompanySettingsMutation.isPending || companySettingsLoading}
              >
                {saveCompanySettingsMutation.isPending ? 'Saving...' : t('save')}
              </Button>
            </CardContent>
          </Card>

          {/* Language Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {t('language')} Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{language === 'ur' ? 'فوری زبان تبدیل کریں' : 'Quick Language Switch'}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ur' ? 'انگلش اور اردو کے درمیان تبدیل کریں' : 'Switch between English and Urdu'}
                  </p>
                </div>
                <div className="flex items-center bg-secondary rounded-lg p-0.5">
                  <Button
                    variant={language === 'en' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLanguage('en')}
                    className="h-8 px-4 text-xs font-medium rounded-md transition-all"
                  >
                    English
                  </Button>
                  <Button
                    variant={language === 'ur' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setLanguage('ur')}
                    className="h-8 px-4 text-xs font-medium rounded-md transition-all"
                  >
                    اردو
                  </Button>
                </div>
              </div>

              <Separator />

              {/* <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="font-medium">{language === 'ur' ? 'اردو فعال کریں' : 'Enable Urdu'}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ur' ? 'اردو زبان میں تبدیل کرنے کی اجازت دیں' : 'Allow switching to Urdu language'}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={language === 'ur'}
                    onCheckedChange={(checked) => setLanguage(checked ? 'ur' : 'en')}
                  />
                </div>
              </div> */}
            </CardContent>
          </Card>
        </div>

        {/* Units Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                {t('units')}
              </CardTitle>
              <CardDescription>
                Manage measurement units for items
              </CardDescription>
            </div>
            <Dialog open={unitDialogOpen} onOpenChange={handleCloseUnitDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('addUnit')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingUnit ? t('editUnit') : t('addUnit')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unit-name-en">{t('name')} (English) *</Label>
                      <Input
                        id="unit-name-en"
                        type="text"
                        value={newUnitData.name}
                        onChange={(e) => {
                          setNewUnitData({ ...newUnitData, name: e.target.value });
                        }}
                        onClick={(e) => {
                          e.currentTarget.focus();
                        }}
                        placeholder="e.g., Kilogram"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit-name-ur">{t('name')} (اردو)</Label>
                      <Input
                        id="unit-name-ur"
                        type="text"
                        value={newUnitData.nameUrdu}
                        onChange={(e) => setNewUnitData({ ...newUnitData, nameUrdu: e.target.value })}
                        onClick={(e) => e.currentTarget.focus()}
                        placeholder="کلوگرام"
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit-symbol">{t('symbol')} *</Label>
                    <Input
                      id="unit-symbol"
                      type="text"
                      value={newUnitData.symbol}
                      onChange={(e) => setNewUnitData({ ...newUnitData, symbol: e.target.value })}
                      onClick={(e) => e.currentTarget.focus()}
                      placeholder="e.g., kg"
                      className="w-32"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => handleCloseUnitDialog(false)} className="flex-1">
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleAddUnit}
                      className="flex-1"
                      disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
                    >
                      {(createUnitMutation.isPending || updateUnitMutation.isPending) ? 'Saving...' : t('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header hover:bg-table-header">
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('name')} (اردو)</TableHead>
                  <TableHead>{t('symbol')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-center">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Loading units...
                    </TableCell>
                  </TableRow>
                ) : units.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No units found. Click "Add Unit" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  units.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell className="font-medium">{unit.name}</TableCell>
                      <TableCell dir="rtl">{unit.name_urdu || '-'}</TableCell>
                      <TableCell className="font-mono">{unit.symbol}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${unit.status === 'active' ? 'badge-active' : 'badge-inactive'
                          }`}>
                          {unit.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditUnit(unit)}
                            disabled={deleteUnitMutation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteUnit(unit.id, unit.name)}
                            disabled={deleteUnitMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Expense Categories Management */}
        <Card id="expense-categories">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Expense Categories
              </CardTitle>
              <CardDescription>
                Manage expense categories for expense tracking
              </CardDescription>
            </div>
            <Dialog open={expenseCategoryDialogOpen} onOpenChange={handleCloseExpenseCategoryDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingExpenseCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">{t('name')} *</Label>
                    <Input
                      id="category-name"
                      type="text"
                      value={newExpenseCategoryData.name}
                      onChange={(e) => {
                        setNewExpenseCategoryData({ ...newExpenseCategoryData, name: e.target.value });
                      }}
                      onClick={(e) => {
                        e.currentTarget.focus();
                      }}
                      placeholder="e.g., Utilities"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category-status">{t('status')}</Label>
                    <Select
                      value={newExpenseCategoryData.status}
                      onValueChange={(value: 'active' | 'inactive') =>
                        setNewExpenseCategoryData({ ...newExpenseCategoryData, status: value })
                      }
                    >
                      <SelectTrigger id="category-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => handleCloseExpenseCategoryDialog(false)} className="flex-1">
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleAddExpenseCategory}
                      className="flex-1"
                      disabled={createExpenseCategoryMutation.isPending || updateExpenseCategoryMutation.isPending}
                    >
                      {(createExpenseCategoryMutation.isPending || updateExpenseCategoryMutation.isPending) ? 'Saving...' : t('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header hover:bg-table-header">
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-center">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenseCategoriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      Loading categories...
                    </TableCell>
                  </TableRow>
                ) : expenseCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                      No categories found. Click "Add Category" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  expenseCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${category.status === 'active' ? 'badge-active' : 'badge-inactive'
                          }`}>
                          {category.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditExpenseCategory(category)}
                            disabled={deleteExpenseCategoryMutation.isPending}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteExpenseCategory(category.id, category.name)}
                            disabled={deleteExpenseCategoryMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Customer Form Fields Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('customerFormFields')}
            </CardTitle>
            <CardDescription>
              {t('enableDisableFields')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('phone')}</p>
                  <p className="text-xs text-muted-foreground">Phone number field</p>
                </div>
                <Switch
                  checked={customerFormSettings.showPhone}
                  onCheckedChange={() => toggleFormField('showPhone')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('email')}</p>
                  <p className="text-xs text-muted-foreground">Email address field</p>
                </div>
                <Switch
                  checked={customerFormSettings.showEmail}
                  onCheckedChange={() => toggleFormField('showEmail')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('city')}</p>
                  <p className="text-xs text-muted-foreground">City field</p>
                </div>
                <Switch
                  checked={customerFormSettings.showCity}
                  onCheckedChange={() => toggleFormField('showCity')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('address')}</p>
                  <p className="text-xs text-muted-foreground">Full address field</p>
                </div>
                <Switch
                  checked={customerFormSettings.showAddress}
                  onCheckedChange={() => toggleFormField('showAddress')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('status')}</p>
                  <p className="text-xs text-muted-foreground">Active/Inactive status</p>
                </div>
                <Switch
                  checked={customerFormSettings.showStatus}
                  onCheckedChange={() => toggleFormField('showStatus')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('notes')}</p>
                  <p className="text-xs text-muted-foreground">Additional notes field</p>
                </div>
                <Switch
                  checked={customerFormSettings.showNotes}
                  onCheckedChange={() => toggleFormField('showNotes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Form Fields Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {t('supplierFormFields')}
            </CardTitle>
            <CardDescription>
              {t('enableDisableSupplierFields')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('phone')}</p>
                  <p className="text-xs text-muted-foreground">Phone number field</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showPhone}
                  onCheckedChange={() => toggleSupplierFormField('showPhone')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('email')}</p>
                  <p className="text-xs text-muted-foreground">Email address field</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showEmail}
                  onCheckedChange={() => toggleSupplierFormField('showEmail')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('city')}</p>
                  <p className="text-xs text-muted-foreground">City field</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showCity}
                  onCheckedChange={() => toggleSupplierFormField('showCity')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('address')}</p>
                  <p className="text-xs text-muted-foreground">Full address field</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showAddress}
                  onCheckedChange={() => toggleSupplierFormField('showAddress')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('status')}</p>
                  <p className="text-xs text-muted-foreground">Active/Inactive status</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showStatus}
                  onCheckedChange={() => toggleSupplierFormField('showStatus')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('notes')}</p>
                  <p className="text-xs text-muted-foreground">Additional notes field</p>
                </div>
                <Switch
                  checked={supplierFormSettings.showNotes}
                  onCheckedChange={() => toggleSupplierFormField('showNotes')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payment Method Settings
            </CardTitle>
            <CardDescription>
              Enable or disable accounts and payment methods shown in payment selectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Dynamic account entries */}
              {accounts.map((account) => {
                const isVisible = accountVisibilitySettings[account.id] !== false;
                const displayName = account.account_type === 'bank' && account.bank_name
                  ? account.bank_name
                  : account.account_name;
                const typeLabel = account.account_type.replace('_', ' ').charAt(0).toUpperCase() +
                  account.account_type.replace('_', ' ').slice(1);
                const IconComponent =
                  account.account_type === 'cash' ? Banknote :
                  account.account_type === 'bank' ? Building2 :
                  account.account_type === 'mobile_wallet' ? Smartphone :
                  account.account_type === 'cheque' ? FileText : Wallet;

                return (
                  <div key={account.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <IconComponent className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel}{account.account_number && ` • ${account.account_number}`}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isVisible}
                      onCheckedChange={() => toggleAccountVisibility(account.id)}
                    />
                  </div>
                );
              })}

              {/* Cheque */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Cheque</p>
                    <p className="text-xs text-muted-foreground">Pay by cheque</p>
                  </div>
                </div>
                <Switch
                  checked={paymentMethodSettings.showCheque}
                  onCheckedChange={() => togglePaymentMethodSetting('showCheque')}
                />
              </div>

              {/* Credit */}
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Credit</p>
                    <p className="text-xs text-muted-foreground">Customer credit payment</p>
                  </div>
                </div>
                <Switch
                  checked={paymentMethodSettings.showCredit}
                  onCheckedChange={() => togglePaymentMethodSetting('showCredit')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Item Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {t('itemSettings')}
            </CardTitle>
            <CardDescription>
              Configure item management options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('autoGenerateSku')}</p>
                  <p className="text-xs text-muted-foreground">Automatically generate SKU for new items</p>
                </div>
                <Switch
                  checked={itemFormSettings.autoGenerateSku}
                  onCheckedChange={() => toggleItemSetting('autoGenerateSku')}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <div>
                  <p className="font-medium">{t('enableItemManagement')}</p>
                  <p className="text-xs text-muted-foreground">Enable or disable items module</p>
                </div>
                <Switch
                  checked={itemFormSettings.enableItems}
                  onCheckedChange={() => toggleItemSetting('enableItems')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goods Page Settings */}
        {/* <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              {t('goodsSettings')}
            </CardTitle>
            <CardDescription>
              {t('goodsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">{t('enableGoodsPage')}</p>
                <p className="text-xs text-muted-foreground">Show or hide the Goods tracking page from navigation</p>
              </div>
              <Switch 
                checked={goodsSettings.enableGoodsPage} 
                onCheckedChange={async (checked) => {
                  const newSettings = { enableGoodsPage: checked };
                  setGoodsSettings(newSettings);
                  // Store in localStorage for sidebar to read
                  localStorage.setItem('goodsPageEnabled', JSON.stringify(checked));
                  try {
                    await saveGoodsSettingsMutation.mutateAsync(newSettings);
                  } catch (error) {
                    console.error('Error saving goods settings:', error);
                    setGoodsSettings(goodsSettings);
                  }
                }} 
              />
            </div>
          </CardContent>
        </Card> */}

        {/* Menu Visibility Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Menu className="h-5 w-5 text-primary" />
              {t('menuVisibility')}
            </CardTitle>
            <CardDescription>
              {t('menuVisibilityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {menuItems.map((item) => (
                <div key={item.key} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium">{language === 'ur' ? item.labelUrdu : item.label}</p>
                  </div>
                  <Switch
                    checked={menuVisibility[item.key as keyof MenuVisibilitySettings]}
                    onCheckedChange={(checked) => {
                      const newSettings = { ...menuVisibility, [item.key]: checked };
                      setMenuVisibility(newSettings);
                      localStorage.setItem('menuVisibilitySettings', JSON.stringify(newSettings));
                      window.dispatchEvent(new Event('menuVisibilityChanged'));
                      toast({
                        title: t('updatedSuccessfully'),
                        description: `${item.label} ${checked ? 'shown' : 'hidden'}`,
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Invoice Print Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="h-5 w-5 text-primary" />
              {t('invoiceSettings')}
            </CardTitle>
            <CardDescription>
              {t('invoiceSettingsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Header Banner Upload */}
            <div className="space-y-3">
              <Label>{t('invoiceHeaderBanner')}</Label>
              <div className="flex items-center gap-4">
                {invoiceSettings.headerBannerUrl ? (
                  <div className="relative">
                    <img
                      src={invoiceSettings.headerBannerUrl}
                      alt="Invoice Header"
                      className="h-20 object-contain rounded border"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={async () => {
                        try {
                          const newSettings = {
                            ...invoiceSettings,
                            headerBannerUrl: '' // Empty string, not undefined
                          };
                          setInvoiceSettings(newSettings);
                          await saveInvoiceSettingsMutation.mutateAsync(newSettings);
                        } catch (error) {
                          console.error('Error removing banner:', error);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="h-20 w-48 border-2 border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">{t('uploadBanner')}</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = async () => {
                        const newSettings = { ...invoiceSettings, headerBannerUrl: reader.result as string };
                        setInvoiceSettings(newSettings);
                        try {
                          await saveInvoiceSettingsMutation.mutateAsync(newSettings);
                        } catch (error) {
                          console.error('Error saving invoice settings:', error);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                {!invoiceSettings.headerBannerUrl && (
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
                    {t('uploadBanner')}
                  </Button>
                )}
              </div>
            </div>

            <Separator />

            {/* Column Labels */}
            <div className="space-y-3">
              <Label>{t('invoiceColumnLabels')}</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Serial No</Label>
                  <Input
                    value={invoiceSettings.columnLabels?.serialNo || ''}
                    onChange={async (e) => {
                      const newSettings = {
                        ...invoiceSettings,
                        columnLabels: { ...invoiceSettings.columnLabels, serialNo: e.target.value }
                      };
                      setInvoiceSettings(newSettings);
                    }}
                    onBlur={async () => {
                      try {
                        await saveInvoiceSettingsMutation.mutateAsync(invoiceSettings);
                      } catch (error) {
                        console.error('Error saving invoice settings:', error);
                      }
                    }}
                    dir="rtl"
                    placeholder="تعداد"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Input
                    value={invoiceSettings.columnLabels?.quantity || ''}
                    onChange={async (e) => {
                      const newSettings = {
                        ...invoiceSettings,
                        columnLabels: { ...invoiceSettings.columnLabels, quantity: e.target.value }
                      };
                      setInvoiceSettings(newSettings);
                    }}
                    onBlur={async () => {
                      try {
                        await saveInvoiceSettingsMutation.mutateAsync(invoiceSettings);
                      } catch (error) {
                        console.error('Error saving invoice settings:', error);
                      }
                    }}
                    dir="rtl"
                    placeholder="تفصیل"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Rate</Label>
                  <Input
                    value={invoiceSettings.columnLabels?.description || ''}
                    onChange={async (e) => {
                      const newSettings = {
                        ...invoiceSettings,
                        columnLabels: { ...invoiceSettings.columnLabels, description: e.target.value }
                      };
                      setInvoiceSettings(newSettings);
                    }}
                    onBlur={async () => {
                      try {
                        await saveInvoiceSettingsMutation.mutateAsync(invoiceSettings);
                      } catch (error) {
                        console.error('Error saving invoice settings:', error);
                      }
                    }}
                    dir="rtl"
                    placeholder="نرخ"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Amount</Label>
                  <Input
                    value={invoiceSettings.columnLabels?.rate || ''}
                    onChange={async (e) => {
                      const newSettings = {
                        ...invoiceSettings,
                        columnLabels: { ...invoiceSettings.columnLabels, rate: e.target.value }
                      };
                      setInvoiceSettings(newSettings);
                    }}
                    onBlur={async () => {
                      try {
                        await saveInvoiceSettingsMutation.mutateAsync(invoiceSettings);
                      } catch (error) {
                        console.error('Error saving invoice settings:', error);
                      }
                    }}
                    dir="rtl"
                    placeholder="رقم"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Total</Label>
                  <Input
                    value={invoiceSettings.columnLabels?.total || ''}
                    onChange={async (e) => {
                      const newSettings = {
                        ...invoiceSettings,
                        columnLabels: { ...invoiceSettings.columnLabels, total: e.target.value }
                      };
                      setInvoiceSettings(newSettings);
                    }}
                    onBlur={async () => {
                      try {
                        await saveInvoiceSettingsMutation.mutateAsync(invoiceSettings);
                      } catch (error) {
                        console.error('Error saving invoice settings:', error);
                      }
                    }}
                    dir="rtl"
                    placeholder="میزان"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>


        {/* Team Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
            <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Add Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('name')} *</Label>
                    <Input
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('email')} *</Label>
                    <Input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={newUserData.role}
                      onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="staff">Staff (Limited Access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      placeholder="Enter password"
                      className={newUserData.password && newUserData.password.length < 6 ? 'border-red-500' : ''}
                    />
                    {newUserData.password && (
                      <p className={`text-xs ${newUserData.password.length < 6
                        ? 'text-red-500'
                        : 'text-green-500'
                        }`}>
                        {newUserData.password.length < 6
                          ? `Password must be at least 6 characters (${newUserData.password.length}/6)`
                          : '✓ Password is strong'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm Password *</Label>
                    <Input
                      type="password"
                      value={newUserData.confirmPassword}
                      onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                      placeholder="Confirm password"
                      className={newUserData.confirmPassword && newUserData.password !== newUserData.confirmPassword ? 'border-red-500' : ''}
                    />
                    {newUserData.confirmPassword && (
                      <p className={`text-xs ${newUserData.password !== newUserData.confirmPassword
                        ? 'text-red-500'
                        : 'text-green-500'
                        }`}>
                        {newUserData.password !== newUserData.confirmPassword
                          ? '✗ Passwords do not match'
                          : '✓ Passwords match'}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setUserDialogOpen(false)} className="flex-1">
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleAddUser}
                      className="flex-1"
                      disabled={!newUserData.name || !newUserData.email || !newUserData.password || !newUserData.confirmPassword || newUserData.password !== newUserData.confirmPassword || newUserData.password.length < 6}
                    >
                      {t('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Edit Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('name')} *</Label>
                    <Input
                      value={editUserData.name}
                      onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                      placeholder="Full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t('email')} *</Label>
                    <Input
                      type="email"
                      value={editUserData.email}
                      onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={editUserData.role}
                      onValueChange={(value) => setEditUserData({ ...editUserData, role: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border border-border z-50">
                        <SelectItem value="admin">Admin (Full Access)</SelectItem>
                        <SelectItem value="staff">Staff (Limited Access)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>New Password (leave empty to keep current)</Label>
                    <Input
                      type="password"
                      value={editUserData.password}
                      onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                      placeholder="Enter new password"
                      className={editUserData.password && editUserData.password.length < 6 ? 'border-red-500' : ''}
                    />
                    {editUserData.password && (
                      <p className={`text-xs ${editUserData.password.length < 6
                        ? 'text-red-500'
                        : 'text-green-500'
                        }`}>
                        {editUserData.password.length < 6
                          ? `Password must be at least 6 characters (${editUserData.password.length}/6)`
                          : '✓ Password is strong'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      value={editUserData.confirmPassword}
                      onChange={(e) => setEditUserData({ ...editUserData, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      className={editUserData.confirmPassword && editUserData.password !== editUserData.confirmPassword ? 'border-red-500' : ''}
                    />
                    {editUserData.confirmPassword && (
                      <p className={`text-xs ${editUserData.password !== editUserData.confirmPassword
                        ? 'text-red-500'
                        : 'text-green-500'
                        }`}>
                        {editUserData.password !== editUserData.confirmPassword
                          ? '✗ Passwords do not match'
                          : '✓ Passwords match'}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setEditUserDialogOpen(false)} className="flex-1">
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleEditUser}
                      className="flex-1"
                      disabled={!editUserData.name || !editUserData.email}
                    >
                      {t('save')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
              <DialogContent className="bg-card">
                <DialogHeader>
                  <DialogTitle>Delete Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete <span className="font-semibold">{userToDelete?.name}</span>?
                  </p>
                  <p className="text-xs text-destructive">
                    This action cannot be undone.
                  </p>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} className="flex-1">
                      {t('cancel')}
                    </Button>
                    <Button
                      onClick={handleDeleteUser}
                      className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-table-header hover:bg-table-header">
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('email')}</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead className="text-center">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembersLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading team members...
                    </TableCell>
                  </TableRow>
                ) : teamMembersError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-destructive py-8">
                      {teamMembersError}
                    </TableCell>
                  </TableRow>
                ) : teamMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No team members found
                    </TableCell>
                  </TableRow>
                ) : (
                  teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${member.role === 'admin'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                            }`}
                        >
                          <Shield className="h-3 w-3" />
                          {member.role === 'admin' ? 'Admin' : 'Staff'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${member.status === 'active'
                          ? 'badge-active'
                          : 'bg-destructive/10 text-destructive'
                          }`}>
                          {member.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEditUser(member)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            disabled={member.role === 'admin'}
                            onClick={() => handleOpenDeleteConfirm(member)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Permissions Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Role Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-primary mb-2">Admin</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Full access to all modules</li>
                  <li>✓ Create, edit, delete all records</li>
                  <li>✓ Manage team members</li>
                  <li>✓ Access settings</li>
                  <li>✓ View all reports</li>
                </ul>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border border-border">
                <h4 className="font-semibold mb-2">Staff</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Create and view sales/purchases</li>
                  <li>✓ Add payments</li>
                  <li>✓ View customers and suppliers</li>
                  <li>✗ Cannot delete critical records</li>
                  <li>✗ No access to settings</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* License Management Section */}
        <LicenseInfoSettings />

        {/* Invoice Number Format Section */}
        <InvoiceNumberFormatSettings />

        {/* Database Backup & Restore Section */}
        <BackupSettings />
      </div>
    </MainLayout>
  );
}
