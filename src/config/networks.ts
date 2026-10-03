/**
 * CONFIGURATION DES RÉSEAUX BLOCKCHAIN SUPPORTÉS
 * 
 * Réseau principal : BNB Smart Chain (BSC) — Chain ID 56
 * Testnet : BNB Smart Chain Testnet — Chain ID 97
 * 
 * Les variables VITE_BSC_MAINNET_RPC et VITE_BSC_TESTNET_RPC sont injectées en priorité lorsqu'elles sont définies.
 * Des nœuds RPC publics hautement disponibles servent de solutions de secours automatiques.
 * AUCUNE CLÉ PRIVÉE N'EST HARDCODÉE DANS CE FICHIER.
 */

import { Network } from '../types';

// Résolution prioritaire des variables d'environnement RPC (Vite)
const MAINNET_RPC_ENV = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BSC_MAINNET_RPC
  ? import.meta.env.VITE_BSC_MAINNET_RPC
  : null;

const TESTNET_RPC_ENV = typeof import.meta !== 'undefined' && import.meta.env?.VITE_BSC_TESTNET_RPC
  ? import.meta.env.VITE_BSC_TESTNET_RPC
  : null;

// Nœuds RPC de secours publics et fiables pour BNB Smart Chain
export const BSC_MAINNET_FALLBACK_RPCS: string[] = [
  ...(MAINNET_RPC_ENV ? [MAINNET_RPC_ENV] : []),
  'https://bsc-dataseed.binance.org',
  'https://binance.llamarpc.com',
  'https://bsc.publicnode.com',
  'https://bscrpc.com',
];

export const BSC_TESTNET_FALLBACK_RPCS: string[] = [
  ...(TESTNET_RPC_ENV ? [TESTNET_RPC_ENV] : []),
  'https://data-seed-prebsc-1-s1.binance.org:8545',
  'https://bsc-testnet.public.blastapi.io',
  'https://bsc-testnet.publicnode.com',
];

export const SUPPORTED_NETWORKS: Record<string, Network> = {
  bscMainnet: {
    id: 'bsc-mainnet',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: MAINNET_RPC_ENV || BSC_MAINNET_FALLBACK_RPCS[0],
    blockExplorerUrl: 'https://bscscan.com',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18,
    },
    isTestnet: false,
  },
  bscTestnet: {
    id: 'bsc-testnet',
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrl: TESTNET_RPC_ENV || BSC_TESTNET_FALLBACK_RPCS[0],
    blockExplorerUrl: 'https://testnet.bscscan.com',
    nativeCurrency: {
      name: 'tBNB',
      symbol: 'BNB',
      decimals: 18,
    },
    isTestnet: true,
  },
};

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.bscMainnet;

/**
 * Récupère la liste ordonnée des RPCs pour un réseau donné (avec fallback)
 */
export function getRpcEndpointsForNetwork(network: Network): string[] {
  if (network.chainId === 56) {
    return BSC_MAINNET_FALLBACK_RPCS;
  }
  if (network.chainId === 97) {
    return BSC_TESTNET_FALLBACK_RPCS;
  }
  return [network.rpcUrl];
}
