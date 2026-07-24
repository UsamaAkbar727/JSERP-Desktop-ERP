import { useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Printer, FileText, Receipt } from 'lucide-react';
import { Sale, InvoiceSettings } from '@/types/erp';
import { InvoicePrint } from '@/components/print/InvoicePrint';
import { ThermalPrint } from '@/components/print/ThermalPrint';

interface POSPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale;
  settings: InvoiceSettings;
}

export function POSPrintDialog({ open, onOpenChange, sale, settings }: POSPrintDialogProps) {
  const { t } = useLanguage();
  const [printFormat, setPrintFormat] = useState<'classic' | 'thermal'>('classic');
  const classicPrintRef = useRef<HTMLDivElement>(null);
  const thermalPrintRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printRef = printFormat === 'classic' ? classicPrintRef : thermalPrintRef;
    
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const isRTL = printFormat === 'classic';
        const width = printFormat === 'thermal' ? '80mm' : '210mm';
        
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invoice ${sale.invoiceNumber}</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: ${printFormat === 'thermal' ? "'Courier New', monospace" : "'Noto Nastaliq Urdu', serif"};
                ${isRTL ? 'direction: rtl;' : ''}
              }
              @media print { 
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { size: ${width} auto; margin: 0; }
              }
            </style>
            <script src="https://cdn.tailwindcss.com"></script>
          </head>
          <body>
            ${printRef.current.innerHTML}
            <script>
              setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>{t('print')} Invoice</span>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              {t('print')}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Format Selection */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-2 block">Select Print Format</Label>
          <RadioGroup
            value={printFormat}
            onValueChange={(v) => setPrintFormat(v as 'classic' | 'thermal')}
            className="flex gap-4"
          >
            <div className="relative flex-1">
              <RadioGroupItem value="classic" id="format-classic" className="peer sr-only" />
              <label
                htmlFor="format-classic"
                className="flex items-center gap-3 rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
              >
                <FileText className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">Classic Invoice (A4)</p>
                  <p className="text-xs text-muted-foreground">Full page Urdu invoice</p>
                </div>
              </label>
            </div>
            <div className="relative flex-1">
              <RadioGroupItem value="thermal" id="format-thermal" className="peer sr-only" />
              <label
                htmlFor="format-thermal"
                className="flex items-center gap-3 rounded-lg border-2 border-border p-3 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
              >
                <Receipt className="h-5 w-5" />
                <div>
                  <p className="font-medium text-sm">Thermal Receipt (80mm)</p>
                  <p className="text-xs text-muted-foreground">Compact POS receipt</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Print Preview */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {printFormat === 'classic' ? (
            <InvoicePrint ref={classicPrintRef} sale={sale} settings={settings} />
          ) : (
            <div className="flex justify-center py-4">
              <ThermalPrint ref={thermalPrintRef} sale={sale} settings={settings} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
