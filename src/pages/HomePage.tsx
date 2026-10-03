import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { useNotifications } from '../notifications';
import { AppStorage } from '../storage';
import { formatFiatValue, formatAddress } from '../blockchain/utils';
import { ActionButtons } from '../components/ActionButtons';
import { AssetCard } from '../components/AssetCard';
import { CopyButton } from '../components/CopyButton';
import { KycModal } from '../components/KycModal';
import { AiAssistantModal } from '../components/AiAssistantModal';
import {
  Eye,
  EyeOff,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  QrCode,
  Wallet as WalletIcon,
  Settings,
  Bell,
  Plus,
  Bot,
  AlertCircle,
} from 'lucide-react';
import { Asset } from '../types';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const { balance, transactions, selectedAccount, isDemoMode, refreshBalances } = useWallet();
  const { unreadNotificationsCount } = useNotifications();
  const [hideBalances, setHideBalances] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showKycModal, setShowKycModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalances();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const recentTransactions = transactions.slice(0, 3);
  const isPositiveChange = balance.change24hPercentage >= 0;

  // Spécification Section 3.5 : CDF en premier dans la liste des cryptos
  const sortedAssets = [...balance.assets].sort((a, b) => {
    if (a.token.symbol === 'CDF') return -1;
    if (b.token.symbol === 'CDF') return 1;
    return 0;
  });

  // Plafond mensuel
  const limitInfo = AppStorage.getMonthlySpentInfo(selectedAccount?.address);
  const userProfile = AppStorage.getUserProfile();

  return (
    <div className="space-y-6">
      {/* 1. CARTE SOLDE TOTAL (Trust Wallet style) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top header row */}
          <div className="flex items-center justify-between gap-2 text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
                Solde Consolidé
              </span>
              <button
                type="button"
                onClick={() => setHideBalances(!hideBalances)}
                className="hover:text-white transition-colors cursor-pointer p-1"
                title={hideBalances ? 'Afficher les soldes' : 'Masquer les soldes'}
              >
                {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedAccount && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 font-mono text-[11px] text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{formatAddress(selectedAccount.address, 3)}</span>
                  <CopyButton textToCopy={selectedAccount.address} iconOnly />
                </div>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                title="Actualiser les soldes"
                className="p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-400 hover:text-white cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Big Balance Number */}
          <div className="mt-3">
            <div className="text-3xl sm:text-5xl font-extrabold tracking-tight font-sans">
              {hideBalances ? '••••••••' : formatFiatValue(balance.totalUsd)}
            </div>

            {/* 24h Variation */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md ${
                  isPositiveChange
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {isPositiveChange ? '+' : ''}
                {balance.change24hPercentage.toFixed(2)}% (24h)
              </span>
              <span className="text-xs text-slate-400">
                {hideBalances ? '••••' : `≈ ${isPositiveChange ? '+' : ''}${formatFiatValue(balance.change24hUsd)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BOUTONS D'ACTIONS (Envoyer, Recevoir, Acheter/Vendre, Swap, Scanner) */}
      <ActionButtons onNavigate={onNavigate} />

      {/* BANNIÈRE PLAFOND MENSUEL & IDENTITÉ (Spécification Section 2 & 3.4) */}
      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${limitInfo.isVerified ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>Plafond mensuel de sortie :</span>
              <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                {limitInfo.remainingUsd.toFixed(2)} $ restant
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {limitInfo.isVerified
                ? 'Identité vérifiée (Plafond max. 200 000 $ / mois)'
                : 'Identité non vérifiée (Plafond 500 $ / mois)'}
            </div>
          </div>
        </div>

        {!limitInfo.isVerified && (
          <button
            type="button"
            onClick={() => setShowKycModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer shadow-xs"
          >
            Vérifier
          </button>
        )}
      </div>

      {/* 3. LISTE « MES CRYPTOS » (CDF en premier, puis les autres, et Ajouter une crypto) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Mes cryptos
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            BNB Smart Chain
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {sortedAssets.map((asset) => (
            <AssetCard
              key={asset.token.symbol}
              asset={asset}
              onSelect={() => onNavigate('/wallet')}
              onSend={() => {
                try {
                  sessionStorage.setItem('cdf_send_selected_token', asset.token.symbol);
                } catch {}
                onNavigate('/send');
              }}
              onReceive={() => {
                try {
                  sessionStorage.setItem('cdf_receive_selected_token', asset.token.symbol);
                } catch {}
                onNavigate('/receive');
              }}
              onRefresh={handleRefresh}
            />
          ))}
        </div>

        {/* Bouton « Ajouter une crypto » (Exigence Section 3.5) */}
        <button
          type="button"
          onClick={() => onNavigate('/wallet')}
          className="w-full py-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-amber-500/60 hover:text-amber-500 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter une crypto (BEP-20)</span>
        </button>
      </div>

      {/* 4. DERNIÈRES TRANSACTIONS */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Dernières Transactions
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('/activity')}
            className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            Voir tout
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 shadow-sm overflow-hidden">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                onClick={() => onNavigate('/activity')}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'receive' || tx.type === 'buy'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {tx.type === 'receive' || tx.type === 'buy' ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900 dark:text-white capitalize">
                        {tx.type === 'receive'
                          ? 'Reçu'
                          : tx.type === 'send'
                          ? 'Envoyé'
                          : tx.type === 'buy'
                          ? 'Achat'
                          : tx.type === 'sell'
                          ? 'Vente'
                          : tx.type === 'swap'
                          ? 'Swap'
                          : 'Paiement QR'}{' '}
                        {tx.tokenSymbol}
                      </span>
                      {tx.isDemoData && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          Démo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(tx.timestamp).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-sm font-bold font-mono ${
                      tx.type === 'receive' || tx.type === 'buy'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {tx.type === 'receive' || tx.type === 'buy' ? '+' : '-'}
                    {tx.amount} {tx.tokenSymbol}
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    {formatFiatValue(tx.usdValue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 text-xs text-slate-400">
            Aucune transaction récente enregistrée.
          </div>
        )}
      </div>

      {/* BOUTON ASSISTANT IA FLOTTANT */}
      <div className="fixed bottom-20 md:bottom-6 left-4 z-40">
        <button
          type="button"
          onClick={() => setShowAiModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-amber-500 text-slate-950 shadow-lg text-xs font-bold transition-all cursor-pointer hover:scale-105"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">Assistant IA</span>
        </button>
      </div>

      {/* Modals KYC & Assistant IA */}
      <KycModal
        isOpen={showKycModal}
        onClose={() => setShowKycModal(false)}
        onSuccess={() => handleRefresh()}
      />

      <AiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
};
