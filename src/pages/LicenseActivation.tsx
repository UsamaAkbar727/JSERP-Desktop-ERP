import { useState, useEffect } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Key, CheckCircle, AlertCircle, ArrowRight, Monitor, Copy, Check } from 'lucide-react';

/**
 * License Activation Page - Improved UI
 * System ID prominently displayed (read-only)
 * License key input is the main focus
 */
export default function LicenseActivation() {
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activationStatus, setActivationStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  const { activateLicense } = useLicense();
  const [hardwareInfo, setHardwareInfo] = useState<{
    hardwareId: string;
    summary: string;
  } | null>(null);

  // Load hardware info when component mounts
  useEffect(() => {
    const loadHardwareInfo = async () => {
      try {
        if (window.electron?.licenseGetHardwareId) {
          const response = await window.electron.licenseGetHardwareId();
          if (response.success && response.data) {
                        setHardwareInfo(response.data);
          } else {
            throw new Error(response.error || 'Failed to get hardware info');
          }
        } else {
                    // Fallback for development
          setHardwareInfo({
            hardwareId: 'DEV-' + Math.random().toString(36).substr(2, 16),
            summary: 'Development Environment'
          });
        }
      } catch (error) {
        console.error('Failed to load hardware info:', error);
        setHardwareInfo({
          hardwareId: 'ERROR-HARDWARE-ID',
          summary: 'Error loading hardware info'
        });
      }
    };

    loadHardwareInfo();
  }, []);

  const formatLicenseKey = (value: string): string => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Add hyphens every 4 characters
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
    if (hardwareInfo?.hardwareId) {
      try {
        await navigator.clipboard.writeText(hardwareInfo.hardwareId);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy system ID:', error);
      }
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!licenseKey.trim()) {
      setActivationStatus({
        type: 'error',
        message: 'Please enter a valid license key'
      });
      return;
    }

    setIsActivating(true);
    setActivationStatus({ type: 'idle' });

    try {
      const cleanKey = licenseKey.replace(/-/g, '');
            
      const success = await activateLicense(cleanKey);
            
      if (success) {
        setActivationStatus({
          type: 'success',
          message: 'License activated successfully! Redirecting...'
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setActivationStatus({
          type: 'error',
          message: 'License activation failed'
        });
      }
    } catch (error: any) {
      console.error('License activation error:', error);
      setActivationStatus({
        type: 'error',
        message: error.message || 'An unexpected error occurred during activation'
      });
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-lg space-y-8 animate-in fade-in-50 duration-500">
        
        {/* Brand Header */}
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-2xl">
            <Key className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              JSERP
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">
              License Activation
            </p>
          </div>
        </div>

        {/* Main Activation Form */}
        <Card className="shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-xl text-slate-900 dark:text-white">
              Activate Your License
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400">
              Enter your license details to get started
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* System ID Section */}
            <div className="space-y-4">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                System ID
              </Label>
              
              {hardwareInfo ? (
                <div className="relative">
                  <div className="bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg p-4">
                    <div className="flex items-center justify-between gap-3">
                      <code className="text-sm font-mono text-slate-800 dark:text-slate-200 select-all flex-1 break-all">
                        {hardwareInfo.hardwareId}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0 hover:bg-slate-200 dark:hover:bg-slate-600"
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
                      {hardwareInfo.summary} • Read-only identifier
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg p-6">
                  <div className="flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading system information...</span>
                  </div>
                </div>
              )}
            </div>

            {/* License Key Section */}
            <form onSubmit={handleActivate} className="space-y-6">
              <div className="space-y-4">
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
              {activationStatus.type !== 'idle' && (
                <Alert 
                  variant={activationStatus.type === 'error' ? 'destructive' : 'default'}
                  className={`border-2 ${
                    activationStatus.type === 'success' 
                      ? 'border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800' 
                      : ''
                  }`}
                >
                  {activationStatus.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className="font-medium">
                    {activationStatus.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Activation Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                  disabled={isActivating || !licenseKey.trim() || activationStatus.type === 'success'}
                >
                  {isActivating ? (
                    <>
                      <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                      Activating License...
                    </>
                  ) : activationStatus.type === 'success' ? (
                    <>
                      <CheckCircle className="mr-3 h-5 w-5" />
                      Activated Successfully
                    </>
                  ) : (
                    <>
                      Activate License
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>

          <CardFooter className="text-center pt-0 pb-8">
            <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <p>
                Need help? {' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Contact Support
                </a>
              </p>
              <p>
                Don't have a license? {' '}
                <a href="#" className="text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Purchase JSERP
                </a>
              </p>
            </div>
          </CardFooter>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            By activating, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms of Service</a>
          </p>
        </div>
      </div>
    </div>
  );
}