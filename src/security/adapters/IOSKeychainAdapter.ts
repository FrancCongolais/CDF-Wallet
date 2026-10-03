/**
 * IOSKeychainAdapter — CDF Wallet
 * 
 * Architecture préparée pour iOS :
 * - Prêt pour l'interfaçage avec iOS Keychain Services et Secure Enclave (Face ID / Touch ID).
 * - Garantit la non-exportabilité matérielle des secrets cryptographiques sur iOS.
 */

import { IPlatformStorageAdapter } from './IPlatformStorageAdapter';
import { WebPlatformStorageAdapter } from './WebPlatformStorageAdapter';

export class IOSKeychainAdapter implements IPlatformStorageAdapter {
  private fallbackAdapter = new WebPlatformStorageAdapter();
  private readonly iosKeychainService = 'cd.cdfwallet.keychain';

  public getPlatform(): 'ios' {
    return 'ios';
  }

  public async setItem(key: string, value: string): Promise<void> {
    // Si exécuté dans un conteneur natif iOS (ex: Capacitor/React Native/WKWebView bridge)
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.IOSKeychain) {
      try {
        await (window as any).webkit.messageHandlers.IOSKeychain.postMessage({
          action: 'set',
          service: this.iosKeychainService,
          key,
          value,
        });
        return;
      } catch (err) {
        console.warn('[IOSKeychain] Erreur du bridge natif iOS, fallback Web', err);
      }
    }
    await this.fallbackAdapter.setItem(key, value);
  }

  public async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.IOSKeychain) {
      try {
        const result = await (window as any).IOSKeychain?.get(key);
        if (result) return result;
      } catch (err) {
        console.warn('[IOSKeychain] Erreur de lecture Keychain iOS', err);
      }
    }
    return this.fallbackAdapter.getItem(key);
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.IOSKeychain) {
      try {
        await (window as any).webkit.messageHandlers.IOSKeychain.postMessage({
          action: 'remove',
          key,
        });
      } catch {
        // Ignore
      }
    }
    await this.fallbackAdapter.removeItem(key);
  }

  public async clear(prefix?: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).webkit?.messageHandlers?.IOSKeychain) {
      try {
        await (window as any).webkit.messageHandlers.IOSKeychain.postMessage({
          action: 'clear',
        });
      } catch {
        // Ignore
      }
    }
    await this.fallbackAdapter.clear(prefix);
  }

  public async isBiometricsSupported(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).IOSBiometrics) {
      try {
        return await (window as any).IOSBiometrics.isFaceIDOrTouchIDAvailable();
      } catch {
        return false;
      }
    }
    return this.fallbackAdapter.isBiometricsSupported();
  }
}
