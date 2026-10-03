import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { formatAddress, formatCryptoAmount, formatFiatValue } from '../blockchain/utils';
import { CopyButton } from '../components/CopyButton';
import { AssetCard } from '../components/AssetCard';
import { CreateWalletModal } from '../components/CreateWalletModal';
import { ImportWalletModal } from '../components/ImportWalletModal';
import { UnlockWalletModal } from '../components/UnlockWalletModal';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS, CDF_TOKEN_SYMBOL, CDF_TOKEN_NAME, USDT_CONTRACT_ADDRESS_BSC_MAINNET } from '../config/tokens';
import { blockchainService } from '../blockchain/provider';
import { cdfTokenService } from '../services/cdfTokenService';
import { securityManager } from '../security';
import {
  Wallet,
  Shield,
  ShieldCheck,
  ExternalLink,
  Plus,
  Key,
  Globe,
  Layers,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  Wifi,
  WifiOff,
  Search,
  Activity,
  Cpu,
} from 'lucide-react';

interface WalletPageProps {
  onNavigate: (route: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ onNavigate }) => {
  const {
    selectedAccount,
    accounts,
    realAccounts,
    activeNetwork,
    balance,
    isDemoMode,
    setDemoMode,
    refreshBalances,
    connectionState,
    activeRpcUrl,
    latestBlockNumber,
    connectionLatencyMs,
    blockchainError,
    checkConnection,
    revealMnemonic,
    removeAccount,
    selectAccount,
    isPasswordSet,
    isUnlocked,
    lockWallet,
    settings,
    updateSettings,
  } = useWallet();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockPendingAction, setUnlockPendingAction] = useState<(() => void) | null>(null);

  const [showSeedModal, setShowSeedModal] = useState(false);
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);
  const [isLoadingSeed, setIsLoadingSeed] = useState(false);

  // Inspector modal (Consulter une adresse tierce sur BSC en lecture seule)
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [inspectAddress, setInspectAddress] = useState('');
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState<{
    address: string;
    bnbBalance: string;
    cdfBalance: string;
    error?: string;
  } | null>(null);

  const bnbAsset = balance.assets.find((a) => a.token.symbol === 'BNB');
  const cdfAsset = balance.assets.find((a) => a.token.symbol === 'CDF');
  const usdtAsset = balance.assets.find((a) => a.token.symbol === 'USDT');

  const handleRefresh = async () => {
    await refreshBalances();
  };

  const handleOpenSeedModal = async () => {
    if (!selectedAccount) return;

    if (isPasswordSet && !isUnlocked) {
      setUnlockPendingAction(() => async () => {
        setIsLoadingSeed(true);
        setShowSeedModal(true);
        try {
          const seed = await revealMnemonic(selectedAccount.address);
          setRevealedSeed(seed);
        } catch {
          setRevealedSeed(null);
        } finally {
          setIsLoadingSeed(false);
        }
      });
      setShowUnlockModal(true);
      return;
    }

    setIsLoadingSeed(true);
    setShowSeedModal(true);
    try {
      const seed = await revealMnemonic(selectedAccount.address);
      setRevealedSeed(seed);
    } catch {
      setRevealedSeed(null);
    } finally {
      setIsLoadingSeed(false);
    }
  };

  const handleInspectAddress = async () => {
    const clean = inspectAddress.trim();
    if (!securityManager.validateAddress(clean)) {
      setInspectResult({
        address: clean,
        bnbBalance: '0.0',
        cdfBalance: '0.0',
        error: 'Adresse EVM invalide (doit commencer par 0x et comporter 40 caractères hexadécimaux).',
      });
      return;
    }

    setInspectLoading(true);
    setInspectResult(null);
    try {
      const [bnbRes, cdfRes] = await Promise.all([
        blockchainService.getNativeBalance(clean, activeNetwork),
        cdfTokenService.getBalance(clean, activeNetwork),
      ]);

      setInspectResult({
        address: clean,
        bnbBalance: bnbRes.balance,
        cdfBalance: cdfRes.balance,
        error: bnbRes.error || cdfRes.error,
      });
    } catch (err: unknown) {
      setInspectResult({
        address: clean,
        bnbBalance: '0.0',
        cdfBalance: '0.0',
        error: (err as Error)?.message || 'Erreur de lecture sur la blockchain',
      });
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Portefeuille Non-Custodial</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Connexion directe à BNB Smart Chain, soldes réels BNB & CDF — Franc Congolais
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPasswordSet && (
            <button
              type="button"
              id="btn-toggle-wallet-lock"
              onClick={() => {
                if (isUnlocked) {
                  lockWallet();
                } else {
                  setShowUnlockModal(true);
                }
              }}
              title={isUnlocked ? 'Verrouiller le portefeuille' : 'Déverrouiller le portefeuille'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                isUnlocked
                  ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              {isUnlocked ? <Unlock className="w-3.5 h-3.5 text-emerald-500" /> : <Lock className="w-3.5 h-3.5 text-amber-500" />}
              <span className="hidden sm:inline">{isUnlocked ? 'Déverrouillé' : 'Déverrouiller'}</span>
            </button>
          )}

          <button
            type="button"
            id="btn-test-connection"
            onClick={checkConnection}
            title="Tester et mesurer la connexion RPC BNB Smart Chain"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Tester Connexion</span>
          </button>

          <button
            type="button"
            id="btn-inspect-address"
            onClick={() => setShowInspectModal(true)}
            title="Consulter le solde on-chain de n'importe quelle adresse"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Inspecter Adresse</span>
          </button>

          <button
            type="button"
            onClick={handleRefresh}
            title="Actualiser les soldes"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${connectionState === 'loading' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualiser</span>
          </button>

          <button
            type="button"
            id="btn-add-account"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Compte</span>
          </button>
        </div>
      </div>

      {/* BANDEAU D'ÉTAT DE CONNEXION BLOCKCHAIN */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
            connectionState === 'connected'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : connectionState === 'loading'
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : connectionState === 'error'
              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {connectionState === 'connected' ? (
              <Wifi className="w-5 h-5" />
            ) : connectionState === 'loading' ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">État Blockchain :</span>
              {connectionState === 'loading' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Chargement...
                </span>
              )}
              {connectionState === 'connected' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Connecté
                </span>
              )}
              {connectionState === 'error' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Erreur RPC
                </span>
              )}
              {connectionState === 'idle' && (
                <span className="text-xs text-slate-500">Prêt</span>
              )}
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Réseau : <strong className="text-slate-800 dark:text-slate-200">{activeNetwork.name}</strong> (Chain ID {activeNetwork.chainId})
              {latestBlockNumber && (
                <span className="ml-2">| Bloc #{latestBlockNumber.toLocaleString('fr-FR')}</span>
              )}
              {connectionLatencyMs && (
                <span className="ml-2">| Latence : {connectionLatencyMs} ms</span>
              )}
            </div>
          </div>
        </div>

        {/* Mode switcher (Démo vs Réel) */}
        <div className="flex items-center gap-2 ml-auto">
          <div className="text-right">
            <div className="text-[10px] text-slate-400">Mode de fonctionnement</div>
            <div className="text-xs font-bold">
              {isDemoMode ? (
                <span className="text-amber-600 dark:text-amber-400">Mode Démonstration</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400">Mode Blockchain Réelle</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDemoMode(!isDemoMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isDemoMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                : 'bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-400'
            }`}
          >
            {isDemoMode ? 'Passer en Mode Réel' : 'Activer Mode Démo'}
          </button>
        </div>
      </div>

      {blockchainError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Avertissement réseau : </span>
            <span>{blockchainError}</span>
          </div>
          <button
            type="button"
            onClick={checkConnection}
            className="text-[11px] font-bold text-rose-600 dark:text-rose-400 underline hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 1. INDICATION VISUELLE DU VERROUILLAGE DU PORTEFEUILLE */}
      {isPasswordSet && !isUnlocked && (
        <div
          id="wallet-locked-banner"
          className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 text-xs shadow-sm"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 ring-1 ring-amber-500/30">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-amber-950 dark:text-amber-200 text-sm sm:text-base flex items-center gap-2">
                <span>Portefeuille Localement Verrouillé</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-800 dark:text-amber-300">
                  Sécurité Chiffrée
                </span>
              </div>
              <div className="text-amber-900/80 dark:text-amber-300/80 text-xs mt-1 max-w-2xl leading-relaxed">
                Vos clés privées restent chiffrées en AES-256 dans votre navigateur. Les soldes réels de la <strong>BNB Smart Chain</strong> sont consultables en lecture publique. Déverrouillez avec votre mot de passe pour signer des transactions.
              </div>
            </div>
          </div>
          <button
            type="button"
            id="btn-unlock-banner"
            onClick={() => setShowUnlockModal(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer inline-flex items-center gap-2 ml-auto"
          >
            <Unlock className="w-4 h-4" />
            <span>Déverrouiller le portefeuille</span>
          </button>
        </div>
      )}

      {isPasswordSet && isUnlocked && (
        <div
          id="wallet-unlocked-banner"
          className="p-3.5 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-xs"
        >
          <div className="flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 font-semibold">
            <Unlock className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Portefeuille Déverrouillé — Clés privées actives en mémoire locale sécurisée pour la session</span>
          </div>
          <button
            type="button"
            id="btn-lock-now"
            onClick={lockWallet}
            className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline font-bold text-xs cursor-pointer ml-auto"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Verrouiller maintenant</span>
          </button>
        </div>
      )}

      {/* 2. TABLEAU DE BORD PRINCIPAL DU PORTEFEUILLE */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* En-tête : Nom, badges, mode et valeur totale */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg ring-1 ring-amber-500/20 shadow-inner">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 dark:text-white text-lg sm:text-xl tracking-tight">
                  {selectedAccount?.name || 'Portefeuille Non-Custodial'}
                </span>
                {isDemoMode ? (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    Mode Démo
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    Mode Réel On-Chain
                  </span>
                )}
                {isPasswordSet && (
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isUnlocked
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {isUnlocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                    {isUnlocked ? 'Déverrouillé' : 'Verrouillé'}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                Réseau : <strong className="text-slate-800 dark:text-slate-200">BNB Smart Chain</strong> ({activeNetwork.name} · Chain ID {activeNetwork.chainId})
              </div>
            </div>
          </div>

          {/* Solde Total Consolidé */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5 text-xs text-slate-400 font-semibold tracking-wide">
              <span>Solde Total Consolidé</span>
              <button
                type="button"
                id="btn-toggle-balance-visibility"
                onClick={() => updateSettings({ hideBalances: !settings.hideBalances })}
                title={settings.hideBalances ? 'Afficher les soldes' : 'Masquer les soldes (Mode Confidentialité)'}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
              >
                {settings.hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white font-mono mt-0.5">
              {formatFiatValue(balance.totalUsd, settings.currency, settings.hideBalances)}
            </div>
          </div>
        </div>

        {/* Adresse Publique EVM et Bouton Copier l'Adresse */}
        {selectedAccount ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                Adresse Publique EVM (BNB Smart Chain)
              </span>
              <span className="text-[10px] font-mono text-slate-400">{selectedAccount.derivationPath || "m/44'/60'/0'/0/0"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 break-all select-all">
                {selectedAccount.address}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <CopyButton textToCopy={selectedAccount.address} label="Copier l'adresse" />
                <a
                  href={`${activeNetwork.blockExplorerUrl}/address/${selectedAccount.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Consulter l'adresse sur BscScan"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors shadow-2xs"
                >
                  <span>BscScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Aucun compte configuré. Vous pouvez créer un portefeuille, en importer un ou inspecter n'importe quelle adresse publique.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all cursor-pointer"
              >
                Créer un portefeuille
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Importer une seed phrase
              </button>
            </div>
          </div>
        )}

        {/* Boutons d'Action Principaux : Envoyer, Recevoir, Actualiser, Inspecter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <button
            type="button"
            id="btn-dashboard-send"
            onClick={() => onNavigate('/send')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer group"
          >
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span>Envoyer</span>
          </button>

          <button
            type="button"
            id="btn-dashboard-receive"
            onClick={() => onNavigate('/receive')}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer group"
          >
            <ArrowDownLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 group-hover:translate-y-0.5" />
            <span>Recevoir</span>
          </button>

          <button
            type="button"
            id="btn-dashboard-refresh"
            onClick={handleRefresh}
            disabled={connectionState === 'loading'}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-amber-500 ${connectionState === 'loading' ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>

          <button
            type="button"
            id="btn-dashboard-inspect"
            onClick={() => setShowInspectModal(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-800 dark:text-slate-100 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>Inspecter BSC</span>
          </button>
        </div>

        {/* Aperçu Récapitulatif des 3 Soldes Réels du Tableau de Bord */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Solde BNB Réel */}
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/15">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
              <span>Solde BNB Réel</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">Gas</span>
            </div>
            <div className="font-mono font-extrabold text-slate-900 dark:text-white text-base sm:text-lg mt-1">
              {formatCryptoAmount(bnbAsset?.balance || '0', 4, settings.hideBalances)}{' '}
              <span className="text-xs font-sans font-medium text-slate-400">BNB</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              ≈ {formatFiatValue(bnbAsset?.estimatedUsdValue || 0, settings.currency, settings.hideBalances)}
            </div>
          </div>

          {/* Solde CDF Réel */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
              <span>Solde CDF Réel</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">RDC Officiel</span>
            </div>
            <div className="font-mono font-extrabold text-emerald-950 dark:text-emerald-200 text-base sm:text-lg mt-1">
              {formatCryptoAmount(cdfAsset?.balance || '0', 4, settings.hideBalances)}{' '}
              <span className="text-xs font-sans font-medium text-slate-400">CDF</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              ≈ {formatFiatValue(cdfAsset?.estimatedUsdValue || 0, settings.currency, settings.hideBalances)}
            </div>
          </div>

          {/* Solde USDT Réel ou Statut Préparé */}
          <div className="p-3.5 rounded-2xl bg-teal-500/5 border border-teal-500/20">
            <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 font-semibold text-[11px]">
              <span>Solde USDT</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-800 dark:text-teal-300 font-bold">
                {usdtAsset?.isConfigured === false ? 'Testnet' : 'Mainnet'}
              </span>
            </div>
            <div className="font-mono font-extrabold text-teal-950 dark:text-teal-200 text-base sm:text-lg mt-1">
              {formatCryptoAmount(usdtAsset?.balance || '0', 4, settings.hideBalances)}{' '}
              <span className="text-xs font-sans font-medium text-slate-400">USDT</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
              ≈ {formatFiatValue(usdtAsset?.estimatedUsdValue || 0, settings.currency, settings.hideBalances)}
            </div>
          </div>
        </div>

        {/* Gestion du compte (Seed Phrase et suppression de compte local) */}
        {selectedAccount && !isDemoMode && (
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <button
              type="button"
              id="btn-reveal-seed-phrase"
              onClick={handleOpenSeedModal}
              className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline font-semibold cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>Afficher ma Seed Phrase (12 mots)</span>
            </button>

            {realAccounts.length > 1 && (
              <button
                type="button"
                onClick={() => removeAccount(selectedAccount.address)}
                className="inline-flex items-center gap-1.5 text-rose-500 hover:underline font-semibold cursor-pointer ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Retirer ce compte local</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. SECTION : CARTES SÉPARÉES POUR BNB, CDF ET USDT */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              <span>Actifs & Soldes Réels sur BNB Smart Chain</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Soldes synchronisés directement depuis la blockchain ({activeNetwork.name})
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            title="Rafraîchir les soldes on-chain"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${connectionState === 'loading' ? 'animate-spin' : ''}`} />
            <span>Actualiser les actifs</span>
          </button>
        </div>

        {/* Rendu des Cartes Séparées pour BNB, CDF, USDT */}
        <div className="grid grid-cols-1 gap-3.5">
          {balance.assets.map((asset) => (
            <AssetCard
              key={asset.token.symbol}
              asset={asset}
              onSend={(tokenSymbol) => {
                try {
                  sessionStorage.setItem('cdf_send_selected_token', tokenSymbol);
                } catch {}
                onNavigate('/send');
              }}
              onReceive={(tokenSymbol) => {
                try {
                  sessionStorage.setItem('cdf_receive_selected_token', tokenSymbol);
                } catch {}
                onNavigate('/receive');
              }}
              onRefresh={handleRefresh}
            />
          ))}
        </div>

        {/* Note USDT : Préparation soignée sans invention d'adresse fictive */}
        <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
          <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-slate-700 dark:text-slate-200">Architecture & Configuration Officielle USDT BEP-20 :</span>
            <p>
              Sur <strong>BNB Smart Chain Mainnet</strong>, le contrat officiel Tether USD est vérifié ({USDT_CONTRACT_ADDRESS_BSC_MAINNET}). Sur le <strong>Testnet BSC</strong>, l'affichage et la structure technique sont entièrement préparés sans inventer d'adresse de contrat fictive afin de préserver l'intégrité absolue des données.
            </p>
          </div>
        </div>
      </div>

      {/* 4. FOCUS SPÉCIAL : CONTRAT OFFICIEL CDF — FRANC CONGOLAIS */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Spécifications Officielles : Token CDF — Franc Congolais
            </h3>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
            Source Unique
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <div className="text-slate-400 text-[11px]">Contrat BEP-20 (BNB Smart Chain)</div>
            <div className="font-mono font-bold text-slate-900 dark:text-white break-all mt-0.5">
              {CDF_CONTRACT_ADDRESS}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <CopyButton textToCopy={CDF_CONTRACT_ADDRESS} label="Copier le contrat" />
              <a
                href={`${activeNetwork.blockExplorerUrl}/token/${CDF_CONTRACT_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                BscScan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Symbole officiel :</span>
              <strong className="text-slate-900 dark:text-white">{CDF_TOKEN_SYMBOL}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Nom complet :</span>
              <strong className="text-slate-900 dark:text-white">{CDF_TOKEN_NAME}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Décimales :</span>
              <strong className="text-slate-900 dark:text-white">{CDF_DECIMALS}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Réseau :</span>
              <strong className="text-slate-900 dark:text-white">{activeNetwork.name}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CRÉATION DE PORTEFEUILLE GUIDÉE EN FRANÇAIS */}
      <CreateWalletModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          refreshBalances();
        }}
      />

      {/* MODAL IMPORTATION DE PORTEFEUILLE SÉCURISÉE */}
      <ImportWalletModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          refreshBalances();
        }}
      />

      {/* MODAL DÉVERROUILLAGE DU PORTEFEUILLE */}
      <UnlockWalletModal
        isOpen={showUnlockModal}
        onClose={() => {
          setShowUnlockModal(false);
          setUnlockPendingAction(null);
        }}
        onSuccess={() => {
          setShowUnlockModal(false);
          if (unlockPendingAction) {
            unlockPendingAction();
            setUnlockPendingAction(null);
          }
        }}
      />

      {/* MODAL RÉVÉLATION DE LA PHRASE SECRÈTE */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Lock className="w-4 h-4" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Phrase de Récupération Secrète
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Ne partagez JAMAIS cette phrase. Toute personne en possession de ces 12 mots a un contrôle total et irréversible sur vos actifs BNB et CDF.
              </span>
            </div>

            {isLoadingSeed ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                Lecture sécurisée en mémoire locale...
              </div>
            ) : revealedSeed ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-mono">
                  {revealedSeed.split(' ').map((w, i) => (
                    <div key={i} className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 select-none">{i + 1}.</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{w}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <CopyButton textToCopy={revealedSeed} label="Copier la phrase secrète" />
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400">
                Ce compte a été importé directement via clé privée (sans seed phrase) ou la session est verrouillée.
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSeedModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSPECTION D'ADRESSE ON-CHAIN (LECTURE SEULE STRICTEMENT NON-CUSTODIALE) */}
      {showInspectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Search className="w-4 h-4" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Inspecter une Adresse sur BSC
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowInspectModal(false);
                  setInspectResult(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Interrogez directement la blockchain pour vérifier en temps réel les soldes BNB et CDF d'une adresse publique EVM, sans aucune clé privée.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Adresse Publique EVM (0x...)
              </label>
              <input
                type="text"
                placeholder="0x..."
                value={inspectAddress}
                onChange={(e) => setInspectAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {inspectResult && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-semibold text-slate-700 dark:text-slate-300">
                  Résultats sur {activeNetwork.name} :
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solde BNB Natif :</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{inspectResult.bnbBalance} BNB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Solde CDF — Franc Congolais :</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{inspectResult.cdfBalance} CDF</span>
                </div>
                {inspectResult.error && (
                  <div className="text-[11px] text-rose-500 pt-1 border-t border-slate-200 dark:border-slate-700">
                    {inspectResult.error}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowInspectModal(false);
                  setInspectResult(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={inspectLoading || !inspectAddress.trim()}
                onClick={handleInspectAddress}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
              >
                {inspectLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Lire la Blockchain</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
