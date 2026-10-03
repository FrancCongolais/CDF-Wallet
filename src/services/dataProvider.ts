/**
 * Service de données avec séparation stricte DEMO DATA vs REAL BLOCKCHAIN DATA
 * 
 * RÈGLE FONDAMENTALE :
 * - Aucune transaction fictive n'est présentée comme réelle.
 * - Le drapeau isDemoData est systématiquement appliqué.
 */

import { Transaction, WalletAccount, Balance } from '../types';
import { calculateAssets, calculateTotalBalance } from '../tokens';

/**
 * ADRESSE DE PORTEFEUILLE DE DÉMONSTRATION
 * Utilisée uniquement pour la prévisualisation de l'interface en mode maquette
 */
export const DEMO_WALLET_ACCOUNT: WalletAccount = {
  address: '0x3F8aD50285aE3A71c1b187588B46cb6D2c77d4B6',
  name: 'Portefeuille Principal (Démo)',
  pathIndex: 0,
  derivationPath: "m/44'/60'/0'/0/0",
  createdAt: 1718000000000,
};

/**
 * TRANSACTIONS DE DÉMONSTRATION
 * Explicitement taguées isDemoData = true
 */
export const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'demo-tx-001',
    hash: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b',
    type: 'receive',
    status: 'confirmed',
    tokenSymbol: 'CDF',
    amount: '250000',
    usdValue: 87.50,
    fromAddress: '0x18e173fdeb700568a08d1d7049309ae322d27777',
    toAddress: DEMO_WALLET_ACCOUNT.address,
    timestamp: Date.now() - 3600000 * 2, // 2 heures auparavant
    networkId: 'bsc-mainnet',
    isDemoData: true,
    note: 'Réception initiale de démonstration CDF',
  },
  {
    id: 'demo-tx-002',
    hash: '0x4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a',
    type: 'receive',
    status: 'confirmed',
    tokenSymbol: 'BNB',
    amount: '0.45',
    usdValue: 265.61,
    fromAddress: '0x71C8705a2B88e6082570566270E4EB9Fd4cfdEB9',
    toAddress: DEMO_WALLET_ACCOUNT.address,
    timestamp: Date.now() - 3600000 * 24, // Hier
    networkId: 'bsc-mainnet',
    isDemoData: true,
    note: 'Crédit BNB de démonstration pour les frais de gas',
  },
  {
    id: 'demo-tx-003',
    hash: '0x1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d',
    type: 'receive',
    status: 'confirmed',
    tokenSymbol: 'USDT',
    amount: '120.00',
    usdValue: 120.00,
    fromAddress: '0x55d398326f99059fF775485246999027B3197955',
    toAddress: DEMO_WALLET_ACCOUNT.address,
    timestamp: Date.now() - 3600000 * 48, // Il y a 2 jours
    networkId: 'bsc-mainnet',
    isDemoData: true,
    note: 'Solde USDT de démonstration',
  },
];

/**
 * SOLDE DE DÉMONSTRATION
 */
export function getDemoBalance(): Balance {
  const assets = calculateAssets({
    BNB: '0.45',
    CDF: '250000',
    USDT: '120.00',
  });
  return calculateTotalBalance(assets);
}

/**
 * SOLDE RÉEL INITIAL (Portefeuille vide sans seed/transaction)
 */
export function getEmptyRealBalance(): Balance {
  const assets = calculateAssets({
    BNB: '0.00',
    CDF: '0.00',
    USDT: '0.00',
  });
  return calculateTotalBalance(assets);
}
