/**
 * CONFIGURATION OFFICIELLE DU TOKEN CDF ET DES JETONS SUPPORTÉS
 * 
 * RÈGLE FONDAMENTALE :
 * Ceci est l'UNIQUE source de vérité pour l'adresse du contrat du token CDF.
 * Ne JAMAIS dupliquer ni disperser cette adresse dans d'autres fichiers.
 * 
 * Symbole officiel : CDF
 * Nom complet : Franc Congolais
 * Ne jamais utiliser "FC".
 */

import { Token } from '../types';

/**
 * ADRESSE OFFICIELLE DU CONTRAT DU TOKEN CDF (BNB Smart Chain)
 * UNIQUE SOURCE DE VÉRITÉ
 */
export const CDF_CONTRACT_ADDRESS = '0x18e173fdeb700568a08d1d7049309ae322d27777';
export const CDF_DECIMALS = 18;
export const CDF_TOKEN_SYMBOL = 'CDF';
export const CDF_TOKEN_NAME = 'Franc Congolais';

/**
 * ADRESSE OFFICIELLE DE TRÉSORERIE DU PROJET / ADMINISTRATEUR
 * Perçoit les frais du portefeuille (2%)
 */
export const CDF_TREASURY_ADDRESS = '0x0E9dBe33a4fb33Fc9e6595A154538D721965401b';

/**
 * SUPPORT OFFICIEL DU PROJET
 */
export const CDF_SUPPORT_EMAIL = 'franc.congolais.fc@gmail.com';

/**
 * RÈGLES DE FRAIS VALIDÉES PAR LA SPÉCIFICATION FONCTIONNELLE :
 * - Envoi, paiement QR : 2 % (payés par l'expéditeur, ajoutés au montant. Le destinataire reçoit le montant complet)
 * - Achat ou vente de CDF : 3 % (2 % portefeuille + 1 % intégré au token CDF)
 * - Swap avec CDF : 3 % (payés par l'expéditeur)
 * - Swap sans CDF : 2 % (payés par l'expéditeur)
 */
export const FEE_CONFIG = {
  sendFeePercent: 0.02,
  qrPaymentFeePercent: 0.02,
  buySellCdfFeePercent: 0.03,
  swapWithCdfFeePercent: 0.03,
  swapWithoutCdfFeePercent: 0.02,
  treasuryAddress: CDF_TREASURY_ADDRESS,
};

/**
 * MONTANTS MINIMAUX VALIDÉS :
 * - Dépôt initial à la création du portefeuille : 10 $ (par carte Visa : 15 $)
 * - Achat par mobile money : 8 $
 * - Achat par carte Visa : 15 $
 * - Vente : aucun minimum défini
 */
export const MIN_AMOUNTS = {
  initialDepositMinUsd: 10,
  initialDepositVisaMinUsd: 15,
  mobileMoneyBuyMinUsd: 8,
  visaBuyMinUsd: 15,
};

/**
 * LIMITES MENSUELLES SORTANTES (envois, QR, swaps, ventes) :
 * - Identité non vérifiée : 500 $ par mois
 * - Identité vérifiée (KYC) : 200 000 $ par mois
 * Réinitialisation automatique le 1er de chaque mois.
 */
export const MONTHLY_LIMITS = {
  unverifiedUsd: 500,
  verifiedUsd: 200000,
};

/**
 * EMPLACEMENT POUR L'ADRESSE OFFICIELLE USDT (BEP-20)
 * Note de sécurité : Aucune fausse adresse n'est inventée.
 * Cet emplacement est réservé pour l'adresse officielle USDT du réseau sélectionné (par exemple 0x55d398326f99059fF775485246999027B3197955 sur BSC Mainnet).
 */
export const USDT_CONTRACT_ADDRESS_BSC_MAINNET = '0x55d398326f99059fF775485246999027B3197955';
export const USDT_CONTRACT_ADDRESS_BSC_TESTNET = null; // À renseigner lors du déploiement testnet officiel
export const USDT_DECIMALS = 18;

export const OFFICIAL_TOKENS: Record<string, Token> = {
  BNB: {
    id: 'binancecoin',
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    contractAddress: null, // Monnaie native BSC
    network: 'BNB Smart Chain',
    chainId: 56,
    isNative: true,
    coingeckoId: 'binancecoin',
  },
  CDF: {
    id: 'cdf-token',
    symbol: 'CDF',
    name: 'Franc Congolais',
    decimals: CDF_DECIMALS,
    contractAddress: CDF_CONTRACT_ADDRESS,
    network: 'BNB Smart Chain',
    chainId: 56,
    isNative: false,
    coingeckoId: 'cdf',
  },
  USDT: {
    id: 'tether',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: USDT_DECIMALS,
    contractAddress: USDT_CONTRACT_ADDRESS_BSC_MAINNET,
    network: 'BNB Smart Chain',
    chainId: 56,
    isNative: false,
    coingeckoId: 'tether',
  },
};
