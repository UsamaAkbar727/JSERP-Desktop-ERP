import { useEffect, useRef } from 'react';
import { useLicenseActivationModal } from '@/contexts/LicenseActivationContext';
import { Shield } from 'lucide-react';
import LicenseActivation from './LicenseActivation';

/**
 * License Activation Modal
 * Global modal that shows when license activation is required
 */
export default function LicenseActivationModal() {
  const { showActivationModal } = useLicenseActivationModal();
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showActivationModal && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showActivationModal]);

  if (!showActivationModal) {
    return null;
  }

  return (
    <div
      ref={modalRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl bg-white dark:bg-slate-900 shadow-2xl p-6 z-10">
        <div className="flex items-start gap-4 mb-4">
          <Shield className="h-8 w-8 text-white bg-blue-600 rounded-md p-1" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">License Required</h2>
            <p className="text-sm text-muted-foreground">Please activate your license to continue using the application.</p>
          </div>
        </div>

        <div>
          <LicenseActivation />
        </div>
      </div>
    </div>
  );
}
