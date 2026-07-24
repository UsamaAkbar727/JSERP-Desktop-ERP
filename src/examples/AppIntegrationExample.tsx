/**
 * App Integration Example
 * Shows how to integrate the license system into your main App component
 * 
 * Copy the relevant parts to your App.tsx file
 */

import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LicenseGate from '@/components/LicenseGate';
import LicenseActivationPage from '@/pages/LicenseActivation';
import ExpiredLicenseDialog, { ExpiringLicenseAlert } from '@/components/ExpiredLicenseDialog';
import { useLicense } from '@/hooks/useLicense';

// Your existing components
import Dashboard from '@/pages/Dashboard';
import SettingsPage from '@/pages/settings/SettingsPage';
// ... other imports

/**
 * Main App Component with License Integration
 */
function App() {
  return (
    <Router>
      <Routes>
        {/* License Activation Route - Always accessible */}
        <Route path="/license-activation" element={<LicenseActivationPage />} />

        {/* All other routes wrapped in LicenseGate */}
        <Route
          path="/*"
          element={
            <LicenseGate allowedPaths={['/license-activation']}>
              {/* Expired License Dialog - Shows when license expires */}
              <ExpiredLicenseDialog />
              
              {/* Your main app routes */}
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={
                    <>
                      {/* Show expiring warning on dashboard */}
                      <ExpiringLicenseAlert />
                      <Dashboard />
                    </>
                  } 
                />
                <Route path="/settings" element={<SettingsPage />} />
                {/* ... other routes */}
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </LicenseGate>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

/**
 * Alternative: Simple Integration (Minimal)
 * If you want simpler integration without dialogs
 */
function SimpleApp() {
  return (
    <Router>
      <Routes>
        <Route path="/license-activation" element={<LicenseActivationPage />} />
        
        <Route
          path="/*"
          element={
            <LicenseGate>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* ... other routes */}
              </Routes>
            </LicenseGate>
          }
        />
      </Routes>
    </Router>
  );
}

/**
 * Alternative: With Custom Loading Screen
 */
function AppWithCustomLoading() {
  return (
    <Router>
      <Routes>
        <Route path="/license-activation" element={<LicenseActivationPage />} />
        
        <Route
          path="/*"
          element={
            <LicenseGate 
              allowedPaths={['/license-activation', '/help', '/about']}
            >
              <ExpiredLicenseDialog />
              <div className="app-container">
                <ExpiringLicenseAlert />
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  {/* ... other routes */}
                </Routes>
              </div>
            </LicenseGate>
          }
        />
      </Routes>
    </Router>
  );
}

/**
 * For Feature-Based Routing
 * Restrict certain routes based on license features
 */
import { useLicenseGate } from '@/components/LicenseGate';

function ProtectedRoute({ children, requiredFeature }: { children: React.ReactNode; requiredFeature?: string }) {
  const { hasValidLicense } = useLicenseGate();
  const { hasFeature } = useLicense();
  const [canAccess, setCanAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!hasValidLicense) {
        setCanAccess(false);
        return;
      }

      if (requiredFeature) {
        const has = await hasFeature(requiredFeature);
        setCanAccess(has);
      } else {
        setCanAccess(true);
      }
    };

    checkAccess();
  }, [hasValidLicense, requiredFeature]);

  if (!canAccess) {
    return <Navigate to="/upgrade" replace />;
  }

  return <>{children}</>;
}

// Usage:
// <Route 
//   path="/advanced-reports" 
//   element={
//     <ProtectedRoute requiredFeature="advanced_reports">
//       <AdvancedReportsPage />
//     </ProtectedRoute>
//   } 
// />
