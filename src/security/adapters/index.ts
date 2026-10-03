/**
 * Adapters — CDF Wallet
 * 
 * Factory pour sélectionner l'adaptateur de stockage adapté selon la plateforme (Web, Android, iOS).
 */

import { IPlatformStorageAdapter } from './IPlatformStorageAdapter';
import { WebPlatformStorageAdapter } from './WebPlatformStorageAdapter';
import { AndroidKeystoreAdapter } from './AndroidKeystoreAdapter';
import { IOSKeychainAdapter } from './IOSKeychainAdapter';

export * from './IPlatformStorageAdapter';
export * from './WebPlatformStorageAdapter';
export * from './AndroidKeystoreAdapter';
export * from './IOSKeychainAdapter';

export function createPlatformAdapter(): IPlatformStorageAdapter {
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator?.userAgent || '';
    if ((window as any).AndroidSecureStorage || /android/i.test(userAgent)) {
      return new AndroidKeystoreAdapter();
    }
    if ((window as any).webkit?.messageHandlers?.IOSKeychain || /iPad|iPhone|iPod/.test(userAgent)) {
      return new IOSKeychainAdapter();
    }
  }
  return new WebPlatformStorageAdapter();
}
