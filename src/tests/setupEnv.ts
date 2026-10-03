/**
 * Configuration de l'environnement de test pour Node / tsx
 */

if (typeof globalThis.window === 'undefined') {
  const memoryStore = new Map<string, string>();

  const mockLocalStorage = {
    getItem: (k: string) => memoryStore.get(k) ?? null,
    setItem: (k: string, v: string) => { memoryStore.set(k, String(v)); },
    removeItem: (k: string) => { memoryStore.delete(k); },
    clear: () => { memoryStore.clear(); },
    get length() { return memoryStore.size; },
    key: (i: number) => Array.from(memoryStore.keys())[i] ?? null,
  };

  (globalThis as any).window = {
    location: { pathname: '/', search: '', hash: '', protocol: 'https:', hostname: 'localhost' },
    history: { pushState: () => {}, replaceState: () => {} },
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    addEventListener: () => {},
    removeEventListener: () => {},
    scrollTo: () => {},
    localStorage: mockLocalStorage,
    crypto: globalThis.crypto,
  };

  (globalThis as any).document = {
    documentElement: {
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
      },
    },
    title: 'CDF Wallet',
    createElement: () => ({
      getContext: () => null,
      toDataURL: () => '',
    }),
  };

  try {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        clipboard: {
          writeText: async () => {},
          readText: async () => '',
        },
        userAgent: 'Node.js Test Runner',
      },
      writable: true,
      configurable: true,
    });
  } catch {
    if ((globalThis as any).navigator) {
      try {
        Object.defineProperty((globalThis as any).navigator, 'clipboard', {
          value: {
            writeText: async () => {},
            readText: async () => '',
          },
          configurable: true,
        });
      } catch {
        // Ignore
      }
    }
  }

  (globalThis as any).localStorage = mockLocalStorage;
}
