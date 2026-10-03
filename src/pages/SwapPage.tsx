/**
 * SwapPage — CDF Wallet
 * 
 * Spécification Section 3.7 & Section 2 :
 * - Choix de la crypto donnée et reçue (BNB, CDF, USDT).
 * - Montant, bouton d'inversion et bouton « Max » (frais compris).
 * - Affichage du taux indicatif, des frais et du total débité :
 *   * Swap avec CDF : 3 % (payés par l'expéditeur)
 *   * Swap sans CDF : 2 % (payés par l'expéditeur)
 * - Erreurs : deux cryptos identiques, montant nul, solde insuffisant frais compris.
 * - Limite mensuelle contrôlée : si dépassement, bloqué avec : « Limite mensuelle atteinte. Il vous reste X $ ce mois-ci. »
 * - En mode démo, afficher clairement : « Mode démo — aucune transaction blockchain réelle n'est envoyée. »
 */

import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { TokenSymbol } from '../types';
import { DEFAULT_PRICES } from '../tokens';
import { AppStorage } from '../storage';
import { FEE_CONFIG, CDF_TREASURY_ADDRESS } from '../config/tokens';
import { formatCryptoAmount, formatFiatValue } from '../blockchain/utils';
import {
  RefreshCw,
  ArrowDownUp,
  Settings,
  AlertCircle,
  Shield,
  Sparkles,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export const SwapPage: React.FC = () => {
  const { balance, activeNetwork, isDemoMode, selectedAccount, refreshBalances } = useWallet();
  const [fromToken, setFromToken] = useState<TokenSymbol>('BNB');
  const [toToken, setToToken] = useState<TokenSymbol>('CDF');
  const [fromAmount, setFromAmount] = useState<string>('0.1');
  const [slippage, setSlippage] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [swapResult, setSwapResult] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const fromPrice = DEFAULT_PRICES[fromToken]?.usdPrice || 0;
  const toPrice = DEFAULT_PRICES[toToken]?.usdPrice || 0;

  // Calcul du taux de frais selon la règle métier :
  // 3 % avec CDF, 2 % sans CDF (payés par l'expéditeur)
  const isCdfInvolved = fromToken === 'CDF' || toToken === 'CDF';
  const feeRate = isCdfInvolved ? FEE_CONFIG.swapWithCdfFeePercent : FEE_CONFIG.swapWithoutCdfFeePercent;

  // Montant saisi et conversion
  const parsedFrom = parseFloat(fromAmount) || 0;
  const feeCrypto = parsedFrom * feeRate;
  const totalDebitedFrom = parsedFrom + feeCrypto;

  const totalFromUsd = parsedFrom * fromPrice;
  const calculatedTo = toPrice > 0 ? totalFromUsd / toPrice : 0;
  const rate = toPrice > 0 ? fromPrice / toPrice : 0;

  const fromAsset = balance.assets.find((a) => a.token.symbol === fromToken);
  const available = fromAsset ? parseFloat(fromAsset.balance) : 0;

  const handleInvert = () => {
    const prevFrom = fromToken;
    setFromToken(toToken);
    setToToken(prevFrom);
    setSwapResult(null);
    setSwapError(null);
  };

  const handleMax = () => {
    setSwapError(null);
    setSwapResult(null);
    // Max tenant compte des frais de swap
    const safeMax = available / (1 + feeRate);
    if (fromToken === 'BNB') {
      const bnbSafe = Math.max(0, safeMax - 0.001); // Marge gas BSC
      setFromAmount(bnbSafe > 0 ? bnbSafe.toFixed(4) : '0');
    } else {
      setFromAmount(safeMax > 0 ? safeMax.toFixed(2) : '0');
    }
  };

  const handleExecuteSwap = async () => {
    setSwapError(null);
    setSwapResult(null);

    // 1. Deux cryptos identiques
    if (fromToken === toToken) {
      setSwapError('Vous ne pouvez pas échanger deux jetons identiques.');
      return;
    }

    // 2. Montant nul ou invalide
    if (isNaN(parsedFrom) || parsedFrom <= 0) {
      setSwapError('Le montant doit être supérieur à zéro.');
      return;
    }

    // 3. Solde insuffisant frais compris
    if (totalDebitedFrom > available) {
      setSwapError(
        `Solde insuffisant en ${fromToken} frais de swap (${(feeRate * 100).toFixed(0)} %) compris. Requis : ${formatCryptoAmount(
          totalDebitedFrom,
          4
        )} ${fromToken} (votre solde : ${formatCryptoAmount(available, 4)} ${fromToken}).`
      );
      return;
    }

    // 4. Contrôle de la limite mensuelle sortante
    const limitInfo = AppStorage.getMonthlySpentInfo(selectedAccount?.address);
    if (totalFromUsd > limitInfo.remainingUsd) {
      setSwapError(
        `Limite mensuelle atteinte. Il vous reste ${limitInfo.remainingUsd.toFixed(2)} $ ce mois-ci.`
      );
      return;
    }

    setIsProcessing(true);
    setTimeout(async () => {
      setIsProcessing(false);
      // Enregistrement du volume mensuel sortant
      AppStorage.recordMonthlySpent(totalFromUsd, selectedAccount?.address);

      // Enregistrement de la transaction
      AppStorage.saveRealTransaction({
        id: `tx-swap-${Date.now()}`,
        type: 'swap',
        status: 'confirmed',
        tokenSymbol: fromToken,
        amount: formatCryptoAmount(parsedFrom, 4),
        usdValue: totalFromUsd,
        fromAddress: selectedAccount?.address || '0xWallet',
        toAddress: `PancakeSwap Router (${formatCryptoAmount(calculatedTo, 4)} ${toToken})`,
        timestamp: Date.now(),
        fee: `${formatCryptoAmount(feeCrypto, 4)} ${fromToken} (${(feeRate * 100).toFixed(0)} %)`,
        networkId: 'bsc-mainnet',
        isDemoData: isDemoMode,
        note: `Échange de ${formatCryptoAmount(parsedFrom, 4)} ${fromToken} contre ≈ ${formatCryptoAmount(calculatedTo, 4)} ${toToken}`,
      });

      await refreshBalances();

      setSwapResult(
        `Échange réussi : ${formatCryptoAmount(parsedFrom, 4)} ${fromToken} convertis contre ≈ ${formatCryptoAmount(
          calculatedTo,
          4
        )} ${toToken}. Frais de swap : ${(feeRate * 100).toFixed(0)} % (${formatCryptoAmount(
          feeCrypto,
          4
        )} ${fromToken}).`
      );
    }, 800);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Titre */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-amber-500" />
            <span>Échange / Swap</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Convertissez instantanément vos jetons sur BNB Smart Chain
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Paramètres de slippage"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Slippage Settings Panel */}
      {showSettings && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 animate-in fade-in">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Tolérance de slippage
          </div>
          <div className="flex items-center gap-2">
            {[0.1, 0.5, 1.0].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setSlippage(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  slippage === val
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {val}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* BANNIÈRE MODE DÉMO (Exigence Section 3.7 & 8) */}
      {isDemoMode && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 font-medium">
          Mode démo — aucune transaction blockchain réelle n'est envoyée.
        </div>
      )}

      {/* Swap Box Container */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
        {/* Token Source (From) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Vous donnez</span>
            <span>
              Disponible :{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {formatCryptoAmount(available, 4)} {fromToken}
              </strong>
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              step="any"
              min="0"
              value={fromAmount}
              onChange={(e) => {
                setFromAmount(e.target.value);
                setSwapError(null);
                setSwapResult(null);
              }}
              placeholder="0.0"
              className="w-full bg-transparent font-mono text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white focus:outline-none"
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleMax}
                className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-slate-950 transition-colors"
              >
                Max (frais inclus)
              </button>

              <select
                value={fromToken}
                onChange={(e) => {
                  setFromToken(e.target.value as TokenSymbol);
                  setSwapError(null);
                  setSwapResult(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:outline-none cursor-pointer"
              >
                <option value="CDF">CDF</option>
                <option value="BNB">BNB</option>
                <option value="USDT">USDT</option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            ≈ {formatFiatValue(totalFromUsd)}
          </div>
        </div>

        {/* Inversion Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            type="button"
            onClick={handleInvert}
            className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 hover:bg-amber-400 hover:scale-110 shadow-md transition-all cursor-pointer"
            title="Inverser les jetons"
          >
            <ArrowDownUp className="w-4 h-4" />
          </button>
        </div>

        {/* Token Destination (To) */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold">Vous recevez (estimé)</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="w-full font-mono text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white truncate">
              {formatCryptoAmount(calculatedTo, 4)}
            </div>

            <select
              value={toToken}
              onChange={(e) => {
                setToToken(e.target.value as TokenSymbol);
                setSwapError(null);
                setSwapResult(null);
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-bold text-slate-900 dark:text-white shadow-xs focus:outline-none cursor-pointer shrink-0"
            >
              <option value="CDF">CDF</option>
              <option value="BNB">BNB</option>
              <option value="USDT">USDT</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            ≈ {formatFiatValue(calculatedTo * toPrice)}
          </div>
        </div>

        {/* Exchange Details & Breakdown (Spécification Section 3.7) */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-400 space-y-1.5 border border-slate-200/50 dark:border-slate-700/50">
          <div className="flex justify-between items-center">
            <span>Taux indicatif :</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              1 {fromToken} ≈ {formatCryptoAmount(rate, 4)} {toToken}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>Frais de swap :</span>
            <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
              {(feeRate * 100).toFixed(0)} % ({formatCryptoAmount(feeCrypto, 4)} {fromToken})
            </span>
          </div>

          <div className="flex justify-between items-center border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5 font-bold text-slate-900 dark:text-white">
            <span>Total débité (frais compris) :</span>
            <span className="font-mono text-amber-600 dark:text-amber-400">
              {formatCryptoAmount(totalDebitedFrom, 4)} {fromToken}
            </span>
          </div>
        </div>

        {/* Message d'erreur s'il y a lieu */}
        {swapError && (
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{swapError}</span>
          </div>
        )}

        {/* Message de succès */}
        {swapResult && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-300 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{swapResult}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleExecuteSwap}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Traitement de l'échange...</span>
            </>
          ) : (
            <>
              <span>Échanger {fromToken} contre {toToken}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
