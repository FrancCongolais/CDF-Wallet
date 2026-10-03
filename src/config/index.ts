/**
 * Export centralisé de la configuration de CDF Wallet
 */

export * from './tokens';
export * from './networks';

export const APP_CONFIG = {
  name: 'CDF Wallet',
  version: '1.0.0-alpha',
  author: 'CDF Wallet Team',
  defaultLanguage: 'fr',
  defaultCurrency: 'USD',
  supportedCurrencies: ['USD', 'EUR', 'CDF'] as const,
  socials: {
    website: 'https://cdfwallet.io',
    docs: 'https://docs.cdfwallet.io',
    github: 'https://github.com/cdf-wallet',
  },
  demoWarningNotice: 'Mode démonstration actif. Aucune transaction réelle ne sera exécutée sur la blockchain.',
};
