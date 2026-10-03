/**
 * Utilitaires Blockchain EVM & Formatage
 */

import { ethers } from 'ethers';

/**
 * Tronque une adresse EVM (ex: 0x18e1...7777)
 */
export function formatAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (!ethers.isAddress(address)) return address;
  const checksummed = ethers.getAddress(address);
  return `${checksummed.substring(0, chars + 2)}...${checksummed.substring(checksummed.length - chars)}`;
}

/**
 * Formate un montant numérique pour un affichage lisible
 */
export function formatCryptoAmount(amount: string | number, maxDecimals = 4, hide = false): string {
  if (hide) return '••••••';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.00';
  if (num === 0) return '0.00';
  if (num < 0.0001) return '< 0.0001';
  return num.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
}

/**
 * Formate une valeur en devise fiat (ex: $1,245.50)
 */
export function formatFiatValue(val: number, currency = 'USD', hide = false): string {
  if (hide) return '••••••••';
  if (isNaN(val)) return currency === 'CDF' ? '0.00 CDF' : '$0.00';
  const prefix = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '';
  const suffix = currency === 'CDF' ? ' CDF' : '';
  return `${prefix}${val.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}${suffix}`;
}
