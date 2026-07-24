/**
 * Authentication Context
 * Manages global authentication state and user session
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'staff';
}

export interface AuthContextType {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from electron-store on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Use electron-store to restore session
        const response = await window.api.auth.restoreSession();

        if (response.success && response.data) {
          const hasInternet = typeof navigator === 'undefined' ? true : navigator.onLine;

          const getSavedLicenseState = async (): Promise<{ isActive: boolean; isVerified: boolean; isValid: boolean }> => {
            if (!window.electron?.licenseCheck) {
              return { isActive: false, isVerified: false, isValid: false };
            }

            try {
              const checkResponse = await window.electron.licenseCheck();
              return {
                isActive: !!(checkResponse.success && checkResponse.data?.isActivated),
                isVerified: !!(checkResponse.success && checkResponse.data?.isVerified),
                isValid: !!(checkResponse.success && checkResponse.data?.isValid),
              };
            } catch (licenseCheckError) {
              console.error('Failed to check saved license at startup:', licenseCheckError);
              return { isActive: false, isVerified: false, isValid: false };
            }
          };

          const shouldForceLogoutOnVerifyFailure = (errorCode?: string, message?: string): boolean => {
            if (!errorCode && !message) {
              return false;
            }

            const networkOrTemporaryCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'RATE_LIMIT'];
            if (errorCode && networkOrTemporaryCodes.includes(errorCode)) {
              return false;
            }

            const invalidLicenseCodes = [
              'NOT_FOUND',
              'UNAUTHORIZED',
              'INVALID_REQUEST',
              'INVALID_LICENSE',
              'VERIFICATION_FAILED',
            ];

            if (errorCode && invalidLicenseCodes.includes(errorCode)) {
              return true;
            }

            const normalizedMessage = (message || '').toLowerCase();
            return normalizedMessage.includes('invalid') || normalizedMessage.includes('not found');
          };

          const savedLicenseState = await getSavedLicenseState();

         
          if (hasInternet && window.electron?.licenseVerifyOnline && savedLicenseState.isActive) {
            const verifyResponse = await window.electron.licenseVerifyOnline();

           

            if (!verifyResponse.success && shouldForceLogoutOnVerifyFailure(verifyResponse.errorCode, verifyResponse.message || verifyResponse.error)) {
              try {
                if (window.electron?.licenseDeactivate) {
                  await window.electron.licenseDeactivate();
                }
              } catch (deactivateError) {
                console.error('Failed to clear saved license during startup check:', deactivateError);
              }

              try {
                await window.api.auth.logout(response.data.sessionToken);
              } catch (logoutError) {
                console.error('Failed to logout during startup license check:', logoutError);
              }

              setSessionToken(null);
              setUser(null);

              // Notify all useLicense() instances to re-check so the activation
              // modal appears and LicenseGate reflects the cleared state.
              try {
                window.dispatchEvent(new CustomEvent('license:invalidated'));
              } catch (_) {}

              return;
            }
          }

          setSessionToken(response.data.sessionToken);
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await window.api.auth.login(email, password);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Login failed');
      }

      const { sessionToken: token, user: userData } = response.data;
      
      setSessionToken(token);
      setUser(userData);
      // No need to use localStorage - electron-store handles persistence
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      if (sessionToken) {
        await window.api.auth.logout(sessionToken);
      }

      setUser(null);
      setSessionToken(null);
      // No need to use localStorage - electron-store handles persistence
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sessionToken]);

  const verifySession = useCallback(async (): Promise<boolean> => {
    if (!sessionToken) return false;

    try {
      const response = await window.api.auth.verifySession(sessionToken);

      return response.success;
    } catch (error) {
      console.error('Session verification error:', error);
      return false;
    }
  }, [sessionToken]);

  const value: AuthContextType = {
    user,
    sessionToken,
    isLoading,
    isAuthenticated: !!user && !!sessionToken,
    login,
    logout,
    verifySession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to use authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
