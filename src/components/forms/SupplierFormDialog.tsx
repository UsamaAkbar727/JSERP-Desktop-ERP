import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Supplier, SupplierFormSettings } from '@/types/erp';
import { toast } from '@/hooks/use-toast';
import { defaultSupplierFormSettings } from '@/data/mockData';

interface SupplierFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave: (data: Partial<Supplier>) => void;
  formSettings?: SupplierFormSettings;
}

export function SupplierFormDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
  formSettings = defaultSupplierFormSettings,
}: SupplierFormDialogProps) {
  const { t } = useLanguage();
  const isEdit = !!supplier;

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    nameUrdu: supplier?.nameUrdu || '',
    email: supplier?.email || '',
    phone: supplier?.phone || '',
    address: supplier?.address || '',
    city: supplier?.city || '',
    openingBalance: supplier?.openingBalance?.toString() || '0',
    status: supplier?.status || 'active',
    notes: supplier?.notes || '',
  });

  // Update form data when supplier prop changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        nameUrdu: supplier.nameUrdu || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        city: supplier.city || '',
        openingBalance: supplier.openingBalance?.toString() || '0',
        status: supplier.status || 'active',
        notes: supplier.notes || '',
      });
    } else {
      // Reset form for new supplier
      setFormData({
        name: '',
        nameUrdu: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        openingBalance: '0',
        status: 'active',
        notes: '',
      });
    }
  }, [supplier, open]);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter supplier name',
        variant: 'destructive',
      });
      return;
    }

    onSave({
      name: formData.name,
      nameUrdu: formData.nameUrdu,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      openingBalance: parseFloat(formData.openingBalance) || 0,
      status: formData.status as 'active' | 'inactive',
      notes: formData.notes,
    });

    toast({
      title: isEdit ? t('updatedSuccessfully') : t('createdSuccessfully'),
      description: `Supplier "${formData.name}" has been ${isEdit ? 'updated' : 'added'}`,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `${t('edit')} ${t('suppliers')}` : t('addSupplier')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Full Name - Always Required */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('name')} (English) *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Supplier name"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t('name')} (اردو)</Label>
              <Input
                value={formData.nameUrdu}
                onChange={(e) => setFormData({ ...formData, nameUrdu: e.target.value })}
                placeholder="سپلائر کا نام"
                dir="rtl"
              />
            </div>
          </div>

          {/* Opening Balance - Optional */}
          <div className="space-y-2">
            <Label>{t('openingBalance')}</Label>
            <Input
              type="number"
              value={formData.openingBalance}
              onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
              placeholder="0"
              className="input-currency"
            />
          </div>

          {/* Optional Fields - Based on Settings */}
          {formSettings.showPhone && (
            <div className="space-y-2">
              <Label>{t('phone')}</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0300-1234567"
              />
            </div>
          )}

          {formSettings.showEmail && (
            <div className="space-y-2">
              <Label>{t('email')}</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          )}

          {formSettings.showCity && (
            <div className="space-y-2">
              <Label>{t('city')}</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
          )}

          {formSettings.showAddress && (
            <div className="space-y-2">
              <Label>{t('address')}</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>
          )}

          {formSettings.showStatus && (
            <div className="space-y-2">
              <Label>{t('status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive') => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formSettings.showNotes && (
            <div className="space-y-2">
              <Label>{t('notes')}</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Optional notes..."
                rows={2}
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} className="flex-1">
              {t('save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
