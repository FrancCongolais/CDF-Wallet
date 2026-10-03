/**
 * Types TypeScript stricts pour CDF Wallet
 * Règle importante : Le nom officiel est "CDF Wallet", le token est "CDF — Franc Congolais".
 * Ne jamais utiliser "FC".
 */

export type ChainId = 56 | 97;

export interface Network {
  id: string;
  name: string;
  chainId: ChainId;
  rpcUrl: string;
  blockExplorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet: boolean;
}

export type TokenSymbol = 'BNB' | 'CDF' | 'USDT';

export interface Token {
  id: string;
  symbol: TokenSymbol;
  name: string;
  decimals: number;
  contractAddress: string | null; // null pour le token natif BNB
  network: string;
  chainId: ChainId;
  logoUrl?: string;
  isNative: boolean;
  coingeckoId?: string;
}

export interface Asset {
  token: Token;
  balance: string; // Format string pour précision numérique
  rawBalance: string; // Wei / unit format
  usdPrice: number;
  estimatedUsdValue: number;
  change24h: number; // Pourcentage de variation 24h
  networkName: string;
  isLoading?: boolean;
  error?: string | null;
  isConfigured?: boolean;
  statusNote?: string;
}

export interface Balance {
  totalUsd: number;
  change24hUsd: number;
  change24hPercentage: number;
  assets: Asset[];
  lastUpdated: number;
}

export type TransactionType = 'send' | 'receive' | 'swap' | 'approve' | 'buy' | 'sell' | 'qr_payment';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed';

export interface Transaction {
  id: string;
  hash?: string;
  type: TransactionType;
  status: TransactionStatus;
  tokenSymbol: TokenSymbol;
  amount: string;
  usdValue: number;
  fromAddress: string;
  toAddress: string;
  timestamp: number;
  fee?: string;
  networkId: string;
  nonce?: number;
  isDemoData: boolean; // Transparence stricte : indique s'il s'agit d'une transaction de démonstration
  note?: string;
}

export interface UserProfile {
  nom: string;
  postNom: string;
  nomDeFamille: string;
  telephone: string;
  gmail?: string;
  documentType?: 'id_card' | 'passport' | 'driving_license';
  documentNumber?: string;
  photoUrl?: string;
  googleAuthenticatorEnabled: boolean;
  faceIdEnabled: boolean;
  fingerprintEnabled: boolean;
  isActivated: boolean;
  initialDepositAmount?: number;
  initialDepositMethod?: 'mobile_money' | 'visa';
  initialDepositTxId?: string;
  activatedAt?: string;
}

export interface KycData {
  documentType: 'id_card' | 'passport' | 'driving_license';
  documentNumber?: string;
  status: 'none' | 'pending' | 'verified' | 'rejected';
  idFrontImage?: string;
  idBackImage?: string;
  selfieImage?: string;
  submittedAt?: string;
  verifiedAt?: string;
}

export interface MerchantQr {
  id: string;
  title: string;
  category: 'transport' | 'commerce' | 'service' | 'autre';
  amountUsd: number;
  merchantAddress: string;
  notes?: string;
  createdAt: number;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  referencesSupport?: boolean;
}

export interface WalletAccount {
  address: string;
  name: string;
  pathIndex: number;
  derivationPath: string; // Ex: m/44'/60'/0'/0/0
  createdAt: number;
}

export interface WalletState {
  isInitialized: boolean;
  isUnlocked: boolean;
  selectedAccount: WalletAccount | null;
  accounts: WalletAccount[];
  activeNetwork: Network;
  balance: Balance;
  transactions: Transaction[];
  isDemoMode: boolean;
}

export interface UserSettings {
  currency: 'USD' | 'EUR' | 'CDF';
  language: 'fr' | 'en';
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  hideBalances: boolean;
  security: {
    autoLockTimerMinutes: number; // 0 = jamais, 1, 5, 15, 30
    biometricsEnabled: boolean;
    requirePinForTransfers: boolean;
    analyticsEnabled: boolean; // non-sensitive opt-in
  };
  customRpcEndpoints: Record<number, string>;
}

/**
 * Types de notifications stricts conformes au schéma de table Supabase 'notifications'
 */
export type NotificationType = 'info' | 'transaction' | 'security' | 'system';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: NotificationType;
  is_read: boolean;
  created_at: string;
}

/**
 * Interfaces pour le futur moteur blockchain (Wallet Core)
 */
export interface IBlockchainProvider {
  getBalance(address: string): Promise<string>;
  getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string>;
  estimateGas(to: string, amount: string, data?: string): Promise<string>;
  getGasPrice(): Promise<string>;
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;
}

export interface ISecureStorage {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface ISecurityManager {
  validateAddress(address: string): boolean;
  sanitizeInput(input: string): string;
  checkSecurityAudit(): { pass: boolean; warnings: string[] };
}
