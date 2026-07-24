import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle, Shield, RefreshCw } from 'lucide-react';

/**
 * Expired License Dialog
 * Shows a modal when license is expired
 * Gracefully handles expired licenses
 */
export default function ExpiredLicenseDialog() {
  const navigate = useNavigate();
  const { isActivated, isValid, license, expiryInfo } = useLicense();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Show dialog if license is activated but invalid due to expiry
    if (isActivated && !isValid && license?.status === 'expired') {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [isActivated, isValid, license?.status]);

  const handleRenew = () => {
    // Navigate to renewal page or external URL
    window.open('https://your-website.com/renew', '_blank');
  };

  const handleContactSupport = () => {
    // Navigate to support
    window.open('https://your-website.com/support', '_blank');
  };

  const handleContinue = () => {
    // Close dialog but user may have limited functionality
    setOpen(false);
  };

  const daysExpired = expiryInfo?.expiryDate 
    ? Math.floor((new Date().getTime() - expiryInfo.expiryDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            License Expired
          </DialogTitle>
          <DialogDescription>
            Your JSERP license has expired and requires renewal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your license expired {daysExpired} day{daysExpired !== 1 ? 's' : ''} ago.
              {expiryInfo?.expiryDate && (
                <span className="block mt-1 text-xs">
                  Expired on: {expiryInfo.expiryDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2 text-sm">
            <p className="font-medium">What happens now?</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Some features may be limited or unavailable</li>
              <li>Your data remains safe and accessible</li>
              <li>Renew to restore full functionality</li>
            </ul>
          </div>

          {license && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-xs">
              <div><span className="font-medium">License:</span> {license.license_key}</div>
              <div><span className="font-medium">Registered to:</span> {license.customer_name}</div>
              <div><span className="font-medium">Email:</span> {license.customer_email}</div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleContactSupport}
            className="w-full sm:w-auto"
          >
            Contact Support
          </Button>
          <Button
            onClick={handleRenew}
            className="w-full sm:w-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Renew License
          </Button>
        </DialogFooter>

        <button
          onClick={handleContinue}
          className="text-xs text-muted-foreground hover:text-foreground text-center w-full"
        >
          Continue with limited access
        </button>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Expiring Soon Warning
 * Shows a dismissible alert when license is expiring soon
 */
export function ExpiringLicenseAlert() {
  const { isValid, expiryInfo } = useLicense();
  const [dismissed, setDismissed] = useState(false);

  // Show if license is valid but expiring within 30 days
  const shouldShow = isValid && 
    expiryInfo?.hasExpiry && 
    !expiryInfo.isExpired && 
    expiryInfo.daysRemaining !== null && 
    expiryInfo.daysRemaining <= 30 &&
    !dismissed;

  if (!shouldShow) return null;

  return (
    <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 mb-4">
      <AlertTriangle className="h-4 w-4 text-orange-500" />
      <div className="flex-1">
        <AlertDescription>
          <strong>License Expiring Soon:</strong> Your license will expire in{' '}
          {expiryInfo.daysRemaining} day{expiryInfo.daysRemaining !== 1 ? 's' : ''}.
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 ml-2 text-orange-600 hover:text-orange-700"
            onClick={() => window.open('https://your-website.com/renew', '_blank')}
          >
            Renew Now →
          </Button>
        </AlertDescription>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </Button>
    </Alert>
  );
}
