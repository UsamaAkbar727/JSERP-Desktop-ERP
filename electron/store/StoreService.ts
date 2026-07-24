import Store from 'electron-store';

/**
 * Store Service
 * Manages persistent storage using electron-store
 */

interface StoreSchema {
  // License data
  license: {
    isActivated: boolean;
    isValid?: boolean;
    isVerified?: boolean;
    licenseKey?: string;
    activationDate?: string;
    expiryDate?: string;
    hardwareId?: string;
    customerName?: string;
    customerEmail?: string;
    status?: string;
    lastVerifiedAt?: string;
  };
  
  // Auth data
  auth: {
    sessionToken?: string;
    user?: {
      id: number;
      name: string;
      email: string;
      role: 'super_admin' | 'admin' | 'staff';
    };
    isAuthenticated: boolean;
  };
}

export class StoreService {
  private store: any;

  constructor() {
    this.store = new Store<StoreSchema>({
      name: 'erp-pro-config',
      defaults: {
        license: {
          isActivated: false,
          isValid: false,
          isVerified: false,
        },
        auth: {
          isAuthenticated: false,
        },
      },
    });
  }

  // License methods
  getLicense(): StoreSchema['license'] {
    return this.store.get('license');
  }

  setLicense(license: StoreSchema['license']) {
    this.store.set('license', license);
  }

  clearLicense() {
    this.store.set('license', {
      isActivated: false,
      isValid: false,
      isVerified: false,
    });
  }

  isLicenseActivated(): boolean {
    return this.store.get('license.isActivated') ?? false;
  }

  // Auth methods
  getAuth(): StoreSchema['auth'] {
    return this.store.get('auth');
  }

  setAuth(auth: StoreSchema['auth']) {
    this.store.set('auth', auth);
  }

  clearAuth() {
    this.store.set('auth', {
      isAuthenticated: false,
    });
  }

  isAuthenticated(): boolean {
    return this.store.get('auth.isAuthenticated') ?? false;
  }

  getSessionToken(): string | undefined {
    return this.store.get('auth.sessionToken');
  }

  setSessionToken(token: string) {
    this.store.set('auth.sessionToken', token);
  }

  getUser(): StoreSchema['auth']['user'] | undefined {
    return this.store.get('auth.user');
  }

  setUser(user: StoreSchema['auth']['user']) {
    this.store.set('auth.user', user);
  }

  // Generic methods (use with caution)
  get(key: keyof StoreSchema): any {
    return this.store.get(key);
  }

  set(key: keyof StoreSchema, value: any) {
    this.store.set(key, value);
  }

  delete(key: keyof StoreSchema) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Singleton instance
let storeServiceInstance: StoreService | null = null;

export function getStoreService(): StoreService {
  if (!storeServiceInstance) {
    storeServiceInstance = new StoreService();
  }
  return storeServiceInstance;
}
