/**
 * License Activation Context
 * Manages global state for license activation modal visibility
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLicense } from '@/hooks/useLicense';

export interface LicenseActivationContextType {
  showActivationModal: boolean;
  setShowActivationModal: (show: boolean) => void;
}

const LicenseActivationContext = createContext<LicenseActivationContextType | undefined>(undefined);

const DEVELOPMENT_MODE = true;

export function LicenseActivationProvider({ children }: { children: ReactNode }) {
  const [showActivationModal, setShowActivationModal] = useState(false);
  const { isActivated, isValid, isLoading } = useLicense();

  // Automatically show modal when license is not activated OR not valid
  useEffect(() => {
    if (DEVELOPMENT_MODE) {
      setShowActivationModal(false);
      return;
    }
    if (!isLoading) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

      console.log('[LicenseActivation] state', {
        mode: isOffline ? 'offline user' : 'online user',
        isActive: isActivated,
        isVerified: isValid,
      });

      // Offline mode: if a license is already activated, allow app usage and hide popup.
      if (isOffline && isActivated) {
        setShowActivationModal(false);
        return;
      }

      // Show modal if license is not activated OR is activated but not valid
      if (!isActivated || (isActivated && !isValid)) {
        
        setShowActivationModal(true);
      } else if (isActivated && isValid) {
        // Hide modal only when license is both activated AND valid
        // Add a small delay to let success message show
        const timer = setTimeout(() => {
          setShowActivationModal(false);
        }, 100); // 100ms delay for smooth transition

        return () => clearTimeout(timer);
      }
    }
  }, [isActivated, isValid, isLoading]);

  return (
    <LicenseActivationContext.Provider value={{ showActivationModal, setShowActivationModal }}>
      {children}
    </LicenseActivationContext.Provider>
  );
}

export function useLicenseActivationModal() {
  const context = useContext(LicenseActivationContext);
  if (context === undefined) {
    throw new Error('useLicenseActivationModal must be used within a LicenseActivationProvider');
  }
  return context;
}
