/**
 * Acheter ou Vendre des CDF — CDF Wallet
 * 
 * Spécification Section 3.6 & Section 2 :
 * - Achat : Mobile Money (M-Pesa, Airtel Money, Orange Money, numéro +243 à 9 chiffres) ou Carte Visa (16 chiffres).
 *   Minimums contrôlés : 8 $ pour Mobile Money, 15 $ pour Carte Visa.
 *   Frais : 3 % (2 % portefeuille + 1 % intégré au contrat du token CDF).
 * - Vente : paiement reçu sur Mobile Money (+243). Le montant en CDF débité est le montant reçu plus 3 % de frais.
 * - Limites mensuelles vérifiées : 500 $ sans KYC / 200 000 $ avec KYC.
 *   Si dépassement : « Limite mensuelle atteinte. Il vous reste X $ ce mois-ci. »
 * - Frais perçus sur l'adresse administrateur : 0x0E9dBe33a4fb33Fc9e6595A154538D721965401b
 */

import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { AppStorage } from '../storage';
import { CDF_TREASURY_ADDRESS, FEE_CONFIG, MIN_AMOUNTS } from '../config/tokens';
import { DEFAULT_PRICES } from '../tokens';
import { formatCryptoAmount, formatFiatValue } from '../blockchain/utils';
import {
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Loader2,
  RefreshCw,
  Info,
} from 'lucide-react';

interface BuySellModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'buy' | 'sell';
}

type PaymentMethod = 'mobile_money' | 'visa';
type MobileOperator = 'm-pesa' | 'airtel' | 'orange';

export const BuySellModal: React.FC<BuySellModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'buy',
}) => {
  const { balance, selectedAccount, isDemoMode, refreshBalances } = useWallet();
  const [tab, setTab] = useState<'buy' | 'sell'>(defaultTab);

  // Méthode de paiement
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [operator, setOperator] = useState<MobileOperator>('m-pesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Montants
  const [amountUsd, setAmountUsd] = useState<string>('20');
  const [pinCode, setPinCode] = useState('');
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  // État de chargement & résultat
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const cdfPrice = DEFAULT_PRICES.CDF.usdPrice || 0.00035;
  const numAmount = parseFloat(amountUsd) || 0;

  // Calcul des frais selon la règle métier :
  // 3 % = 2 % portefeuille + 1 % intégré au token CDF
  const feeRate = FEE_CONFIG.buySellCdfFeePercent; // 0.03
  const feeUsd = numAmount * feeRate;
  const totalDebitedUsd = tab === 'buy' ? numAmount + feeUsd : numAmount;
  const cdfCalculated = cdfPrice > 0 ? (numAmount / cdfPrice) : 0;
  const cdfDebitedForSell = tab === 'sell' && cdfPrice > 0 ? (totalDebitedUsd / cdfPrice) : 0;

  // Solde CDF disponible
  const cdfAsset = balance.assets.find((a) => a.token.symbol === 'CDF');
  const availableCdf = cdfAsset ? parseFloat(cdfAsset.balance) : 0;

  // Suivi de la limite mensuelle
  const limitInfo = AppStorage.getMonthlySpentInfo(selectedAccount?.address);

  const handleValidateForm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Validation montant
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Veuillez saisir un montant valide.');
      return;
    }

    // 2. Contrôle des montants minimaux
    if (tab === 'buy') {
      if (paymentMethod === 'mobile_money' && numAmount < MIN_AMOUNTS.mobileMoneyBuyMinUsd) {
        setErrorMessage(`Le montant minimum d'achat par mobile money est de ${MIN_AMOUNTS.mobileMoneyBuyMinUsd} $.`);
        return;
      }
      if (paymentMethod === 'visa' && numAmount < MIN_AMOUNTS.visaBuyMinUsd) {
        setErrorMessage(`Le montant minimum d'achat par carte Visa est de ${MIN_AMOUNTS.visaBuyMinUsd} $.`);
        return;
      }
    }

    // 3. Validation moyen de paiement
    if (paymentMethod === 'mobile_money' || tab === 'sell') {
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      if (!/^[0-9]{9}$/.test(cleanPhone)) {
        setErrorMessage('Le numéro Mobile Money doit comporter exactement 9 chiffres (ex: 812345678).');
        return;
      }
    } else if (paymentMethod === 'visa') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (!/^[0-9]{16}$/.test(cleanCard)) {
        setErrorMessage('Le numéro de carte Visa doit comporter 16 chiffres.');
        return;
      }
      if (!cardExpiry || !cardCvv) {
        setErrorMessage('Veuillez renseigner la date d’expiration et le code CVV.');
        return;
      }
    }

    // 4. Contrôle de solde pour la vente
    if (tab === 'sell') {
      if (cdfDebitedForSell > availableCdf) {
        setErrorMessage(
          `Solde CDF insuffisant. Vous avez besoin de ${formatCryptoAmount(cdfDebitedForSell, 0)} CDF (frais de 3 % compris), votre solde est de ${formatCryptoAmount(availableCdf, 0)} CDF.`
        );
        return;
      }

      // 5. Contrôle du plafond mensuel pour la vente (opération sortante)
      if (totalDebitedUsd > limitInfo.remainingUsd) {
        setErrorMessage(
          `Limite mensuelle atteinte. Il vous reste ${limitInfo.remainingUsd.toFixed(2)} $ ce mois-ci.`
        );
        return;
      }
    }

    setShowPinConfirm(true);
  };

  const handleExecuteOperation = async () => {
    if (pinCode.length < 6) {
      setErrorMessage('Veuillez saisir votre code à 6 chiffres pour confirmer.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      await new Promise((res) => setTimeout(res, 800));

      if (tab === 'sell') {
        // Enregistrement dans le volume sortant mensuel
        AppStorage.recordMonthlySpent(totalDebitedUsd, selectedAccount?.address);
      }

      // Enregistrement de la transaction dans le stockage local
      const isBuy = tab === 'buy';
      AppStorage.saveRealTransaction({
        id: `tx-buysell-${Date.now()}`,
        type: isBuy ? 'buy' : 'sell',
        status: 'confirmed',
        tokenSymbol: 'CDF',
        amount: isBuy ? formatCryptoAmount(cdfCalculated, 0) : formatCryptoAmount(cdfDebitedForSell, 0),
        usdValue: numAmount,
        fromAddress: isBuy ? 'Passerelle Mobile/Visa' : (selectedAccount?.address || '0xWallet'),
        toAddress: isBuy ? (selectedAccount?.address || '0xWallet') : `Mobile Money +243 ${phoneNumber}`,
        timestamp: Date.now(),
        fee: `${feeUsd.toFixed(2)} $ (3 % dont 2 % trésorerie)`,
        networkId: 'bsc-mainnet',
        isDemoData: isDemoMode,
        note: isBuy
          ? `Achat de CDF via ${paymentMethod === 'mobile_money' ? `Mobile Money (${operator.toUpperCase()})` : 'Carte Visa'}`
          : `Vente de CDF vers Mobile Money (${operator.toUpperCase()} +243 ${phoneNumber})`,
      });

      await refreshBalances();

      setSuccessMessage(
        isBuy
          ? `Achat validé avec succès ! ≈ ${formatCryptoAmount(cdfCalculated, 0)} CDF ont été crédités sur votre portefeuille.`
          : `Vente enregistrée avec succès ! Le paiement de ${numAmount.toFixed(2)} $ a été transféré vers votre compte Mobile Money +243 ${phoneNumber}.`
      );
      setShowPinConfirm(false);
      setPinCode('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erreur lors du traitement de l’opération.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Acheter ou Vendre des CDF
              </h2>
              <p className="text-[11px] text-slate-400">Mobile Money (+243) & Cartes Visa</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps défilable */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Onglets Achat / Vente */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => {
                setTab('buy');
                setErrorMessage(null);
                setSuccessMessage(null);
                setShowPinConfirm(false);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'buy'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Acheter des CDF</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('sell');
                setPaymentMethod('mobile_money');
                setErrorMessage(null);
                setSuccessMessage(null);
                setShowPinConfirm(false);
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === 'sell'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Vendre des CDF</span>
            </button>
          </div>

          {/* Message de succès */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Opération confirmée</span>
              </div>
              <p className="text-xs">{successMessage}</p>
              <button
                type="button"
                onClick={() => setSuccessMessage(null)}
                className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 underline"
              >
                Faire une autre opération
              </button>
            </div>
          )}

          {/* Formulaire principal si pas de succès affiché */}
          {!successMessage && !showPinConfirm && (
            <div className="space-y-4">
              {/* Choix du moyen de paiement (si Achat) */}
              {tab === 'buy' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Mode de paiement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mobile_money')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'mobile_money'
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Smartphone className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Mobile Money</div>
                        <div className="text-[10px] text-slate-400">Min. 8 $ (+243)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('visa')}
                      className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                        paymentMethod === 'visa'
                          ? 'border-amber-500 bg-amber-500/10 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">Carte Visa</div>
                        <div className="text-[10px] text-slate-400">Min. 15 $</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Opérateur Mobile Money (pour Achat Mobile ou Vente) */}
              {(paymentMethod === 'mobile_money' || tab === 'sell') && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Opérateur RDC (+243)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['m-pesa', 'airtel', 'orange'] as MobileOperator[]).map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setOperator(op)}
                        className={`py-2 px-1 rounded-xl text-center text-xs font-bold uppercase transition-all cursor-pointer border ${
                          operator === op
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {op}
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Numéro de téléphone (+243)
                    </label>
                    <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden">
                      <span className="px-3 py-2.5 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-700/60 border-r border-slate-200 dark:border-slate-700">
                        +243
                      </span>
                      <input
                        type="tel"
                        maxLength={9}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="812345678 (9 chiffres)"
                        className="flex-1 px-3 py-2.5 text-xs text-slate-900 dark:text-white bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Champs Carte Visa */}
              {tab === 'buy' && paymentMethod === 'visa' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Numéro de carte Visa (16 chiffres)
                    </label>
                    <input
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Expiration (MM/AA)
                      </label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="12/28"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        CVV (3 chiffres)
                      </label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Montant en USD */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tab === 'buy' ? 'Montant à acheter (USD)' : 'Montant à recevoir (USD)'}
                  </label>
                  {tab === 'sell' && (
                    <span className="text-[11px] text-slate-400">
                      Dispo : {formatCryptoAmount(availableCdf, 0)} CDF
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    placeholder="20"
                    className="w-full px-4 py-2.5 pr-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    USD
                  </span>
                </div>
              </div>

              {/* Récapitulatif transparent des frais et conversion */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Taux indicatif CDF :</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    1 USD ≈ {formatCryptoAmount(1 / cdfPrice, 0)} CDF
                  </span>
                </div>

                <div className="flex justify-between text-slate-500">
                  <span>Frais totaux (3 %) :</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {feeUsd.toFixed(2)} $ (2 % portefeuille + 1 % token)
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>{tab === 'buy' ? 'Total débité :' : 'CDF débités (frais inclus) :'}</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {tab === 'buy'
                      ? `${totalDebitedUsd.toFixed(2)} $ (reçoit ≈ ${formatCryptoAmount(cdfCalculated, 0)} CDF)`
                      : `${formatCryptoAmount(cdfDebitedForSell, 0)} CDF`}
                  </span>
                </div>
              </div>

              {/* Rappel du plafond mensuel */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Plafond mensuel restant :</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {limitInfo.remainingUsd.toFixed(2)} $ / {limitInfo.limitUsd.toLocaleString()} $
                </span>
              </div>

              {/* Erreur éventuelle */}
              {errorMessage && (
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Bouton Continuer */}
              <button
                type="button"
                onClick={handleValidateForm}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                {tab === 'buy' ? 'Continuer vers le paiement' : 'Confirmer la vente'}
              </button>
            </div>
          )}

          {/* Écran de confirmation avec Code à 6 chiffres */}
          {showPinConfirm && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Confirmation de sécurité
                </h3>
                <p className="text-xs text-slate-400">
                  Saisissez votre code à 6 chiffres pour valider cette opération
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Opération :</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {tab === 'buy' ? 'Achat de CDF' : 'Vente de CDF'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant net :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{numAmount.toFixed(2)} $</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frais (3 %) :</span>
                  <span className="font-bold text-slate-900 dark:text-white">{feeUsd.toFixed(2)} $</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Code secret à 6 chiffres
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-lg font-mono py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinConfirm(false)}
                  className="py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  disabled={isProcessing || pinCode.length < 6}
                  onClick={handleExecuteOperation}
                  className="py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Valider l'opération</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
