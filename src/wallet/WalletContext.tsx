/**
 * WalletContext — Gestionnaire d'état principal de CDF Wallet
 * 
 * Centralise :
 * - Le portefeuille non-custodial actif (adresse publique uniquement exposée)
 * - La protection locale par mot de passe et le chiffrement AES-GCM via SecureStorage
 * - Le verrouillage automatique de l'application après une période d'inactivité
 * - La connexion et lecture réelle de BNB Smart Chain (Chain ID 56 / Testnet 97)
 * - L'interrogation des soldes réels BNB natif et CDF via cdfTokenService
 * - Les états de connexion blockchain : Chargement, Connecté, Erreur
 * - Maintien du mode DEMO tant que la signature réelle des transactions n'est pas finalisée
 * 
 * RÈGLES DE SÉCURITÉ INVIOLABLES :
 * - Aucune clé privée hardcodée.
 * - Ne jamais demander, transmettre ou enregistrer la seed phrase ou la clé privée vers un serveur ou Supabase.
 * - Ne jamais journaliser la seed phrase ou clé privée dans la console.
 * - Aucune transaction fictive présentée comme réelle.
 * - Aucune transaction réelle n'est diffusée à cette étape (lecture seule).
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Network, WalletAccount, Balance, Transaction, TokenSymbol, TransactionStatus, UserSettings } from '../types';
import { SUPPORTED_NETWORKS, DEFAULT_NETWORK } from '../config/networks';
import {
  CDF_CONTRACT_ADDRESS,
  CDF_DECIMALS,
  USDT_CONTRACT_ADDRESS_BSC_MAINNET,
  USDT_CONTRACT_ADDRESS_BSC_TESTNET,
  USDT_DECIMALS,
} from '../config/tokens';
import {
  DEMO_WALLET_ACCOUNT,
  DEMO_TRANSACTIONS,
  getDemoBalance,
  getEmptyRealBalance,
} from '../services/dataProvider';
import { AppStorage } from '../storage';
import { secureStorage } from '../security';
import { WalletCore } from './WalletCore';
import { blockchainService, BlockchainConnectionState } from '../blockchain/provider';
import { cdfTokenService } from '../services/cdfTokenService';
import { supabaseService } from '../services/supabase';
import { transactionService } from '../services/transactionService';
import { calculateAssets, calculateTotalBalance } from '../tokens';

interface WalletContextType {
  activeNetwork: Network;
  switchNetwork: (networkId: string) => void;
  selectedAccount: WalletAccount | null;
  accounts: WalletAccount[];
  realAccounts: WalletAccount[];
  balance: Balance;
  transactions: Transaction[];
  isDemoMode: boolean;
  setDemoMode: (active: boolean) => void;

  // Sécurité, Mot de Passe et Verrouillage
  isPasswordSet: boolean;
  isUnlocked: boolean;
  lockWallet: () => void;
  unlockWallet: (password?: string) => Promise<boolean>;
  setupWalletPassword: (password: string) => Promise<void>;
  changeWalletPassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  refreshBalances: () => Promise<void>;

  // Préférences et affichage
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;

  // États de connexion blockchain (Chargement, Connecté, Erreur)
  connectionState: BlockchainConnectionState;
  activeRpcUrl: string | null;
  latestBlockNumber: number | null;
  connectionLatencyMs: number | null;
  blockchainError: string | null;
  checkConnection: () => Promise<void>;

  // Gestion des comptes locaux
  createNewWallet: (name?: string) => Promise<{ account: WalletAccount; mnemonic: string }>;
  importWalletFromPhrase: (phrase: string, name?: string) => Promise<{ account: WalletAccount }>;
  importWalletFromPrivateKey: (privateKey: string, name?: string) => Promise<{ account: WalletAccount }>;
  revealMnemonic: (address: string) => Promise<string | null>;
  removeAccount: (address: string) => Promise<void>;
  selectAccount: (address: string) => void;

  // Transferts sécurisés non-custodiaux (BNB natif et jeton CDF)
  sendTransfer: (
    recipient: string,
    amount: string,
    tokenSymbol: TokenSymbol,
    password?: string
  ) => Promise<{ success: boolean; hash?: string; message: string; networkExplorerUrl?: string }>;
  simulateSend: (recipient: string, amount: string, tokenSymbol: TokenSymbol) => Promise<{ success: boolean; message: string }>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeNetwork, setActiveNetwork] = useState<Network>(DEFAULT_NETWORK);
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(AppStorage.isDemoModeActive());

  // Comptes réels sauvegardés localement (métadonnées publiques uniquement, aucun secret)
  const [realAccounts, setRealAccounts] = useState<WalletAccount[]>(() => AppStorage.getAccounts());
  const [selectedRealAddress, setSelectedRealAddress] = useState<string | null>(() => AppStorage.getSelectedAccountAddress());

  // Compte actif
  const selectedAccount = isDemoMode
    ? DEMO_WALLET_ACCOUNT
    : (realAccounts.find((a) => a.address.toLowerCase() === selectedRealAddress?.toLowerCase()) || realAccounts[0] || null);

  const accounts = isDemoMode ? [DEMO_WALLET_ACCOUNT] : realAccounts;

  // Sécurité et Mot de passe
  const [isPasswordSet, setIsPasswordSet] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);

  // Synchronise l'état du mot de passe au montage
  useEffect(() => {
    const checkPassword = async () => {
      const hasPwd = await secureStorage.isPasswordSet();
      setIsPasswordSet(hasPwd);
      if (hasPwd) {
        setIsUnlocked(secureStorage.isUnlocked());
      } else {
        setIsUnlocked(true);
      }
    };
    checkPassword();
  }, []);

  // Préférences utilisateur
  const [settings, setSettingsState] = useState<UserSettings>(() => AppStorage.getSettings());

  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettingsState((prev) => {
      const updated: UserSettings = {
        ...prev,
        ...newSettings,
        security: {
          ...prev.security,
          ...(newSettings.security || {}),
        },
      };
      AppStorage.saveSettings(updated);
      return updated;
    });
  }, []);

  // Gestion de l'inactivité et du verrouillage automatique
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, updateActivity, { passive: true }));

    // Vérifie régulièrement le délai d'inactivité
    const checkInterval = setInterval(() => {
      const currentSettings = AppStorage.getSettings();
      const autoLockMinutes = currentSettings.security?.autoLockTimerMinutes ?? 5;

      // Si 0, le verrouillage automatique est désactivé ("jamais")
      if (autoLockMinutes > 0 && isUnlocked && isPasswordSet) {
        const autoLockMs = autoLockMinutes * 60 * 1000;
        if (Date.now() - lastActivityRef.current > autoLockMs) {
          secureStorage.lock();
          setIsUnlocked(false);
        }
      }
    }, 10000);

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, updateActivity));
      clearInterval(checkInterval);
    };
  }, [isUnlocked, isPasswordSet]);

  // États de connexion blockchain
  const [connectionState, setConnectionState] = useState<BlockchainConnectionState>('idle');
  const [activeRpcUrl, setActiveRpcUrl] = useState<string | null>(null);
  const [latestBlockNumber, setLatestBlockNumber] = useState<number | null>(null);
  const [connectionLatencyMs, setConnectionLatencyMs] = useState<number | null>(null);
  const [blockchainError, setBlockchainError] = useState<string | null>(null);

  // Soldes
  const [balance, setBalance] = useState<Balance>(() => {
    return isDemoMode ? getDemoBalance() : getEmptyRealBalance();
  });

  // Transactions (historique démo ou local réel)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return isDemoMode ? DEMO_TRANSACTIONS : AppStorage.getRealTransactions(selectedRealAddress || undefined);
  });

  // Test et vérification de la connexion au réseau BNB
  const checkConnection = useCallback(async () => {
    setConnectionState('loading');
    setBlockchainError(null);
    try {
      const checkResult = await blockchainService.checkNetworkConnection(activeNetwork);
      setConnectionState(checkResult.state);
      if (checkResult.isConnected) {
        setActiveRpcUrl(checkResult.activeRpc || activeNetwork.rpcUrl);
        setLatestBlockNumber(checkResult.blockNumber || null);
        setConnectionLatencyMs(checkResult.latencyMs || null);
        setBlockchainError(null);
      } else {
        setBlockchainError(checkResult.error || 'Connexion au nœud RPC BNB Smart Chain impossible');
      }
    } catch (err: unknown) {
      setConnectionState('error');
      setBlockchainError((err as Error)?.message || 'Erreur lors du test de connexion');
    }
  }, [activeNetwork]);

  // Lecture des soldes réels depuis la BNB Smart Chain
  const fetchRealBlockchainBalances = useCallback(async (account: WalletAccount, network: Network) => {
    setConnectionState('loading');
    setBlockchainError(null);

    // Marquer les actifs existants comme en cours de chargement pour un retour visuel immédiat
    setBalance((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => ({ ...a, isLoading: true })),
    }));

    try {
      const connectionCheck = await blockchainService.checkNetworkConnection(network);
      setConnectionState(connectionCheck.state);
      if (connectionCheck.isConnected) {
        setActiveRpcUrl(connectionCheck.activeRpc || network.rpcUrl);
        setLatestBlockNumber(connectionCheck.blockNumber || null);
        setConnectionLatencyMs(connectionCheck.latencyMs || null);
      }

      // Lecture en parallèle des soldes réels depuis la blockchain
      const usdtContract = network.isTestnet
        ? USDT_CONTRACT_ADDRESS_BSC_TESTNET
        : USDT_CONTRACT_ADDRESS_BSC_MAINNET;
      const isUsdtConfigured = Boolean(usdtContract);

      const [bnbBalanceResult, cdfBalanceResult, usdtBalanceResult] = await Promise.all([
        // 1. Solde natif BNB
        blockchainService.getNativeBalance(account.address, network),
        // 2. Solde officiel CDF (Contrat : 0x18e173fdeb700568a08d1d7049309ae322d27777)
        cdfTokenService.getBalance(account.address, network),
        // 3. USDT (uniquement si configuré officiellement)
        (async () => {
          if (!isUsdtConfigured || !usdtContract) {
            return {
              balance: '0',
              error: null,
              isConfigured: false,
              statusNote: 'En attente de déploiement officiel sur ce réseau (aucune adresse fictive)',
            };
          }
          try {
            const bal = await blockchainService.getTokenBalance(usdtContract, account.address, network, USDT_DECIMALS);
            return { balance: bal, error: null, isConfigured: true, statusNote: 'Contrat officiel BEP-20 vérifié' };
          } catch (err: unknown) {
            return {
              balance: '0',
              error: (err as Error)?.message || 'Erreur de lecture du contrat USDT',
              isConfigured: true,
              statusNote: 'Contrat officiel BEP-20 vérifié',
            };
          }
        })(),
      ]);

      // Calcul des actifs réels avec statut individuel
      const assets = calculateAssets(
        {
          BNB: bnbBalanceResult.balance,
          CDF: cdfBalanceResult.balance,
          USDT: usdtBalanceResult.balance,
        },
        network.name,
        {
          BNB: {
            error: bnbBalanceResult.error || null,
            isLoading: false,
          },
          CDF: {
            error: cdfBalanceResult.error || null,
            isLoading: false,
          },
          USDT: {
            error: usdtBalanceResult.error || null,
            isLoading: false,
            isConfigured: usdtBalanceResult.isConfigured,
            statusNote: usdtBalanceResult.statusNote,
          },
        }
      );
      const totalUsd = calculateTotalBalance(assets);

      setBalance({
        totalUsd,
        change24hUsd: 0,
        change24hPercentage: 0,
        assets,
        lastUpdated: Date.now(),
      });

      if (bnbBalanceResult.error && cdfBalanceResult.error) {
        setConnectionState('error');
        setBlockchainError(`Erreur de lecture réseau : ${bnbBalanceResult.error}`);
      } else {
        setConnectionState('connected');
      }
    } catch (err: unknown) {
      setConnectionState('error');
      setBlockchainError((err as Error)?.message || 'Erreur lors de la lecture des soldes réels');
      // Désactiver le chargement sur les actifs en cas d'erreur globale
      setBalance((prev) => ({
        ...prev,
        assets: prev.assets.map((a) => ({ ...a, isLoading: false, error: (err as Error)?.message })),
      }));
    }
  }, []);

  // Rafraîchissement des soldes
  const refreshBalances = useCallback(async () => {
    if (isDemoMode) {
      setBalance(getDemoBalance());
      setTransactions(DEMO_TRANSACTIONS);
      return;
    }

    if (selectedAccount) {
      await fetchRealBlockchainBalances(selectedAccount, activeNetwork);
    }
  }, [isDemoMode, selectedAccount, activeNetwork, fetchRealBlockchainBalances]);

  // Chargement automatique lors du changement de réseau ou de compte
  useEffect(() => {
    if (!isDemoMode && selectedAccount) {
      fetchRealBlockchainBalances(selectedAccount, activeNetwork);
    }
  }, [isDemoMode, selectedAccount, activeNetwork, fetchRealBlockchainBalances]);

  // Configuration du mode démo
  const setDemoMode = useCallback((active: boolean) => {
    setIsDemoModeState(active);
    AppStorage.setDemoMode(active);
    if (active) {
      setBalance(getDemoBalance());
      setTransactions(DEMO_TRANSACTIONS);
    } else {
      if (realAccounts.length > 0) {
        const acc = realAccounts.find((a) => a.address.toLowerCase() === selectedRealAddress?.toLowerCase()) || realAccounts[0];
        fetchRealBlockchainBalances(acc, activeNetwork);
        setTransactions(AppStorage.getRealTransactions(acc.address));
      } else {
        setBalance(getEmptyRealBalance());
        setTransactions([]);
      }
    }
  }, [realAccounts, selectedRealAddress, activeNetwork, fetchRealBlockchainBalances]);

  // Changement de réseau
  const switchNetwork = useCallback((networkId: string) => {
    const found = Object.values(SUPPORTED_NETWORKS).find((n) => n.id === networkId);
    if (found) {
      setActiveNetwork(found);
    }
  }, []);

  // Verrouillage du portefeuille
  const lockWallet = useCallback(() => {
    secureStorage.lock();
    setIsUnlocked(false);
  }, []);

  // Déverrouillage du portefeuille
  const unlockWallet = useCallback(async (password?: string): Promise<boolean> => {
    const hasPwd = await secureStorage.isPasswordSet();
    if (!hasPwd) {
      setIsUnlocked(true);
      return true;
    }

    if (!password) {
      // Si aucun mot de passe n'est fourni, on vérifie si la session est déjà ouverte
      if (secureStorage.isUnlocked()) {
        setIsUnlocked(true);
        return true;
      }
      return false;
    }

    const success = await secureStorage.unlock(password);
    if (success) {
      setIsUnlocked(true);
      lastActivityRef.current = Date.now();
      return true;
    }
    return false;
  }, []);

  // Configuration initiale du mot de passe local
  const setupWalletPassword = useCallback(async (password: string): Promise<void> => {
    await secureStorage.setupPassword(password);
    setIsPasswordSet(true);
    setIsUnlocked(true);
    lastActivityRef.current = Date.now();
  }, []);

  // Modification du mot de passe local existant
  const changeWalletPassword = useCallback(
    async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const ok = await secureStorage.changePassword(oldPassword, newPassword);
        if (!ok) {
          return { success: false, error: 'Ancien mot de passe incorrect.' };
        }
        setIsPasswordSet(true);
        setIsUnlocked(true);
        lastActivityRef.current = Date.now();
        return { success: true };
      } catch (err) {
        return { success: false, error: (err as Error).message || 'Erreur lors du changement de mot de passe.' };
      }
    },
    []
  );

  const selectAccount = useCallback((address: string) => {
    setSelectedRealAddress(address);
    AppStorage.setSelectedAccountAddress(address);
  }, []);

  // Création d'un portefeuille (génération locale sans transmission de secrets)
  const createNewWallet = useCallback(async (name?: string): Promise<{ account: WalletAccount; mnemonic: string }> => {
    const accountName = name || `Portefeuille ${realAccounts.length + 1}`;
    const generated = WalletCore.generateWallet(accountName, realAccounts.length);

    await secureStorage.saveWalletSecrets(generated.account.address, {
      mnemonic: generated.mnemonic,
      privateKey: generated.privateKey,
    });

    const updatedAccounts = [...realAccounts, generated.account];
    setRealAccounts(updatedAccounts);
    AppStorage.saveAccounts(updatedAccounts);
    setSelectedRealAddress(generated.account.address);
    AppStorage.setSelectedAccountAddress(generated.account.address);

    // Synchronisation exclusive des métadonnées publiques autorisées vers Supabase
    try {
      await supabaseService.syncWalletAccountMetadata({
        user_id: 'local-user',
        public_address: generated.account.address,
        network: activeNetwork.id,
        wallet_type: 'non-custodial',
        label: generated.account.name,
        created_at: new Date(generated.account.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[SupabaseSync] Non-bloquant :', e);
    }

    fetchRealBlockchainBalances(generated.account, activeNetwork);

    return {
      account: generated.account,
      mnemonic: generated.mnemonic,
    };
  }, [realAccounts, activeNetwork, fetchRealBlockchainBalances]);

  // Importation d'un portefeuille via seed phrase
  const importWalletFromPhrase = useCallback(async (phrase: string, name?: string): Promise<{ account: WalletAccount }> => {
    const accountName = name || `Importé ${realAccounts.length + 1}`;
    const restored = WalletCore.importFromMnemonic(phrase, accountName, realAccounts.length);

    await secureStorage.saveWalletSecrets(restored.account.address, {
      mnemonic: restored.mnemonic,
      privateKey: restored.privateKey,
    });

    const filtered = realAccounts.filter((a) => a.address.toLowerCase() !== restored.account.address.toLowerCase());
    const updatedAccounts = [...filtered, restored.account];
    setRealAccounts(updatedAccounts);
    AppStorage.saveAccounts(updatedAccounts);
    setSelectedRealAddress(restored.account.address);
    AppStorage.setSelectedAccountAddress(restored.account.address);

    // Synchronisation exclusive des métadonnées publiques autorisées vers Supabase
    try {
      await supabaseService.syncWalletAccountMetadata({
        user_id: 'local-user',
        public_address: restored.account.address,
        network: activeNetwork.id,
        wallet_type: 'non-custodial',
        label: restored.account.name,
        created_at: new Date(restored.account.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[SupabaseSync] Non-bloquant :', e);
    }

    fetchRealBlockchainBalances(restored.account, activeNetwork);

    return { account: restored.account };
  }, [realAccounts, activeNetwork, fetchRealBlockchainBalances]);

  // Importation d'un portefeuille via clé privée
  const importWalletFromPrivateKey = useCallback(async (privateKey: string, name?: string): Promise<{ account: WalletAccount }> => {
    const accountName = name || `Clé Privée ${realAccounts.length + 1}`;
    const restored = WalletCore.importFromPrivateKey(privateKey, accountName);

    await secureStorage.saveWalletSecrets(restored.account.address, {
      privateKey: restored.privateKey,
    });

    const filtered = realAccounts.filter((a) => a.address.toLowerCase() !== restored.account.address.toLowerCase());
    const updatedAccounts = [...filtered, restored.account];
    setRealAccounts(updatedAccounts);
    AppStorage.saveAccounts(updatedAccounts);
    setSelectedRealAddress(restored.account.address);
    AppStorage.setSelectedAccountAddress(restored.account.address);

    // Synchronisation exclusive des métadonnées publiques autorisées vers Supabase
    try {
      await supabaseService.syncWalletAccountMetadata({
        user_id: 'local-user',
        public_address: restored.account.address,
        network: activeNetwork.id,
        wallet_type: 'non-custodial',
        label: restored.account.name,
        created_at: new Date(restored.account.createdAt).toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[SupabaseSync] Non-bloquant :', e);
    }

    fetchRealBlockchainBalances(restored.account, activeNetwork);

    return { account: restored.account };
  }, [realAccounts, activeNetwork, fetchRealBlockchainBalances]);

  const revealMnemonic = useCallback(async (address: string): Promise<string | null> => {
    if (!isUnlocked) {
      return null;
    }
    return secureStorage.getWalletMnemonic(address);
  }, [isUnlocked]);

  const removeAccount = useCallback(async (address: string): Promise<void> => {
    await secureStorage.removeWalletSecrets(address);
    const updated = realAccounts.filter((a) => a.address.toLowerCase() !== address.toLowerCase());
    setRealAccounts(updated);
    AppStorage.saveAccounts(updated);
    if (selectedRealAddress?.toLowerCase() === address.toLowerCase()) {
      const nextAddr = updated.length > 0 ? updated[0].address : null;
      setSelectedRealAddress(nextAddr);
      AppStorage.setSelectedAccountAddress(nextAddr);
    }
  }, [realAccounts, selectedRealAddress]);

  // Simulation d'envoi en mode Démo
  const simulateSend = useCallback(async (
    recipient: string,
    amount: string,
    tokenSymbol: TokenSymbol
  ): Promise<{ success: boolean; message: string }> => {
    const newTx: Transaction = {
      id: `sim-tx-${Date.now()}`,
      hash: `0xsim${Math.random().toString(16).substring(2, 40)}`,
      type: 'send',
      status: 'confirmed',
      tokenSymbol,
      amount,
      usdValue: parseFloat(amount) * (tokenSymbol === 'BNB' ? 590.25 : tokenSymbol === 'USDT' ? 1 : 0.00035),
      fromAddress: DEMO_WALLET_ACCOUNT.address,
      toAddress: recipient,
      timestamp: Date.now(),
      networkId: activeNetwork.id,
      isDemoData: true,
      note: 'Simulation locale (Mode Démo : aucune transaction réelle)',
    };

    setTransactions((prev) => [newTx, ...prev]);

    return {
      success: true,
      message: 'Simulation d’envoi réussie (Mode Démonstration : aucune écriture sur la blockchain réelle).',
    };
  }, [activeNetwork.id]);

  // Transfert sécurisé non-custodial (BNB natif ou jeton CDF officiel sur BNB Smart Chain)
  const sendTransfer = useCallback(async (
    recipient: string,
    amount: string,
    tokenSymbol: TokenSymbol,
    password?: string
  ): Promise<{ success: boolean; hash?: string; message: string; networkExplorerUrl?: string }> => {
    if (isDemoMode) {
      return {
        success: false,
        message: 'Mode Démonstration actif : l’envoi réel sur la blockchain est désactivé. Aucune signature on-chain n’a été exécutée.',
      };
    }

    if (!selectedAccount) {
      return {
        success: false,
        message: 'Aucun compte actif sélectionné pour effectuer le transfert.',
      };
    }

    // Exécution sécurisée non-custodiale via transactionService
    const res = await transactionService.executeSend({
      recipient,
      amount,
      tokenSymbol,
      network: activeNetwork,
      senderAddress: selectedAccount.address,
      isDemoMode: false,
      userPassword: password,
    });

    if (res.success && res.hash) {
      const txItem: Transaction = {
        id: `tx-${Date.now()}`,
        hash: res.hash,
        type: 'send',
        status: 'pending',
        tokenSymbol,
        amount,
        usdValue: parseFloat(amount) * (tokenSymbol === 'BNB' ? 590.25 : tokenSymbol === 'USDT' ? 1 : 0.00035),
        fromAddress: selectedAccount.address,
        toAddress: recipient,
        timestamp: Date.now(),
        fee: res.gasFeeBnb,
        networkId: activeNetwork.id,
        isDemoData: false,
        note: `Transfert ${tokenSymbol} sur BNB Smart Chain`,
      };

      setTransactions((prev) => [txItem, ...prev]);
      AppStorage.saveRealTransaction(txItem);

      // Suivi de confirmation on-chain sur BNB Smart Chain
      const txHash = res.hash;
      transactionService.waitForConfirmation(txHash, activeNetwork).then((confirmResult) => {
        const finalStatus: TransactionStatus = confirmResult.confirmed ? 'confirmed' : 'failed';
        setTransactions((prev) =>
          prev.map((t) => (t.hash === txHash ? { ...t, status: finalStatus } : t))
        );
        AppStorage.updateRealTransactionStatus(txHash, finalStatus);

        // Mettre à jour Supabase si configuré
        supabaseService.syncTransactionMetadata({
          user_id: 'local-user',
          tx_hash: txHash,
          from_address: selectedAccount.address,
          to_address: recipient,
          token_symbol: tokenSymbol,
          amount,
          network: activeNetwork.name,
          chain_id: activeNetwork.chainId,
          status: finalStatus,
          created_at: new Date().toISOString(),
        }).catch(() => {});

        // Actualisation immédiate du solde on-chain après confirmation
        if (confirmResult.confirmed) {
          fetchRealBlockchainBalances(selectedAccount, activeNetwork);
        }
      });
    }

    return {
      success: res.success,
      hash: res.hash,
      message: res.message,
      networkExplorerUrl: res.networkExplorerUrl,
    };
  }, [isDemoMode, selectedAccount, activeNetwork, fetchRealBlockchainBalances]);

  return (
    <WalletContext.Provider
      value={{
        activeNetwork,
        switchNetwork,
        selectedAccount,
        accounts,
        realAccounts,
        balance,
        transactions,
        isDemoMode,
        setDemoMode,
        isPasswordSet,
        isUnlocked,
        lockWallet,
        unlockWallet,
        setupWalletPassword,
        changeWalletPassword,
        refreshBalances,
        settings,
        updateSettings,
        connectionState,
        activeRpcUrl,
        latestBlockNumber,
        connectionLatencyMs,
        blockchainError,
        checkConnection,
        createNewWallet,
        importWalletFromPhrase,
        importWalletFromPrivateKey,
        revealMnemonic,
        removeAccount,
        selectAccount,
        sendTransfer,
        simulateSend,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet doit être utilisé à l’intérieur d’un WalletProvider');
  }
  return context;
}
