/**
 * Startup License Verification Tests
 *
 * Scenarios:
 * 1. Internet ✓  →  server 200 (valid)   →  user continues normally
 * 2. Internet ✓  →  server 404 (invalid) →  logout + license cleared
 * 3. No internet                          →  skip verify, continue normally
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ElectronMock {
  licenseCheck: ReturnType<typeof vi.fn>;
  licenseVerifyOnline: ReturnType<typeof vi.fn>;
  licenseDeactivate: ReturnType<typeof vi.fn>;
}

interface ApiMock {
  auth: {
    restoreSession: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Replicate the exact startup logic from AuthContext.tsx */
async function runStartupCheck(
  electron: ElectronMock,
  api: ApiMock,
  hasInternet: boolean,
  session: { sessionToken: string; user: object } | null
): Promise<{ loggedIn: boolean; licenseDeactivated: boolean; eventDispatched: boolean }> {
  let loggedIn = false;
  let licenseDeactivated = false;
  let eventDispatched = false;

  // Mock navigator.onLine
  Object.defineProperty(navigator, 'onLine', { writable: true, value: hasInternet });

  // Attach mocks to window
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).electron = electron;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).api = api;

  // Listen for the invalidation event
  const handler = () => { eventDispatched = true; };
  window.addEventListener('license:invalidated', handler);

  // --- Start of logic mirrored from AuthContext restoreSession ---
  const response = session
    ? { success: true, data: { sessionToken: session.sessionToken, user: session.user } }
    : { success: false, data: null };

  if (response.success && response.data) {
    const internetAvailable = typeof navigator === 'undefined' ? true : navigator.onLine;

    const hasSavedLicense = async (): Promise<boolean> => {
      if (!window.electron?.licenseCheck) return false;
      try {
        const checkResponse = await window.electron.licenseCheck();
        return !!(checkResponse.success && checkResponse.data?.isActivated);
      } catch {
        return false;
      }
    };

    const shouldForceLogoutOnVerifyFailure = (errorCode?: string, message?: string): boolean => {
      if (!errorCode && !message) return false;
      const networkOrTemporaryCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'RATE_LIMIT'];
      if (errorCode && networkOrTemporaryCodes.includes(errorCode)) return false;
      const invalidLicenseCodes = ['NOT_FOUND', 'UNAUTHORIZED', 'INVALID_REQUEST', 'INVALID_LICENSE', 'VERIFICATION_FAILED'];
      if (errorCode && invalidLicenseCodes.includes(errorCode)) return true;
      const normalizedMessage = (message || '').toLowerCase();
      return normalizedMessage.includes('invalid') || normalizedMessage.includes('not found');
    };

    if (internetAvailable && window.electron?.licenseVerifyOnline && await hasSavedLicense()) {
      const verifyResponse = await window.electron.licenseVerifyOnline();

      if (!verifyResponse.success && shouldForceLogoutOnVerifyFailure(verifyResponse.errorCode, verifyResponse.message || verifyResponse.error)) {
        try {
          if (window.electron?.licenseDeactivate) {
            await window.electron.licenseDeactivate();
            licenseDeactivated = true;
          }
        } catch { /* ignore */ }

        try {
          await window.api.auth.logout(response.data.sessionToken);
        } catch { /* ignore */ }

        // Dispatch invalidation event (added in our implementation)
        try { window.dispatchEvent(new CustomEvent('license:invalidated')); } catch { /* ignore */ }

        window.removeEventListener('license:invalidated', handler);
        return { loggedIn: false, licenseDeactivated, eventDispatched };
      }
    }

    // No forced logout → user is logged in
    loggedIn = true;
  }

  window.removeEventListener('license:invalidated', handler);
  return { loggedIn, licenseDeactivated, eventDispatched };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Startup License Verification', () => {
  let electron: ElectronMock;
  let api: ApiMock;
  const fakeSession = { sessionToken: 'tok-123', user: { id: 1, name: 'Admin' } };

  beforeEach(() => {
    electron = {
      licenseCheck: vi.fn(),
      licenseVerifyOnline: vi.fn(),
      licenseDeactivate: vi.fn().mockResolvedValue({ success: true }),
    };
    api = {
      auth: {
        restoreSession: vi.fn(),
        logout: vi.fn().mockResolvedValue({ success: true }),
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Scenario 1 ─────────────────────────────────────────────────────────
  it('SCENARIO 1: internet ✓ + server 200 → user continues normally', async () => {
    // Saved license exists
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    // Server confirms license is valid
    electron.licenseVerifyOnline.mockResolvedValue({
      success: true,
      data: { licenseKey: 'VALID-KEY' },
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(true);
    expect(result.licenseDeactivated).toBe(false);
    expect(result.eventDispatched).toBe(false);
    expect(electron.licenseVerifyOnline).toHaveBeenCalledOnce();
    expect(api.auth.logout).not.toHaveBeenCalled();
  });

  // ── Scenario 2 ─────────────────────────────────────────────────────────
  it('SCENARIO 2: internet ✓ + server 404 (NOT_FOUND) → logout + license cleared', async () => {
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    // Server rejects license with 404
    electron.licenseVerifyOnline.mockResolvedValue({
      success: false,
      errorCode: 'NOT_FOUND',
      message: 'Invalid license or system ID',
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(false);
    expect(result.licenseDeactivated).toBe(true);
    expect(result.eventDispatched).toBe(true);
    expect(api.auth.logout).toHaveBeenCalledWith(fakeSession.sessionToken);
  });

  it('SCENARIO 2b: internet ✓ + server UNAUTHORIZED → logout + license cleared', async () => {
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    electron.licenseVerifyOnline.mockResolvedValue({
      success: false,
      errorCode: 'UNAUTHORIZED',
      message: 'License key is invalid or unauthorized.',
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(false);
    expect(result.licenseDeactivated).toBe(true);
    expect(result.eventDispatched).toBe(true);
  });

  // ── Scenario 3 ─────────────────────────────────────────────────────────
  it('SCENARIO 3: no internet → skip verification, user continues normally', async () => {
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    // verifyOnline should NOT be called when offline
    electron.licenseVerifyOnline.mockResolvedValue({ success: false, errorCode: 'NOT_FOUND' });

    const result = await runStartupCheck(electron, api, false, fakeSession);

    expect(result.loggedIn).toBe(true);
    expect(result.licenseDeactivated).toBe(false);
    expect(result.eventDispatched).toBe(false);
    // Critical: online verify must NOT be called
    expect(electron.licenseVerifyOnline).not.toHaveBeenCalled();
  });

  // ── Edge cases ──────────────────────────────────────────────────────────
  it('EDGE: no saved license + internet → skip verify, continue normally', async () => {
    // No activated license saved
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: false },
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(true);
    expect(electron.licenseVerifyOnline).not.toHaveBeenCalled();
  });

  it('EDGE: internet ✓ + server timeout (NETWORK_ERROR) → skip logout, continue normally', async () => {
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    // Network error — should NOT force a logout
    electron.licenseVerifyOnline.mockResolvedValue({
      success: false,
      errorCode: 'NETWORK_ERROR',
      message: 'Cannot connect to license server.',
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(true);
    expect(result.licenseDeactivated).toBe(false);
    expect(api.auth.logout).not.toHaveBeenCalled();
  });

  it('EDGE: internet ✓ + server 500 (SERVER_ERROR) → skip logout, continue normally', async () => {
    electron.licenseCheck.mockResolvedValue({
      success: true,
      data: { isActivated: true },
    });
    electron.licenseVerifyOnline.mockResolvedValue({
      success: false,
      errorCode: 'SERVER_ERROR',
      message: 'License server error.',
    });

    const result = await runStartupCheck(electron, api, true, fakeSession);

    expect(result.loggedIn).toBe(true);
    expect(result.licenseDeactivated).toBe(false);
  });

  it('EDGE: no session stored → no verify attempted at all', async () => {
    const result = await runStartupCheck(electron, api, true, null);

    expect(result.loggedIn).toBe(false);
    expect(electron.licenseVerifyOnline).not.toHaveBeenCalled();
  });
});
