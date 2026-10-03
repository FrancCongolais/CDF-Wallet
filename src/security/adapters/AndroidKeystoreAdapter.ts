/**
 * AndroidKeystoreAdapter — CDF Wallet
 * 
 * Architecture préparée pour Android :
 * - Prêt pour l'interfaçage avec Android Keystore et EncryptedSharedPreferences (via Capacitor, React Native ou bridge WebView).
 * - Isole le stockage des clés au niveau matériel (TEE / StrongBox) sur Android.
 */

import { IPlatformStorageAdapter } from './IPlatformStorageAdapter';
import { WebPlatformStorageAdapter } from './WebPlatformStorageAdapter';

export class AndroidKeystoreAdapter implements IPlatformStorageAdapter {
  private fallbackAdapter = new WebPlatformStorageAdapter();
  private readonly androidNamespace = 'cdf_keystore_v1_';

  public getPlatform(): 'android' {
    return 'android';
  }

  public async setItem(key: string, value: string): Promise<void> {
    // Si exécuté dans un conteneur natif Android (ex: Capacitor/React Native/Custom WebView)
    if (typeof window !== 'undefined' && (window as any).AndroidSecureStorage) {
      try {
        await (window as any).AndroidSecureStorage.set(`${this.androidNamespace}${key}`, value);
        return;
      } catch (err) {
        console.warn('[AndroidKeystore] Erreur du bridge natif, utilisation du stockage chiffré Web', err);
      }
    }
    await this.fallbackAdapter.setItem(key, value);
  }

  public async getItem(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && (window as any).AndroidSecureStorage) {
      try {
        const val = await (window as any).AndroidSecureStorage.get(`${this.androidNamespace}${key}`);
        return val || null;
      } catch (err) {
        console.warn('[AndroidKeystore] Erreur de lecture du bridge natif', err);
      }
    }
    return this.fallbackAdapter.getItem(key);
  }

  public async removeItem(key: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).AndroidSecureStorage) {
      try {
        await (window as any).AndroidSecureStorage.remove(`${this.androidNamespace}${key}`);
      } catch {
        // Ignore
      }
    }
    await this.fallbackAdapter.removeItem(key);
  }

  public async clear(prefix?: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).AndroidSecureStorage) {
      try {
        await (window as any).AndroidSecureStorage.clear();
      } catch {
        // Ignore
      }
    }
    await this.fallbackAdapter.clear(prefix);
  }

  public async isBiometricsSupported(): Promise<boolean> {
    if (typeof window !== 'undefined' && (window as any).AndroidBiometrics) {
      try {
        return await (window as any).AndroidBiometrics.isAvailable();
      } catch {
        return false;
      }
    }
    return this.fallbackAdapter.isBiometricsSupported();
  }
}
