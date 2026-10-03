/**
 * IPlatformStorageAdapter — CDF Wallet
 * 
 * Contrat d'interface pour le stockage sécurisé multi-plateforme :
 * - Web (LocalStorage / SessionStorage pour données chiffrées AES-GCM)
 * - Android (Android Keystore / EncryptedSharedPreferences)
 * - iOS (iOS Keychain Services / Secure Enclave)
 */

export interface IPlatformStorageAdapter {
  getPlatform(): 'web' | 'android' | 'ios';
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(prefix?: string): Promise<void>;
  isBiometricsSupported(): Promise<boolean>;
}
