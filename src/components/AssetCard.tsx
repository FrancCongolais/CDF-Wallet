import React from 'react';
import { Asset } from '../types';
import { formatCryptoAmount, formatFiatValue, formatAddress } from '../blockchain/utils';
import { CopyButton } from './CopyButton';
import {
  TrendingUp,
  TrendingDown,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { useWallet } from '../wallet';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS, CDF_TOKEN_SYMBOL, CDF_TOKEN_NAME } from '../config/tokens';

interface AssetCardProps {
  asset: Asset;
  onSelect?: (asset: Asset) => void;
  onSend?: (tokenSymbol: string) => void;
  onReceive?: (tokenSymbol: string) => void;
  onRefresh?: () => void;
}

export const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  onSelect,
  onSend,
  onReceive,
  onRefresh,
}) => {
  const { activeNetwork, settings } = useWallet();
  const { token, balance, estimatedUsdValue, change24h, networkName, isLoading, error, isConfigured, statusNote } = asset;
  const isPositive = change24h >= 0;

  // Custom visual styles per asset
  const getAssetTheme = () => {
    switch (token.symbol) {
      case 'BNB':
        return {
          badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30',
          gradientBorder: 'hover:border-amber-500/60 dark:hover:border-amber-500/50',
          accentColor: 'text-amber-500',
          symbolLetter: 'BNB',
          roleTag: 'Monnaie Native (Gas)',
        };
      case 'CDF':
        return {
          badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
          gradientBorder: 'border-emerald-500/30 hover:border-emerald-500/70 dark:border-emerald-500/30 dark:hover:border-emerald-500/60',
          accentColor: 'text-emerald-500',
          symbolLetter: 'CDF',
          roleTag: 'Token Officiel RDC',
        };
      case 'USDT':
        return {
          badgeBg: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-teal-500/30',
          gradientBorder: 'hover:border-teal-500/60 dark:hover:border-teal-500/50',
          accentColor: 'text-teal-500',
          symbolLetter: 'USDT',
          roleTag: 'Stablecoin Indexé',
        };
      default:
        return {
          badgeBg: 'bg-slate-500/15 text-slate-500 ring-slate-500/30',
          gradientBorder: 'hover:border-slate-500/40',
          accentColor: 'text-slate-500',
          symbolLetter: token.symbol,
          roleTag: 'Actif Crypto',
        };
    }
  };

  const theme = getAssetTheme();

  return (
    <div
      id={`asset-card-${token.symbol.toLowerCase()}`}
      className={`p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 transition-all shadow-sm hover:shadow-md ${theme.gradientBorder} relative overflow-hidden`}
    >
      {/* Top Banner if error occurs */}
      {error && (
        <div className="mb-3 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div>
              <span className="font-bold">Erreur de lecture blockchain : </span>
              <span>{error}</span>
            </div>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 underline hover:no-underline shrink-0"
            >
              Réessayer
            </button>
          )}
        </div>
      )}

      {/* Header Row */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Token Badge + Symbol & Name */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-xs shadow-inner ring-1 ${theme.badgeBg}`}
          >
            <span>{theme.symbolLetter}</span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 dark:text-white text-lg tracking-tight">
                {token.symbol}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {theme.roleTag}
              </span>
              {token.symbol === 'CDF' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  <ShieldCheck className="w-3 h-3 text-amber-500" />
                  Officiel
                </span>
              )}
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {token.name}
            </div>
          </div>
        </div>

        {/* Right: Quantity & USD Value */}
        <div className="text-right">
          {isLoading ? (
            <div className="flex flex-col items-end gap-1.5 py-1">
              <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
            </div>
          ) : (
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white text-lg font-mono">
                {formatCryptoAmount(balance, 4, settings.hideBalances)}{' '}
                <span className="text-xs font-sans font-medium text-slate-400">{token.symbol}</span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                ≈ {formatFiatValue(estimatedUsdValue, settings.currency, settings.hideBalances)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Note Spécifique pour USDT Non Configuré (Testnet) ou Statut Spécifique */}
      {token.symbol === 'USDT' && isConfigured === false && (
        <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
          <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          <span>
            <strong>Réseau Testnet :</strong> Emplacement USDT préparé sans contrat déployé. Aucune adresse fictive n'est inventée conformément aux règles de sécurité.
          </span>
        </div>
      )}

      {/* Contract & Technical Metadata for BEP-20 tokens */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
          <span className="text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
            Réseau : {networkName}
          </span>

          {token.contractAddress ? (
            <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
              <span title={token.contractAddress}>
                Contrat : {formatAddress(token.contractAddress, 4)}
              </span>
              <CopyButton textToCopy={token.contractAddress} iconOnly />
              <a
                href={`${activeNetwork.blockExplorerUrl}/token/${token.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Consulter le contrat sur BscScan"
                className="text-slate-400 hover:text-amber-500 transition-colors p-0.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">Monnaie native BSC (Frais de gas)</span>
          )}

          {token.symbol === 'CDF' && (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
              Décimales : {CDF_DECIMALS}
            </span>
          )}
        </div>

        {/* Quick Send & Receive Buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          {onSend && (
            <button
              type="button"
              id={`btn-card-send-${token.symbol.toLowerCase()}`}
              onClick={() => onSend(token.symbol)}
              title={`Envoyer des ${token.symbol}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 dark:hover:bg-amber-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowUpRight className="w-3 h-3" />
              <span>Envoyer</span>
            </button>
          )}

          {onReceive && (
            <button
              type="button"
              id={`btn-card-receive-${token.symbol.toLowerCase()}`}
              onClick={() => onReceive(token.symbol)}
              title={`Recevoir des ${token.symbol}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-3 h-3" />
              <span>Recevoir</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

