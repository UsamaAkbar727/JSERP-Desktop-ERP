import { useEffect, useState } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * License Status Display Component
 * Shows current license status and warnings in the application header/dashboard
 */
export default function LicenseStatus() {
  const { 
    isValid, 
    isActivated, 
    license,
    expiryInfo,
    checkExpiry,
    isLoading 
  } = useLicense();

  const [expiryWarning, setExpiryWarning] = useState<{ isExpiring: boolean; daysRemaining: number | null } | null>(null);

  useEffect(() => {
    // Check if license is expiring within 30 days
    const checkExpiryStatus = async () => {
      const result = await checkExpiry(30);
      setExpiryWarning(result);
    };

    if (isValid && expiryInfo?.hasExpiry) {
      checkExpiryStatus();
    }
  }, [isValid, expiryInfo, checkExpiry]);

  // Don't show anything while loading
  if (isLoading) {
    return null;
  }

  // Show alert if not activated
  if (!isActivated) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>License Required:</strong> Please activate your license to use JSERP.
          <a href="/settings/license" className="underline ml-2">Activate Now</a>
        </AlertDescription>
      </Alert>
    );
  }

  // Show alert if license is invalid
  if (!isValid) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Invalid License:</strong> {license?.status === 'expired' ? 'Your license has expired.' : 'Your license is not valid.'}
          <a href="/settings/license" className="underline ml-2">Manage License</a>
        </AlertDescription>
      </Alert>
    );
  }

  // Show warning if expiring soon
  if (expiryWarning?.isExpiring && expiryWarning.daysRemaining !== null) {
    return (
      <Alert className="mb-4 border-orange-500">
        <AlertTriangle className="h-4 w-4 text-orange-500" />
        <AlertDescription>
          <strong>License Expiring:</strong> Your license will expire in {expiryWarning.daysRemaining} day{expiryWarning.daysRemaining !== 1 ? 's' : ''}.
          <a href="/settings/license" className="underline ml-2">Renew Now</a>
        </AlertDescription>
      </Alert>
    );
  }

  // Show success badge for valid license (optional, for compact display)
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Shield className="h-4 w-4 text-green-500" />
      <span>Licensed to: {license?.customer_name}</span>
      <Badge variant="default" className="bg-green-500">Active</Badge>
    </div>
  );
}

/**
 * Compact License Badge Component
 * Can be used in app header or sidebar
 */
export function LicenseBadge() {
  const { isValid, isActivated } = useLicense();

  if (!isActivated) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Not Activated
      </Badge>
    );
  }

  if (!isValid) {
    return (
      <Badge variant="destructive">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Invalid
      </Badge>
    );
  }

  return (
    <Badge variant="default" className="bg-green-500">
      <CheckCircle className="h-3 w-3 mr-1" />
      Active
    </Badge>
  );
}

/**
 * License Info Card Component
 * Shows detailed license information in settings or dashboard
 */
export function LicenseInfoCard() {
  const { 
    license,
    features,
    expiryInfo,
    isLoading,
    error 
  } = useLicense();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Loading license information...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!license) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No License</CardTitle>
          <CardDescription>Please activate your license to continue</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          License Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{license.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge 
              variant={license.status === 'active' ? 'default' : 'destructive'}
              className={license.status === 'active' ? 'bg-green-500' : ''}
            >
              {license.status}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Activated On</p>
            <p className="font-medium">{new Date(license.activation_date).toLocaleDateString()}</p>
          </div>
          {expiryInfo?.hasExpiry && (
            <div>
              <p className="text-sm text-muted-foreground">Expires</p>
              <p className="font-medium">
                {expiryInfo.isExpired 
                  ? 'Expired' 
                  : `${expiryInfo.daysRemaining} days remaining`}
              </p>
            </div>
          )}
        </div>

        {features && Object.keys(features).length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Enabled Features</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(features).map(([key, value]) => (
                value === true && (
                  <Badge key={key} variant="secondary">
                    {key.replace(/_/g, ' ')}
                  </Badge>
                )
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
