import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import { Loader2, Shield } from 'lucide-react';

/**
 * License Gate Component
 * Checks license validity on app load and redirects to activation if needed
 * 
 * Development Mode: Set to true to bypass license checks during development
 */

const DEVELOPMENT_MODE = true; // Development mode - bypass license checks

interface LicenseGateProps {
  children: React.ReactNode;
  allowedPaths?: string[]; // Paths that don't require a license
}

export default function LicenseGate({ children, allowedPaths = ['/license-activation'] }: LicenseGateProps) {
  const navigate = useNavigate();
  const { isLoading, isValid, isActivated, checkLicense } = useLicense();
  const [isChecking, setIsChecking] = useState(true);
  const lastLicenseStateRef = useRef({ isValid: false, isActivated: false });

  useEffect(() => {
    // Bypass license check in development mode
    if (DEVELOPMENT_MODE) {
      setIsChecking(false);
      return;
    }

    const performLicenseCheck = async () => {
      try {
        await checkLicense();
      } finally {
        setIsChecking(false);
      }
    };

    performLicenseCheck();
  }, [checkLicense]);

  // Track license state changes to handle transitions better
  useEffect(() => {
    if (!isLoading && !isChecking) {
      const currentState = { isValid, isActivated };
      const lastState = lastLicenseStateRef.current;

     

      // If license just became valid, log the change
      if (!lastState.isValid && !lastState.isActivated &&
        currentState.isValid && currentState.isActivated) {
      }

      // Update the ref (this doesn't cause re-renders)
      lastLicenseStateRef.current = currentState;
    }
  }, [isValid, isActivated, isLoading, isChecking]);

  // Check if current path is allowed without license
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';

  // In development mode, render children directly
  if (DEVELOPMENT_MODE) {
    return <>{children}</>;
  }

  // Show loading screen while checking license
  if (isLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Shield className="h-16 w-16 mx-auto text-primary animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Checking License</h2>
            <p className="text-muted-foreground">Please wait...</p>
          </div>
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // If license is not valid or not activated, don't render children
  // The LicenseActivationModal will handle showing the activation UI
 

  // If license is valid but user is on activation page, redirect to dashboard
  if (isValid && isActivated && currentPath === '/license-activation') {
    navigate('/', { replace: true });
    return null;
  }

  return <>{children}</>;
}

// Named export for flexibility
export { LicenseGate };

/**
 * License Gate Hook
 * Use this in individual components to check license status
 */
export function useLicenseGate() {
  const { isValid, isActivated, licenseInfo } = useLicense();

  return {
    hasValidLicense: isValid && isActivated,
    requiresActivation: !isActivated,
    isExpired: isActivated && !isValid && licenseInfo?.license?.status === 'expired',
    isRevoked: isActivated && !isValid && licenseInfo?.license?.status === 'revoked',
  };
}
