import { useState, useEffect } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { useLicenseActivationModal } from '@/contexts/LicenseActivationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, AlertCircle, Shield, Key, HardDrive, Monitor, Copy, CheckCircle, ArrowRight } from 'lucide-react';

/**
 * License Activation Component
 * Allows users to activate and manage their application license
 */
export default function LicenseActivation() {
  const {
    licenseInfo,
    isLoading,
    error,
    isValid,
    isActivated,
    license,
    expiryInfo,
    hardwareId,
    activateLicense,
    verifyOnline,
    deactivateLicense,
    getHardwareId,
    checkLicense,
  } = useLicense();

  const { setShowActivationModal } = useLicenseActivationModal();

  const [licenseKey, setLicenseKey] = useState('');
  
  const [isActivating, setIsActivating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activationMessage, setActivationMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hwInfo, setHwInfo] = useState<{ hardwareId: string; summary: string } | null>(null);

  // Load hardware ID on mount
  useEffect(() => {
    getHardwareId().then(setHwInfo);
  }, [getHardwareId]);

  const formatLicenseKey = (value: string): string => {
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const formatted = cleaned.replace(/(.{4})/g, '$1-').replace(/-$/, '');
    return formatted;
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatLicenseKey(value);
    if (formatted.replace(/-/g, '').length <= 16) {
      setLicenseKey(formatted);
    }
  };

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

  const handleActivate = async () => {
    if (!licenseKey.trim()) {
      setActivationMessage({ type: 'error', message: 'Please enter a license key' });
      return;
    }

    setIsActivating(true);
    setActivationMessage(null);

    try {
      const success = await activateLicense(licenseKey.trim());
      
      if (success) {
        // Show success message first
        setActivationMessage({ 
          type: 'success', 
          message: 'License activated successfully!' 
        });
        setLicenseKey('');
        
         setShowActivationModal(false)
        // Don't manually close modal - let LicenseActivationContext handle it
        // The context will automatically detect license state change and close modal
        
      } else {
        // Invalid license - show error message
        setActivationMessage({ 
          type: 'error', 
          message: error || 'Invalid license or system ID' 
        });
      }
    } catch (err) {
      // Handle any errors during activation
      setActivationMessage({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to activate license' 
      });
    } finally {
      setIsActivating(false);
    }
  };

  const handleVerifyOnline = async () => {
    setActivationMessage(null);
    const success = await verifyOnline();
    
    if (success) {
      setActivationMessage({ type: 'success', message: 'License verified successfully!' });
      // Hide the modal after successful verification if license becomes valid
      if (isValid) {
        setShowActivationModal(false);
      }
    } else {
      setActivationMessage({ type: 'error', message: error || 'Failed to verify license' });
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your license?')) {
      return;
    }

    setActivationMessage(null);
    const success = await deactivateLicense();
    
    if (success) {
      setActivationMessage({ type: 'success', message: 'License deactivated successfully' });
    } else {
      setActivationMessage({ type: 'error', message: error || 'Failed to deactivate license' });
    }
  };

  const getStatusBadge = () => {
    if (!isActivated) {
      return <Badge variant="secondary">Not Activated</Badge>;
    }
    
    if (!isValid) {
      return <Badge variant="destructive">Invalid</Badge>;
    }

    if (license?.status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }

    if (license?.status === 'revoked') {
      return <Badge variant="destructive">Revoked</Badge>;
    }

    if (license?.status === 'suspended') {
      return <Badge variant="outline">Suspended</Badge>;
    }

    return <Badge variant="default" className="bg-green-500">Active</Badge>;
  };

  const getExpiryMessage = () => {
    if (!expiryInfo?.hasExpiry) {
      return 'Perpetual License';
    }

    if (expiryInfo.isExpired) {
      return 'License has expired';
    }

    const days = expiryInfo.daysRemaining;
    if (days === null) return '';

    if (days <= 7) {
      return `⚠️ Expires in ${days} day${days !== 1 ? 's' : ''}`;
    }

    return `Expires in ${days} day${days !== 1 ? 's' : ''}`;
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
          <Shield className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">License Information</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your JSERP license</p>
        </div>
      </div>

      {/* Current License Status */}
      {isActivated && license && isValid && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                License Information
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Customer Name</p>
                <p className="font-medium">{license.customer_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Email</p>
                <p className="font-medium">{license.customer_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">License Key</p>
                <p className="font-mono text-sm">{license.license_key}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activation Date</p>
                <p className="font-medium">{new Date(license.activation_date).toLocaleDateString()}</p>
              </div>
              {expiryInfo?.hasExpiry && (
                <div>
                  <p className="text-sm text-muted-foreground">Expiry Status</p>
                  <p className={`font-medium ${expiryInfo.daysRemaining && expiryInfo.daysRemaining <= 7 ? 'text-orange-500' : ''}`}>
                    {getExpiryMessage()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{license.status}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleVerifyOnline} 
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify Online
              </Button>
              <Button 
                onClick={handleDeactivate} 
                variant="destructive"
                disabled={isLoading}
              >
                Deactivate License
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid License Warning - when activated but not valid */}
      {isActivated && !isValid && license && (
        <Card className="border-2 border-red-300 dark:border-red-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                License Requires Attention
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show license details */}
            <Alert variant="destructive" className="border-2">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="font-medium">
                {licenseInfo?.message || 'Your license is not valid. Please verify your license online.'}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">License Key</p>
                <p className="font-mono text-sm">{license.license_key}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium capitalize text-red-600 dark:text-red-400">{license.status}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activation Date</p>
                <p className="font-medium">{new Date(license.activation_date).toLocaleDateString()}</p>
              </div>
              {license.last_verified_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Last Verified</p>
                  <p className="font-medium">{new Date(license.last_verified_at).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleVerifyOnline} 
                variant="default"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify License Online
              </Button>
              <Button 
                onClick={handleDeactivate} 
                variant="outline"
                disabled={isLoading}
              >
                Deactivate & Re-activate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activation Form */}
      {!isActivated && (
        <div className="space-y-6">
          {/* Alert Message */}
          <Alert className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-900 dark:text-amber-100 font-medium">
              No active license found. Please activate your license to use JSERP.
            </AlertDescription>
          </Alert>

          {/* System ID Card */}
          <Card className="shadow-lg border-2 bg-gradient-to-br from-blue-50/50 to-slate-50 dark:from-slate-800 dark:to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Monitor className="h-5 w-5" />
                System ID
              </CardTitle>
              <CardDescription>
                This unique identifier will be linked to your license
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hwInfo ? (
                <div className="space-y-3">
                  <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm font-mono text-slate-800 dark:text-slate-200 select-all flex-1 break-all font-semibold">
                        {hwInfo.hardwareId}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700"
                        onClick={handleCopySystemId}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-slate-500" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {hwInfo.summary} • Read-only identifier
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading system information...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activation Form Card */}
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                <Key className="h-6 w-6 text-blue-600" />
                Activate License
              </CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-400">
                Enter your license key to activate JuttSoft ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* License Key Input */}
              <div className="space-y-3">
                <Label htmlFor="licenseKey" className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  License Key <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="licenseKey"
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  value={licenseKey}
                  onChange={handleLicenseKeyChange}
                  disabled={isActivating}
                  className="font-mono text-lg tracking-widest h-14 text-center border-2 focus:border-blue-500 bg-white dark:bg-slate-800"
                  maxLength={19}
                  autoComplete="off"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                  Enter your 16-character license key
                </p>
              </div>

              {/* Email removed — activation only requires license key and system id */}

              {/* Status Messages */}
              {activationMessage && (
                <Alert 
                  variant={activationMessage.type === 'error' ? 'destructive' : 'default'}
                  className={`border-2 ${
                    activationMessage.type === 'success' 
                      ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 animate-pulse' 
                      : ''
                  }`}
                >
                  {activationMessage.type === 'error' ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  <AlertDescription className="font-medium flex items-center gap-2">
                    {activationMessage.message}
                    {activationMessage.type === 'success' && (
                      <Loader2 className="h-4 w-4 animate-spin text-green-600 ml-2" />
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <Button 
                onClick={handleActivate} 
                size="lg"
                className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                disabled={isActivating || !licenseKey.trim()}
              >
                {isActivating ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Activating License...
                  </>
                ) : (
                  <>
                    Activate License
                    <ArrowRight className="ml-3 h-5 w-5" />
                  </>
                )}
              </Button>
              
              <div className="text-center space-y-2 text-sm text-slate-500 dark:text-slate-400">
                <p>
                  Manage your licenses at: {' '}
                  <a 
                    href="https://juttsoft.com/" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                  >
                    ERP License Manager
                  </a>
                </p>
                <p className="text-xs">
                  Login with admin / admin123 for demo purposes
                </p>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Hardware Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Hardware Information
          </CardTitle>
          <CardDescription>
            This hardware ID is used to bind the license to this machine
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Hardware ID</p>
              <p className="font-mono text-sm">{hardwareId || hwInfo?.hardwareId || 'Loading...'}</p>
            </div>
            {hwInfo?.summary && (
              <div>
                <p className="text-sm text-muted-foreground">System Summary</p>
                <p className="text-sm">{hwInfo.summary}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && !activationMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* License Info for debugging */}
      {licenseInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(licenseInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
