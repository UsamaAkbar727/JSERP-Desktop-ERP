import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, RefreshCw, Hash } from 'lucide-react';
import { useInvoiceFormat, useUpdateInvoiceFormat } from '@/hooks/useInvoiceNumberFormat';
import { buildLivePreview } from '../../lib/invoiceNumberPreview.ts';
import type { InvoiceFormatType, DateFormat, ResetType } from '@/hooks/useInvoiceNumberFormat';

interface InvoiceNumberFormatCardProps {
  type: InvoiceFormatType;
  title: string;
  description: string;
}

export function InvoiceNumberFormatCard({
  type,
  title,
  description,
}: InvoiceNumberFormatCardProps) {
  const { data: formatData, isLoading } = useInvoiceFormat(type);
  const updateMutation = useUpdateInvoiceFormat(type);

  const [prefix, setPrefix] = useState('');
  const [digits, setDigits] = useState<number>(4);
  const [dateFormat, setDateFormat] = useState<DateFormat>('YYYY-MM');
  const [resetType, setResetType] = useState<ResetType>('monthly');
  const [dirty, setDirty] = useState(false);

  // Sync fetched format into local state
  useEffect(() => {
    if (formatData?.format) {
      setPrefix(formatData.format.prefix);
      setDigits(formatData.format.digits);
      setDateFormat(formatData.format.date_format);
      setResetType(formatData.format.reset_type);
      setDirty(false);
    }
  }, [formatData]);

  const livePreview = buildLivePreview(prefix, dateFormat, digits);

  const handleSave = async () => {
    await updateMutation.mutateAsync({ prefix, date_format: dateFormat, digits, reset_type: resetType });
    setDirty(false);
  };

  const mark = useCallback(() => setDirty(true), []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Hash className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hash className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Prefix ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Prefix</Label>
            <Input
              value={prefix}
              onChange={(e) => { setPrefix(e.target.value.toUpperCase()); mark(); }}
              placeholder="e.g. SAL"
              maxLength={10}
            />
            <p className="text-xs text-muted-foreground">Letters / numbers only, no spaces.</p>
          </div>

          {/* ── Digits ─────────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Counter Digits</Label>
            <Select
              value={String(digits)}
              onValueChange={(v) => { setDigits(Number(v)); mark(); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                {[3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} digits &nbsp;
                    <span className="text-muted-foreground text-xs">
                      ({(1).toString().padStart(n, '0')} → {'9'.repeat(n)})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Date Format ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Date Format</Label>
            <Select
              value={dateFormat}
              onValueChange={(v) => { setDateFormat(v as DateFormat); mark(); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="YYYY-MM">YYYY-MM (2026-02)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2026-02-01)</SelectItem>
                <SelectItem value="YYYY">YYYY (2026)</SelectItem>
                <SelectItem value="YY-MM">YY-MM (26-02)</SelectItem>
                <SelectItem value="YY">YY (26)</SelectItem>
                <SelectItem value="none">None (no date in number)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ── Reset Type ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Counter Reset</Label>
            <Select
              value={resetType}
              onValueChange={(v) => { setResetType(v as ResetType); mark(); }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border z-50">
                <SelectItem value="monthly">Monthly (resets each month)</SelectItem>
                <SelectItem value="yearly">Yearly (resets each year)</SelectItem>
                <SelectItem value="never">Never (continues forever)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Live Preview ───────────────────────────────────────── */}
        <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <RefreshCw className="h-3 w-3" />
            Live Preview
          </p>
          <p className="text-xl font-mono font-semibold tracking-wider">
            {livePreview}
          </p>
          <p className="text-xs text-muted-foreground">
            Counter shown is the NEXT one to be used. DB counter: {formatData?.format.last_counter ?? 0}
          </p>
        </div>

        {/* ── Reset notice ───────────────────────────────────────── */}
        {dirty && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            ⚠ Saving will reset the counter to 0 so numbers restart from the new format.
          </p>
        )}

        {/* ── Save Button ────────────────────────────────────────── */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            size="sm"
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Saving…' : 'Save Format'}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}

/**
 * Section that contains both sale and purchase format cards.
 */
export default function InvoiceNumberFormatSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Invoice Number Format</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Configure the automatic numbering for sale and purchase invoices.
          Changes reset the counter to 0.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <InvoiceNumberFormatCard
          type="sale"
          title="Sale Invoice Format"
          description="Applies to all new sale invoices created in the system."
        />
        <InvoiceNumberFormatCard
          type="purchase"
          title="Purchase Invoice Format"
          description="Applies to all new purchase bills created in the system."
        />
      </div>
    </div>
  );
}
