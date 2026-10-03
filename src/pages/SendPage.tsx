/**
 * SendPage — CDF Wallet
 * 
 * Parcours sécurisé « Envoyer » pour BNB natif et jeton CDF officiel sur BNB Smart Chain (BSC).
 * 
 * ACTIFS GÉRÉS :
 * 1. BNB — BNB Smart Chain (Transfert natif)
 * 2. CDF — Franc Congolais (Jeton BEP-20)
 *    - Contrat officiel : 0x18e173fdeb700568a08d1d7049309ae322d27777
 *    - Décimales : 18
 *    - Chain ID : 56 (ou testnet 97)
 * 3. USDT — Structure préparée (aucune fausse adresse de contrat inventée)
 * 
 * RÈGLES DE SÉCURITÉ INVIOLABLES :
 * - Aucune signature automatique : confirmation explicite requise.
 * - Aucune seed phrase ou clé privée transmise à un serveur, Supabase ou loguée.
 * - Protection anti-double clic / double soumission.
 * - Mode Démo : aucune transaction réelle, aucun accès aux clés privées.
 */

import React, { useState, useEffect, useCallback, useId } from 'react';
import { useWallet } from '../wallet';
import { TokenSymbol, TransactionStatus } from '../types';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS, FEE_CONFIG, CDF_TREASURY_ADDRESS } from '../config/tokens';
import { AppStorage } from '../storage';
import { transactionService } from '../services/transactionService';
import { GasEstimationResult } from '../blockchain/provider';
import { formatFiatValue, formatCryptoAmount, formatAddress } from '../blockchain/utils';
import { DEFAULT_PRICES } from '../tokens';
import {
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Shield,
  Send,
  Loader2,
  ExternalLink,
  Fuel,
  Copy,
  Check,
  AlertTriangle,
  Lock,
  ArrowLeft,
  RotateCw,
  Clock,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';

interface SendPageProps {
  onNavigate: (route: string) => void;
}

export const SendPage: React.FC<SendPageProps> = ({ onNavigate }) => {
  const {
    balance,
    activeNetwork,
    sendTransfer,
    refreshBalances,
    isDemoMode,
    selectedAccount,
    isPasswordSet,
  } = useWallet();

  // Initialisation du jeton pré-sélectionné (ex: depuis la page Portefeuille ou Accueil)
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>(() => {
    try {
      const saved = sessionStorage.getItem('cdf_send_selected_token');
      if (saved === 'BNB' || saved === 'CDF' || saved === 'USDT') {
        sessionStorage.removeItem('cdf_send_selected_token');
        return saved as TokenSymbol;
      }
    } catch {}
    return 'CDF';
  });

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formGeneralError, setFormGeneralError] = useState<string | null>(null);

  // Estimation du gas
  const [gasDetails, setGasDetails] = useState<GasEstimationResult | null>(null);
  const [isLoadingGas, setIsLoadingGas] = useState(false);

  // Écran de confirmation (« Vérifiez votre transaction »)
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // État de soumission et résultat
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txResult, setTxResult] = useState<{
    success: boolean;
    hash?: string;
    status: TransactionStatus;
    message: string;
    explorerUrl?: string;
    gasFeeBnb?: string;
  } | null>(null);

  // État de copie
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRecipient, setCopiedRecipient] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);

  // Soldes actuels
  const currentAsset = balance.assets.find((a) => a.token.symbol === selectedToken);
  const availableBalance = currentAsset ? parseFloat(currentAsset.balance) : 0;
  const bnbAsset = balance.assets.find((a) => a.token.symbol === 'BNB');
  const bnbBalance = bnbAsset ? parseFloat(bnbAsset.balance) : 0;

  // Calcul du prix approximatif en USD
  const tokenPrice = DEFAULT_PRICES[selectedToken]?.usdPrice || 0;
  const estimatedUsd = amount ? (parseFloat(amount) || 0) * tokenPrice : 0;

  // 1. Estimation du gas dynamique
  const fetchGasEstimate = useCallback(async () => {
    setIsLoadingGas(true);
    try {
      const est = await transactionService.estimateGas({
        network: activeNetwork,
        tokenSymbol: selectedToken,
        recipient: recipientAddress,
        amount: amount,
        senderAddress: selectedAccount?.address,
      });
      setGasDetails(est);
    } catch {
      // Fallback géré en interne dans transactionService
    } finally {
      setIsLoadingGas(false);
    }
  }, [activeNetwork, selectedToken, recipientAddress, amount, selectedAccount?.address]);

  useEffect(() => {
    fetchGasEstimate();
  }, [fetchGasEstimate]);

  // Gestion de la saisie de l'adresse destinataire
  const handleAddressChange = (val: string) => {
    setRecipientAddress(val);
    setFormGeneralError(null);
    if (!val.trim()) {
      setAddressError(null);
      return;
    }
    const clean = val.trim();
    // Validation syntaxique préliminaire
    if (!clean.startsWith('0x') || clean.length !== 42) {
      setAddressError('L’adresse EVM doit commencer par 0x et comporter exactement 42 caractères.');
    } else if (selectedAccount && clean.toLowerCase() === selectedAccount.address.toLowerCase()) {
      setAddressError('Attention : vous avez indiqué votre propre adresse de portefeuille.');
    } else {
      setAddressError(null);
    }
  };

  // Coller depuis le presse-papier
  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        handleAddressChange(text.trim());
      }
    } catch {
      // Fallback si permissions presse-papier non accordées
    }
  };

  // Remplissage automatique MAX
  const handleMaxAmount = () => {
    setAmountError(null);
    setFormGeneralError(null);
    const gasBuffer = gasDetails ? parseFloat(gasDetails.gasFeeBnb) * 1.2 : 0.001;
    if (selectedToken === 'BNB') {
      const safeMax = Math.max(0, availableBalance - gasBuffer);
      setAmount(safeMax > 0 ? safeMax.toFixed(5) : '0');
    } else {
      setAmount(availableBalance.toString());
    }
  };

  // 2. ÉTAPE VALIDATION AVANT CONFIRMATION
  const handleContinueToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormGeneralError(null);
    setAddressError(null);
    setAmountError(null);
    setPasswordError(null);
    setConfirmPassword('');

    // Vérification actif USDT (structure prête, non inventée)
    if (selectedToken === 'USDT') {
      setFormGeneralError(
        'Le transfert de Tether USDT est temporairement réservé jusqu’au déploiement officiel du contrat sur ce réseau. Veuillez utiliser CDF ou BNB.'
      );
      return;
    }

    const estimatedGasBnbVal = gasDetails ? parseFloat(gasDetails.gasFeeBnb) : 0.00075;

    // Appel du validateur centralisé
    const validation = transactionService.validateTransferParams({
      recipient: recipientAddress,
      amount,
      tokenSymbol: selectedToken,
      senderTokenBalance: availableBalance,
      bnbBalance,
      estimatedGasBnb: estimatedGasBnbVal,
      network: activeNetwork,
      senderAddress: selectedAccount?.address,
    });

    if (!validation.isValid) {
      setFormGeneralError(validation.error);
      return;
    }

    // Vérification du plafond mensuel sortant (Spécification Section 2 & 3.8)
    const numAmount = parseFloat(amount) || 0;
    const numAmountUsd = numAmount * (DEFAULT_PRICES[selectedToken]?.usdPrice || 0);
    const limitInfo = AppStorage.getMonthlySpentInfo(selectedAccount?.address);
    if (numAmountUsd > limitInfo.remainingUsd) {
      setFormGeneralError(
        `Limite mensuelle atteinte. Il vous reste ${limitInfo.remainingUsd.toFixed(2)} $ ce mois-ci.`
      );
      return;
    }

    // Ouvrir l'écran de confirmation explicite
    setShowConfirmModal(true);
  };

  // 3. ÉTAPE SIGNATURE ET DIFFUSION (« Confirmer l'envoi »)
  const handleConfirmSend = async () => {
    // Protection anti-double soumission
    if (isSubmitting) return;

    // En mode réel, si un mot de passe est configuré, on valide qu'il a été saisi
    if (!isDemoMode && isPasswordSet && !confirmPassword.trim()) {
      setPasswordError('Veuillez saisir votre mot de passe pour déverrouiller la signature.');
      return;
    }

    setIsSubmitting(true);
    setPasswordError(null);

    try {
      const res = await sendTransfer(
        recipientAddress,
        amount,
        selectedToken,
        confirmPassword || undefined
      );

      if (!res.success) {
        if (res.message.includes('Mot de passe incorrect')) {
          setPasswordError(res.message);
          setIsSubmitting(false);
          return;
        }

        // Échec : afficher l'erreur compréhensible, fermer la modale
        setShowConfirmModal(false);
        setTxResult({
          success: false,
          status: 'failed',
          message: res.message,
        });
        return;
      }

      // Succès de la diffusion : fermer la modale et afficher l'écran post-envoi
      setShowConfirmModal(false);
      setTxResult({
        success: true,
        hash: res.hash,
        status: 'pending',
        message: res.message,
        explorerUrl: res.networkExplorerUrl,
        gasFeeBnb: gasDetails?.gasFeeBnb || '0.00075',
      });

      // Réinitialiser le formulaire pour un prochain envoi
      setAmount('');
      setRecipientAddress('');
      setConfirmPassword('');
    } catch (err: unknown) {
      setShowConfirmModal(false);
      setTxResult({
        success: false,
        status: 'failed',
        message: (err as Error)?.message || 'Une erreur inattendue est survenue.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copie de hash
  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  // Copie de destinataire
  const handleCopyRecipient = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedRecipient(true);
    setTimeout(() => setCopiedRecipient(false), 2000);
  };

  // Copie du contrat CDF officiel
  const handleCopyContract = () => {
    navigator.clipboard.writeText(CDF_CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  const estimatedGasBnb = gasDetails ? gasDetails.gasFeeBnb : '0.00075';
  const estimatedGasUsd = gasDetails ? gasDetails.gasFeeUsd : 0.44;
  const isBnbLowForGas = !isDemoMode && bnbBalance < parseFloat(estimatedGasBnb);

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-10">
      {/* En-tête de navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/wallet')}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Retour au Portefeuille"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-amber-500" />
              <span>Envoyer des Actifs</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Transfert sécurisé sur {activeNetwork.name} (Chain ID {activeNetwork.chainId})
            </p>
          </div>
        </div>

        {/* Badge d'état Réel / Démo */}
        <div>
          <span
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${
              isDemoMode
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDemoMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
              }`}
            />
            {isDemoMode ? 'Mode Démo (Simulé)' : 'Mode Réel (On-Chain)'}
          </span>
        </div>
      </div>

      {/* AVERTISSEMENT MODE DÉMO */}
      {isDemoMode && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Mode Démonstration Actif :</div>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              L'envoi réel sur la blockchain BNB Smart Chain est désactivé en mode démonstration. Aucune clé privée n’est requise ni sollicitée. Pour signer des transactions on-chain réelles, basculez en Mode Réel dans les paramètres.
            </p>
          </div>
        </div>
      )}

      {/* ALERTE RÉSERVE GAS BNB */}
      {isBnbLowForGas && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Réserve de gas BNB insuffisante :</div>
            <p className="text-[11px] leading-relaxed">
              Votre solde BNB actuel est de{' '}
              <span className="font-mono font-bold">{bnbBalance.toFixed(5)} BNB</span>. Un minimum
              d'environ{' '}
              <span className="font-mono font-bold">{estimatedGasBnb} BNB</span> est requis pour
              payer les frais de gas réseau sur BNB Smart Chain (même pour transférer des jetons
              CDF).
            </p>
          </div>
        </div>
      )}

      {/* ÉCRAN DE RÉSULTAT POST-ENVOI */}
      {txResult && (
        <div
          className={`p-5 rounded-3xl border shadow-sm space-y-4 animate-in fade-in duration-200 ${
            txResult.success
              ? 'bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/30'
              : 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/30'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              {txResult.success ? (
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {txResult.success ? 'Transaction Transmise avec Succès' : 'Échec de la Transaction'}
                </h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                      txResult.status === 'confirmed'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : txResult.status === 'pending'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {txResult.status === 'pending' && <Clock className="w-3 h-3 animate-spin" />}
                    {txResult.status === 'pending'
                      ? 'En attente de confirmation...'
                      : txResult.status === 'confirmed'
                      ? 'Confirmée on-chain'
                      : 'Échouée'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setTxResult(null)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Fermer
            </button>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {txResult.message}
          </p>

          {/* Affichage du hash avec copie et explorateur BscScan */}
          {txResult.hash && (
            <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span>Hash de transaction BSC :</span>
                <button
                  type="button"
                  onClick={() => handleCopyHash(txResult.hash!)}
                  className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  {copiedHash ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copié</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copier le hash</span>
                    </>
                  )}
                </button>
              </div>

              <div className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                {txResult.hash}
              </div>

              <div className="flex items-center justify-between pt-1">
                <a
                  href={`${activeNetwork.blockExplorerUrl}/tx/${txResult.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>Consulter sur l'explorateur BNB (BscScan)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={() => refreshBalances()}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Actualiser solde</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setTxResult(null);
                setAmount('');
                setRecipientAddress('');
              }}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
            >
              Faire un autre envoi
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/wallet')}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 cursor-pointer"
            >
              Retour au Portefeuille
            </button>
          </div>
        </div>
      )}

      {/* FORMULAIRE PRINCIPAL « ENVOYER » */}
      <form
        onSubmit={handleContinueToConfirm}
        className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5"
      >
        {/* 1. Sélection de l'actif */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              1. Sélection de l'actif
            </label>
            <span className="text-[11px] text-slate-400">Réseau : BNB Smart Chain</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Actif 1 : CDF (Franc Congolais) */}
            <button
              type="button"
              id="select-token-cdf"
              onClick={() => {
                setSelectedToken('CDF');
                setFormGeneralError(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedToken === 'CDF'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">CDF</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  BEP-20
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Franc Congolais
              </div>
              <div className="text-[11px] font-mono font-bold mt-1 text-slate-800 dark:text-slate-200">
                {formatCryptoAmount(
                  parseFloat(balance.assets.find((a) => a.token.symbol === 'CDF')?.balance || '0'),
                  2
                )}{' '}
                CDF
              </div>
            </button>

            {/* Actif 2 : BNB (BNB Smart Chain natif) */}
            <button
              type="button"
              id="select-token-bnb"
              onClick={() => {
                setSelectedToken('BNB');
                setFormGeneralError(null);
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                selectedToken === 'BNB'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">BNB</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
                  Natif
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Smart Chain
              </div>
              <div className="text-[11px] font-mono font-bold mt-1 text-slate-800 dark:text-slate-200">
                {formatCryptoAmount(bnbBalance, 4)} BNB
              </div>
            </button>

            {/* Actif 3 : USDT (Structure préparée) */}
            <button
              type="button"
              id="select-token-usdt"
              onClick={() => {
                setSelectedToken('USDT');
                setFormGeneralError(
                  'USDT : structure et affichage préparés. En attente de déploiement officiel sur ce réseau (aucune adresse de contrat arbitraire inventée).'
                );
              }}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer opacity-75 relative ${
                selectedToken === 'USDT'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-950 dark:text-amber-100'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">USDT</span>
                <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">
                  Prévu
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tether USD
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                Non déployé
              </div>
            </button>
          </div>

          {/* Badge contractuel officiel pour CDF */}
          {selectedToken === 'CDF' && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">
                  Contrat officiel CDF : <span className="font-mono">{CDF_CONTRACT_ADDRESS.slice(0, 10)}...{CDF_CONTRACT_ADDRESS.slice(-6)}</span> (18 décimales)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyContract}
                className="shrink-0 text-amber-600 dark:text-amber-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer ml-2"
              >
                {copiedContract ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedContract ? 'Copié' : 'Copier'}</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. Adresse du destinataire */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="send-recipient-address"
              className="text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              2. Adresse du destinataire (BNB Smart Chain)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                title="Coller depuis le presse-papier"
              >
                <ClipboardCheck className="w-3 h-3" />
                <span>Coller</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/scan')}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3 h-3" />
                <span>Scanner QR</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              id="send-recipient-address"
              type="text"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => handleAddressChange(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
          </div>

          {addressError && (
            <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{addressError}</span>
            </p>
          )}
        </div>

        {/* 3. Montant */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="send-amount-input"
              className="text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              3. Montant
            </label>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Disponible :{' '}
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCryptoAmount(availableBalance, 4)} {selectedToken}
              </span>
            </div>
          </div>

          <div className="relative">
            <input
              id="send-amount-input"
              type="number"
              step="any"
              min="0"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFormGeneralError(null);
                setAmountError(null);
              }}
              className="w-full px-3.5 py-2.5 pr-20 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
            <button
              type="button"
              id="btn-amount-max"
              onClick={handleMaxAmount}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[10px] font-bold uppercase hover:bg-amber-500 hover:text-slate-950 transition-colors cursor-pointer"
            >
              MAX
            </button>
          </div>

          {/* Contre-valeur indicative */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Valeur estimée :</span>
            <span className="font-mono font-medium text-slate-600 dark:text-slate-300">
              ≈ {formatFiatValue(estimatedUsd)}
            </span>
          </div>

          {amountError && (
            <p className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{amountError}</span>
            </p>
          )}
        </div>

        {/* 4. ESTIMATION DU GAS (Affichage récapitulatif avant confirmation) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Fuel className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold">Frais réseau estimés (BSC) :</span>
            </span>
            <span className="font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1">
              {isLoadingGas && <RotateCw className="w-3 h-3 animate-spin text-slate-400" />}
              <span>~ {estimatedGasBnb} BNB</span>
              <span className="text-slate-400 font-normal">(${estimatedGasUsd.toFixed(2)})</span>
            </span>
          </div>

          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Actif & Montant :</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {amount ? `${amount} ${selectedToken}` : `— ${selectedToken}`}
            </span>
          </div>

          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Destinataire :</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
              {recipientAddress ? `${recipientAddress.slice(0, 10)}...${recipientAddress.slice(-6)}` : 'Non renseigné'}
            </span>
          </div>

          <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
            <span>Réseau :</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              BNB Smart Chain (Chain ID {activeNetwork.chainId})
            </span>
          </div>
        </div>

        {/* Message d'erreur général */}
        {formGeneralError && (
          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span className="leading-relaxed">{formGeneralError}</span>
          </div>
        )}

        {/* Bouton « Continuer » */}
        <button
          id="btn-send-continue"
          type="submit"
          disabled={!recipientAddress.trim() || !amount.trim() || isSubmitting}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Continuer</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </form>

      {/* ========================================================= */}
      {/* 4. ÉCRAN DE CONFIRMATION (« Vérifiez votre transaction ») */}
      {/* ========================================================= */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-5">
            {/* Titre officiel demandé */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-500" />
                <span>Vérifiez votre transaction</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer disabled:opacity-50 text-xs"
              >
                Fermer
              </button>
            </div>

            {/* Récapitulatif structuré */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Actif :</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{selectedToken === 'CDF' ? 'CDF — Franc Congolais' : 'BNB — BNB Smart Chain'}</span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Montant envoyé :</span>
                <div className="text-right">
                  <div className="font-mono font-extrabold text-sm text-slate-900 dark:text-white">
                    {amount} {selectedToken}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    ≈ {formatFiatValue(estimatedUsd)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                <span>Le destinataire reçoit :</span>
                <span className="font-mono font-bold">
                  {amount} {selectedToken} (100 % complet)
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>Frais portefeuille (2 %) :</span>
                <span className="font-mono font-semibold">
                  + {formatCryptoAmount((parseFloat(amount) || 0) * 0.02, 4)} {selectedToken}
                </span>
              </div>

              <div className="flex justify-between items-center font-bold text-slate-900 dark:text-white border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <span>Total débité :</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">
                  {formatCryptoAmount((parseFloat(amount) || 0) * 1.02, 4)} {selectedToken}
                </span>
              </div>

              <div className="border-t border-slate-200/60 dark:border-slate-700/60 pt-2.5">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                  <span>Destinataire :</span>
                  <button
                    type="button"
                    onClick={() => handleCopyRecipient(recipientAddress)}
                    className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    {copiedRecipient ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedRecipient ? 'Copié' : 'Copier'}</span>
                  </button>
                </div>
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-900 dark:text-white break-all select-all border border-slate-200/50 dark:border-slate-700/50">
                  {recipientAddress}
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-200/60 dark:border-slate-700/60 pt-2.5">
                <span className="text-slate-500 dark:text-slate-400">Frais réseau BSC :</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ~ {estimatedGasBnb} BNB <span className="text-slate-400 font-normal">(${estimatedGasUsd.toFixed(2)})</span>
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Réseau :</span>
                <span className="font-bold text-slate-900 dark:text-white">BNB Smart Chain</span>
              </div>
            </div>

            {/* AVERTISSEMENT FORMEL : UN ENVOI NE PEUT PAS ÊTRE ANNULÉ */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <strong>Avertissement :</strong> un envoi sur la blockchain ne peut pas être annulé. Vérifiez attentivement l'adresse et le montant avant de confirmer.
              </div>
            </div>

            {/* Avertissement Mode Démo ou invite de déverrouillage sécurisé */}
            {isDemoMode ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                <div className="font-bold mb-0.5">Mode Démonstration :</div>
                <p className="text-[11px] leading-relaxed">
                  Cette transaction sera simulée sans diffusion réelle sur la blockchain. Aucune clé privée n’est requise.
                </p>
              </div>
            ) : isPasswordSet ? (
              <div className="space-y-2">
                <label
                  htmlFor="confirm-tx-password"
                  className="block text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  Mot de passe du portefeuille (Autorisation de signature)
                </label>
                <div className="relative">
                  <input
                    id="confirm-tx-password"
                    type="password"
                    placeholder="Saisissez votre mot de passe..."
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setPasswordError(null);
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                {passwordError && (
                  <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Portefeuille non-custodial déverrouillé dans cette session.</span>
              </div>
            )}

            {/* Boutons « Confirmer l'envoi » et « Annuler » */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                id="btn-cancel-send"
                disabled={isSubmitting}
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                id="btn-confirm-send"
                disabled={isSubmitting}
                onClick={handleConfirmSend}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-extrabold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signature et diffusion...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirmer l'envoi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
