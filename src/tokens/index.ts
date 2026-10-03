/**
 * Gestion des Tokens et Actifs supportés
 * Règle d'or : Token = CDF, Nom = Franc Congolais. Pas de "FC".
 */

import { Asset, Balance, TokenSymbol } from '../types';
import { OFFICIAL_TOKENS, CDF_CONTRACT_ADDRESS } from '../config/tokens';

export interface TokenPrice {
  symbol: TokenSymbol;
  usdPrice: number;
  change24h: number;
}

/**
 * Taux indicatifs de marché pour le calcul des valorisations
 */
export const DEFAULT_PRICES: Record<TokenSymbol, TokenPrice> = {
  BNB: {
    symbol: 'BNB',
    usdPrice: 590.25,
    change24h: 2.84,
  },
  CDF: {
    symbol: 'CDF',
    usdPrice: 0.00035, // Estimation indicative du token CDF
    change24h: 1.15,
  },
  USDT: {
    symbol: 'USDT',
    usdPrice: 1.00,
    change24h: 0.02,
  },
};

export interface AssetStatusMap {
  BNB?: { error?: string | null; isLoading?: boolean };
  CDF?: { error?: string | null; isLoading?: boolean };
  USDT?: { error?: string | null; isLoading?: boolean; isConfigured?: boolean; statusNote?: string };
}

/**
 * Génère la liste des actifs pour un solde donné
 */
export function calculateAssets(
  balances: { BNB: string; CDF: string; USDT: string },
  networkName = 'BNB Smart Chain',
  statusMap?: AssetStatusMap
): Asset[] {
  const bnbQty = parseFloat(balances.BNB) || 0;
  const cdfQty = parseFloat(balances.CDF) || 0;
  const usdtQty = parseFloat(balances.USDT) || 0;

  const bnbUsd = bnbQty * DEFAULT_PRICES.BNB.usdPrice;
  const cdfUsd = cdfQty * DEFAULT_PRICES.CDF.usdPrice;
  const usdtUsd = usdtQty * DEFAULT_PRICES.USDT.usdPrice;

  return [
    {
      token: OFFICIAL_TOKENS.BNB,
      balance: balances.BNB,
      rawBalance: (bnbQty * 1e18).toString(),
      usdPrice: DEFAULT_PRICES.BNB.usdPrice,
      estimatedUsdValue: bnbUsd,
      change24h: DEFAULT_PRICES.BNB.change24h,
      networkName,
      error: statusMap?.BNB?.error ?? null,
      isLoading: statusMap?.BNB?.isLoading ?? false,
      isConfigured: true,
      statusNote: 'Monnaie native BNB Smart Chain (frais de gas & transferts)',
    },
    {
      token: OFFICIAL_TOKENS.CDF,
      balance: balances.CDF,
      rawBalance: (cdfQty * 1e18).toString(),
      usdPrice: DEFAULT_PRICES.CDF.usdPrice,
      estimatedUsdValue: cdfUsd,
      change24h: DEFAULT_PRICES.CDF.change24h,
      networkName,
      error: statusMap?.CDF?.error ?? null,
      isLoading: statusMap?.CDF?.isLoading ?? false,
      isConfigured: true,
      statusNote: 'Token officiel Franc Congolais (BEP-20, 18 décimales)',
    },
    {
      token: OFFICIAL_TOKENS.USDT,
      balance: balances.USDT,
      rawBalance: (usdtQty * 1e18).toString(),
      usdPrice: DEFAULT_PRICES.USDT.usdPrice,
      estimatedUsdValue: usdtUsd,
      change24h: DEFAULT_PRICES.USDT.change24h,
      networkName,
      error: statusMap?.USDT?.error ?? null,
      isLoading: statusMap?.USDT?.isLoading ?? false,
      isConfigured: statusMap?.USDT?.isConfigured ?? true,
      statusNote: statusMap?.USDT?.statusNote ?? (statusMap?.USDT?.isConfigured === false
        ? 'En attente de déploiement officiel sur ce réseau — Aucune adresse fictive générée'
        : 'Stablecoin indexé USD (BEP-20)'),
    },
  ];
}

/**
 * Calcule le total consolidé du portefeuille
 */
export function calculateTotalBalance(assets: Asset[]): Balance {
  const totalUsd = assets.reduce((sum, a) => sum + a.estimatedUsdValue, 0);
  
  // Calcul de la pondération de la variation 24h
  let weightedChange = 0;
  if (totalUsd > 0) {
    weightedChange = assets.reduce(
      (sum, a) => sum + (a.change24h * (a.estimatedUsdValue / totalUsd)),
      0
    );
  }

  const change24hUsd = (totalUsd * weightedChange) / 100;

  return {
    totalUsd,
    change24hUsd,
    change24hPercentage: weightedChange,
    assets,
    lastUpdated: Date.now(),
  };
}

export { CDF_CONTRACT_ADDRESS };
