/**
 * ActivityPage — CDF Wallet
 * 
 * Spécification Section 3.11 & 11 :
 * - Filtres : Tout, Envois, Réceptions, Achats et ventes, Swaps, Paiements QR.
 * - Chaque ligne : type, montant, statut (terminé, en cours, échoué).
 * - Détail de transaction : date, frais, réseau BNB Smart Chain, référence / hash (avec lien BscScan si hash réel).
 */

import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { Transaction, TransactionType } from '../types';
import { formatAddress, formatCryptoAmount, formatFiatValue } from '../blockchain/utils';
import { CopyButton } from '../components/CopyButton';
import {
  History,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ShoppingCart,
  QrCode,
  ExternalLink,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Tag,
  ShieldCheck,
} from 'lucide-react';

type ActivityFilter = 'ALL' | 'send' | 'receive' | 'buy_sell' | 'swap' | 'qr_payment';

export const ActivityPage: React.FC = () => {
  const { transactions, activeNetwork, isDemoMode } = useWallet();
  const [filterType, setFilterType] = useState<ActivityFilter>('ALL');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const filtered = transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'buy_sell') return tx.type === 'buy' || tx.type === 'sell';
    return tx.type === filterType;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Terminé</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3 animate-spin" />
            <span>En cours</span>
          </span>
        );
      case 'failed':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-3 h-3" />
            <span>Échoué</span>
          </span>
        );
    }
  };

  const getTypeLabel = (type: TransactionType) => {
    switch (type) {
      case 'send':
        return 'Envoi';
      case 'receive':
        return 'Réception';
      case 'swap':
        return 'Échange / Swap';
      case 'buy':
        return 'Achat CDF';
      case 'sell':
        return 'Vente CDF';
      case 'qr_payment':
        return 'Paiement QR';
      default:
        return 'Opération';
    }
  };

  const getTypeIcon = (type: TransactionType) => {
    switch (type) {
      case 'send':
        return <ArrowUpRight className="w-5 h-5 text-amber-500" />;
      case 'receive':
        return <ArrowDownLeft className="w-5 h-5 text-emerald-500" />;
      case 'swap':
        return <RefreshCw className="w-4 h-4 text-purple-500" />;
      case 'buy':
      case 'sell':
        return <ShoppingCart className="w-4 h-4 text-blue-500" />;
      case 'qr_payment':
        return <QrCode className="w-4 h-4 text-amber-500" />;
      default:
        return <ArrowUpRight className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* En-tête */}
      <div className="space-y-3">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            <span>Historique des opérations</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Suivi complet des transactions, paiements QR, achats et échanges
          </p>
        </div>

        {/* Filtres obligatoires (Section 3.11) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
          {[
            { id: 'ALL', label: 'Tout' },
            { id: 'send', label: 'Envois' },
            { id: 'receive', label: 'Réceptions' },
            { id: 'buy_sell', label: 'Achats et ventes' },
            { id: 'swap', label: 'Swaps' },
            { id: 'qr_payment', label: 'Paiements QR' },
          ].map((tab) => {
            const isSelected = filterType === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as ActivityFilter)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Démo Banner */}
      {isDemoMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300">
          <strong>Mode démo actif :</strong> Les opérations ci-dessous comportent les simulations pédagogiques et les transactions locales de test.
        </div>
      )}

      {/* Liste des transactions */}
      {filtered.length > 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
          {filtered.map((tx) => (
            <div
              key={tx.id}
              onClick={() => setSelectedTx(tx)}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                  {getTypeIcon(tx.type)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                      {getTypeLabel(tx.type)}
                    </span>
                    {getStatusBadge(tx.status)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                    <span>{new Date(tx.timestamp).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span className="truncate">{tx.note || (tx.type === 'receive' ? `De ${formatAddress(tx.fromAddress, 3)}` : `Vers ${formatAddress(tx.toAddress, 3)}`)}</span>
                  </div>
                </div>
              </div>

              {/* Montant */}
              <div className="text-right shrink-0">
                <div
                  className={`font-mono font-bold text-xs ${
                    tx.type === 'receive' || tx.type === 'buy'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {tx.type === 'receive' || tx.type === 'buy' ? '+' : '-'}
                  {tx.amount} {tx.tokenSymbol}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatFiatValue(tx.usdValue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          Aucune opération dans cette catégorie pour le moment.
        </div>
      )}

      {/* Modal de détail d'une opération (Spécification Section 3.11) */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  {getTypeIcon(selectedTx.type)}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Détail de l'opération
                  </h3>
                  <div className="text-[10px] text-slate-400">{getTypeLabel(selectedTx.type)}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Statut :</span>
                {getStatusBadge(selectedTx.status)}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Montant :</span>
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                  {selectedTx.amount} {selectedTx.tokenSymbol}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Contre-valeur :</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {formatFiatValue(selectedTx.usdValue)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date et heure :</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {new Date(selectedTx.timestamp).toLocaleString('fr-FR')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Frais appliqués :</span>
                <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                  {selectedTx.fee || '2 % portefeuille'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-400">Réseau :</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  BNB Smart Chain (Chain ID {activeNetwork.chainId})
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                <div className="text-slate-400">Adresse émettrice :</div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all select-all flex items-center justify-between">
                  <span>{selectedTx.fromAddress}</span>
                  <CopyButton textToCopy={selectedTx.fromAddress} iconOnly />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-slate-400">Adresse destinataire / Cible :</div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all select-all flex items-center justify-between">
                  <span>{selectedTx.toAddress}</span>
                  <CopyButton textToCopy={selectedTx.toAddress} iconOnly />
                </div>
              </div>

              {/* Référence ou Hash blockchain */}
              <div className="space-y-1.5">
                <div className="text-slate-400">Référence / Hash :</div>
                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 font-mono text-[11px] break-all select-all flex items-center justify-between">
                  <span>{selectedTx.hash || selectedTx.id}</span>
                  <CopyButton textToCopy={selectedTx.hash || selectedTx.id} iconOnly />
                </div>
              </div>

              {selectedTx.hash && !selectedTx.isDemoData && (
                <div className="pt-2">
                  <a
                    href={`${activeNetwork.blockExplorerUrl}/tx/${selectedTx.hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    <span>Consulter sur BscScan</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSelectedTx(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
