import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Shield, Calendar, User, Mail, Key, RefreshCw, XCircle, AlertTriangle, CheckCircle2, Loader2, Copy, Check, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLicenseActivationModal } from '@/contexts/LicenseActivationContext';

/**
 * License Info Component for Settings Page
 * Displays detailed license information and management options
 */
export default function LicenseInfoSettings() {
  const {
    license,
    isValid,
    isActivated,
    expiryInfo,
    isLoading,
    error,
    verifyOnline,
    deactivateLicense,
    getHardwareId,
  } = useLicense();

  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hwInfo, setHwInfo] = useState<{ hardwareId: string; summary: string } | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationSuccess, setActivationSuccess] = useState(false);
  const { setShowActivationModal } = useLicenseActivationModal();

  // Load hardware ID
  useEffect(() => {
    getHardwareId().then(setHwInfo);
  }, [getHardwareId]);

  // Debug: Log license object to see its structure


  const handleCopySystemId = async () => {
    if (hwInfo?.hardwareId) {
      try {
        await navigator.clipboard.writeText(hwInfo.hardwareId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy system ID:', error);
      }
    }
  };

  const handleVerifyOnline = async () => {
    setIsVerifying(true);
    setActionMessage(null);

    const success = await verifyOnline();

    if (success) {
      setActionMessage({ type: 'success', message: 'License verified successfully with server' });
    } else {
      setActionMessage({ type: 'error', message: error || 'Failed to verify license online' });
    }

    setIsVerifying(false);
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your license? You will need to reactivate to use the application.')) {
      return;
    }

    setIsDeactivating(true);
    setActionMessage(null);

    const success = await deactivateLicense();
    setShowActivationModal(true)
    if (success) {

      setActionMessage({ type: 'success', message: 'License deactivated successfully' });

    } else {
      setActionMessage({ type: 'error', message: error || 'Failed to deactivate license' });
    }

    setIsDeactivating(false);
  };

  const maskLicenseKey = (key: string) => {
    const parts = key.split('-');
    if (parts.length === 4) {
      return `${parts[0]}-****-****-${parts[3]}`;
    }
    return '****-****-****-****';
  };

  const getStatusBadge = () => {
    if (!isActivated) {
      return (
        <Badge variant="secondary" className="gap-1">
          <XCircle className="h-3 w-3" />
          Not Activated
        </Badge>
      );
    }

    if (!isValid) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {license?.status === 'expired' ? 'Expired' : 'Invalid'}
        </Badge>
      );
    }

    if (expiryInfo?.isExpired) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-500 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Active
      </Badge>
    );
  };

  const getExpiryStatus = () => {
    if (!expiryInfo?.hasExpiry) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Perpetual License</span>
        </div>
      );
    }

    if (expiryInfo.isExpired) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">Expired</span>
        </div>
      );
    }

    if (expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining <= 30) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <span className="text-orange-500 font-medium">
            Expires in {expiryInfo.daysRemaining} day{expiryInfo.daysRemaining !== 1 ? 's' : ''}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <span className="text-muted-foreground">
          Valid for {expiryInfo.daysRemaining} more days
        </span>
      </div>
    );
  };

  const handleActivate = async () => {
    if (!licenseKey.trim()) return;
    setIsActivating(true);
    setActionMessage(null);
    try {
      let result: any = false;
      if (typeof window !== 'undefined' && window.electron && window.electron.licenseActivate) {
        result = await window.electron.licenseActivate(licenseKey.trim());
      }
      // Handle both boolean and object result
      if (typeof result === 'object' && result !== null && 'success' in result) {
        if (result.success) {
          setActivationSuccess(true);
          setActionMessage({ type: 'success', message: 'License activated successfully!' });
        } else {
          setActionMessage({ type: 'error', message: result.error || 'Activation failed' });
        }
      } else if (result === true) {
        setActivationSuccess(true);
        setActionMessage({ type: 'success', message: 'License activated successfully!' });
      } else {
        setActionMessage({ type: 'error', message: 'Activation failed' });
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', message: err?.message || 'Activation failed' });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading license information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // if (!isActivated) {
  //   return (
  //     <Card className="shadow-xl border-0 overflow-hidden">
  //       <CardHeader className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border-b">
  //         <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-xl">
  //           <Shield className="h-5 w-5 text-blue-600" />
  //           License Information
  //         </CardTitle>
  //         <CardDescription className="text-slate-600 dark:text-slate-400">
  //           Manage your JSERP license
  //         </CardDescription>
  //       </CardHeader>

  //       <CardContent className="p-8 space-y-6">
  //         {/* System ID Section */}
  //         {hwInfo && (
  //           <div className="space-y-2">
  //             <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
  //               <Monitor className="h-4 w-4 text-blue-600" />
  //               System ID
  //             </label>
  //             <div className="flex items-center gap-2">
  //               <input
  //                 type="text"
  //                 value={hwInfo.hardwareId}
  //                 readOnly
  //                 className="w-full font-mono text-base bg-slate-100 dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200 select-all cursor-default focus:outline-none"
  //                 style={{ userSelect: 'all' }}
  //               />
  //               <Button
  //                 type="button"
  //                 variant="ghost"
  //                 size="sm"
  //                 className="h-9 w-9 p-0 shrink-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
  //                 onClick={handleCopySystemId}
  //                 title="Copy System ID"
  //               >
  //                 {isCopied ? (
  //                   <Check className="h-4 w-4 text-green-600" />
  //                 ) : (
  //                   <Copy className="h-4 w-4 text-slate-600 dark:text-slate-400" />
  //                 )}
  //               </Button>
  //             </div>
  //           </div>
  //         )}

  //         {/* License Key Input */}
  //         <div className="space-y-2">
  //           <label htmlFor="licenseKey" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
  //             License Key
  //           </label>
  //           <input
  //             id="licenseKey"
  //             type="text"
  //             placeholder="XXXX-XXXX-XXXX-XXXX"
  //             className="w-full font-mono text-base bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
  //             autoComplete="off"
  //             maxLength={19}
  //             value={licenseKey}
  //             onChange={e => setLicenseKey(e.target.value)}
  //             disabled={isActivating || activationSuccess}
  //           />
  //         </div>

  //         {/* Error/Info Message */}
  //         {actionMessage && (
  //           <Alert className={
  //             actionMessage.type === 'error'
  //               ? 'border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
  //               : 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
  //           }>
  //             {actionMessage.type === 'error' ? (
  //               <AlertTriangle className="h-5 w-5 text-red-600" />
  //             ) : (
  //               <CheckCircle2 className="h-5 w-5 text-green-600" />
  //             )}
  //             <AlertDescription className={
  //               actionMessage.type === 'error'
  //                 ? 'text-red-900 dark:text-red-100 font-medium ml-2'
  //                 : 'text-green-900 dark:text-green-100 font-medium ml-2'
  //             }>
  //               {actionMessage.message}
  //             </AlertDescription>
  //           </Alert>
  //         )}

  //         {/* Activate Button */}
  //         <div className="pt-2">
  //           <Button
  //             className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
  //             onClick={handleActivate}
  //             disabled={isActivating || activationSuccess || !licenseKey.trim()}
  //           >
  //             {isActivating ? 'Activating...' : activationSuccess ? 'Activated' : 'Activate License'}
  //           </Button>
  //         </div>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader className="bg-gradient-to-br from-blue-50/50 to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-blue-600" />
            License Information
          </CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>Your JSERP license details and management</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-6">
        {/* Action Messages */}
        {actionMessage && (
          <Alert
            variant={actionMessage.type === 'error' ? 'destructive' : 'default'}
            className={`border-2 ${actionMessage.type === 'success'
              ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800'
              : ''
              }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription className="font-medium">{actionMessage.message}</AlertDescription>
          </Alert>
        )}

        {/* System ID Section */}
        {hwInfo && (
          <div className="bg-gradient-to-br from-blue-50/30 to-slate-50/30 dark:from-slate-800/50 dark:to-slate-900/50 border-2 border-blue-100 dark:border-blue-900 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
              <Monitor className="h-4 w-4" />
              System ID
            </div>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
              <div className="flex items-center justify-between gap-3">
                <code className="text-xs font-mono text-slate-800 dark:text-slate-200 select-all flex-1 break-all">
                  {hwInfo.hardwareId}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={handleCopySystemId}
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-slate-500" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {hwInfo.summary} • This device is licensed
            </p>
          </div>
        )}

        {/* License Details Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* License Key */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Key className="h-4 w-4 text-blue-600" />
              License Key
            </div>
            <p className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 select-all break-all">
              {license?.license_key || 'N/A'}
            </p>
          </div>

          {/* Activation Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <Calendar className="h-4 w-4 text-blue-600" />
              Activation Date
            </div>
            <p className="text-sm px-4 py-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              {license?.activation_date ?
                new Date(license.activation_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : 'N/A'}
            </p>
          </div>


        </div>

        <Separator className="my-4" />

        {/* Expiry Status */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">License Status</div>
          {getExpiryStatus()}
          {expiryInfo?.hasExpiry && expiryInfo?.expiryDate && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Expires on: {expiryInfo.expiryDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}
        </div>

        {/* Expiry Warning */}
        {expiryInfo?.hasExpiry && !expiryInfo.isExpired && expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining <= 30 && (
          <Alert className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-900 dark:text-orange-100">
              Your license will expire soon. Please renew your license to continue using JSERP without interruption.
            </AlertDescription>
          </Alert>
        )}

        {/* Expired Alert */}
        {!isValid && license?.status === 'expired' && (
          <Alert variant="destructive" className="border-2">
            <XCircle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              Your license has expired. Please renew your license to continue using JSERP.
            </AlertDescription>
          </Alert>
        )}

        <Separator className="my-4" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* <Button
            variant="outline"
            onClick={handleVerifyOnline}
            disabled={isVerifying || isDeactivating}
            className="flex-1 h-11 border-2 hover:bg-blue-50 dark:hover:bg-blue-950"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Verify Online
              </>
            )}
          </Button> */}

          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={isVerifying || isDeactivating}
            className="flex-1 h-11 shadow-md"
          >
            {isDeactivating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deactivating...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Deactivate License
              </>
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
          <p className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Verify Online checks your license status with the server</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">•</span>
            <span>Deactivating will allow you to use the license on a different device</span>
          </p>
          {license?.last_verified_at && (
            <p className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                Last verified: {new Date(license.last_verified_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
