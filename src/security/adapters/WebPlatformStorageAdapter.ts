/**
 * WebPlatformStorageAdapter — CDF Wallet
 * 
 * Stockage Web pour les payloads cryptographiques AES-GCM chiffrés.
 * RÈGLE ABSOLUE :
 * - Aucune donnée sensible n'est enregistrée en clair.
 * - Ne stocke QUE des payloads chiffrés avec IV et sel aléatoire.
 */

import { IPlatformStorageAdapter } from './IPlatformStorageAdapter';

export class WebPlatformStorageAdapter implements IPlatformStorageAdapter {
  private prefix: string = 'cdf_sec_v2_';

  public getPlatform(): 'web' {
    return 'web';
  }

  public async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(`${this.prefix}${key}`, value);
    } catch {
      // Fallback sessionStorage si quota dépassé ou localStorage bloqué
      try {
        window.sessionStorage.setItem(`${this.prefix}${key}`, value);
      } catch {
        // Fallback ignoré
      }
    }
  }

  public async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
      const fromLocal = window.localStorage.getItem(`${this.prefix}${key}`);
      if (fromLocal) return fromLocal;
      return window.sessionStorage.getItem(`${this.prefix}${key}`);
    } catch {
      return null;
    }
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(`${this.prefix}${key}`);
      window.sessionStorage.removeItem(`${this.prefix}${key}`);
    } catch {
      // Ignore
    }
  }

  public async clear(prefixFilter?: string): Promise<void> {
    if (typeof window === 'undefined') return;
    const effectivePrefix = prefixFilter || this.prefix;
    try {
      const removeMatching = (storage: Storage) => {
        const toDelete: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k && k.startsWith(effectivePrefix)) {
            toDelete.push(k);
          }
        }
        toDelete.forEach((k) => storage.removeItem(k));
      };

      removeMatching(window.localStorage);
      removeMatching(window.sessionStorage);
    } catch {
      // Ignore
    }
  }

  public async isBiometricsSupported(): Promise<boolean> {
    // Vérification de compatibilité WebAuthn / TouchID / Windows Hello
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      try {
        return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    }
    return false;
  }
}
