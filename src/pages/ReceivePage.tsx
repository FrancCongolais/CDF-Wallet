import React, { useState, useEffect, useMemo } from 'react';
import { useWallet } from '../wallet';
import { qrService } from '../qr';
import { TokenSymbol } from '../types';
import {
  CDF_CONTRACT_ADDRESS,
  CDF_DECIMALS,
  CDF_TOKEN_SYMBOL,
  CDF_TOKEN_NAME,
  USDT_CONTRACT_ADDRESS_BSC_MAINNET,
  USDT_CONTRACT_ADDRESS_BSC_TESTNET,
  USDT_DECIMALS,
} from '../config/tokens';
import { formatAddress } from '../blockchain/utils';
import {
  ArrowDownLeft,
  Share2,
  AlertTriangle,
  Check,
  RefreshCw,
  Maximize2,
  X,
  ExternalLink,
  ShieldCheck,
  Copy,
  Info,
  Layers,
  Globe,
  QrCode as QrIcon,
} from 'lucide-react';

interface ReceivePageProps {
  onNavigate: (route: string) => void;
}

export const ReceivePage: React.FC<ReceivePageProps> = ({ onNavigate }) => {
  const { selectedAccount, activeNetwork } = useWallet();

  // Déterminer la disponibilité du contrat officiel USDT sur le réseau actif
  const usdtContract = activeNetwork.isTestnet
    ? USDT_CONTRACT_ADDRESS_BSC_TESTNET
    : USDT_CONTRACT_ADDRESS_BSC_MAINNET;
  const isUsdtConfigured = Boolean(usdtContract);

  // Liste dynamique des actifs sélectionnables
  // RÈGLE : Ne jamais inventer d'adresse de contrat pour USDT. Afficher uniquement si configuré officiellement.
  const selectableTokens = useMemo(() => {
    const list: {
      symbol: TokenSymbol;
      name: string;
      role: string;
      isNative: boolean;
      contractAddress: string | null;
      decimals: number;
      badgeColor: string;
      tagColor: string;
    }[] = [
      {
        symbol: 'BNB',
        name: 'BNB',
        role: 'Monnaie Native (Frais de Gas)',
        isNative: true,
        contractAddress: null,
        decimals: 18,
        badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-amber-500/30',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
      },
      {
        symbol: 'CDF',
        name: CDF_TOKEN_NAME, // 'Franc Congolais'
        role: 'Token Officiel RDC (BEP-20)',
        isNative: false,
        contractAddress: CDF_CONTRACT_ADDRESS, // 0x18e173fdeb700568a08d1d7049309ae322d27777
        decimals: CDF_DECIMALS, // 18
        badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-emerald-500/30',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
      },
    ];

    if (isUsdtConfigured && usdtContract) {
      list.push({
        symbol: 'USDT',
        name: 'Tether USD',
        role: 'Stablecoin Indexé USD (BEP-20)',
        isNative: false,
        contractAddress: usdtContract,
        decimals: USDT_DECIMALS,
        badgeColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 ring-teal-500/30',
        tagColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300',
      });
    }

    return list;
  }, [isUsdtConfigured, usdtContract]);

  // Initialisation du token sélectionné
  const [selectedToken, setSelectedToken] = useState<TokenSymbol>(() => {
    try {
      const stored = sessionStorage.getItem('cdf_receive_selected_token') as TokenSymbol | null;
      if (stored && (stored === 'CDF' || stored === 'BNB' || (stored === 'USDT' && isUsdtConfigured))) {
        return stored;
      }
    } catch {
      // Ignore
    }
    return 'CDF';
  });

  // Si le token sélectionné est USDT mais n'est plus configuré (ex: basculement réseau testnet), repli sur CDF
  useEffect(() => {
    if (selectedToken === 'USDT' && !isUsdtConfigured) {
      setSelectedToken('CDF');
    }
  }, [selectedToken, isUsdtConfigured]);

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [qrExpandedDataUrl, setQrExpandedDataUrl] = useState<string>('');
  const [isQrGenerating, setIsQrGenerating] = useState<boolean>(true);
  const [showExpandedQr, setShowExpandedQr] = useState<boolean>(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);
  const [copiedContractNotification, setCopiedContractNotification] = useState<boolean>(false);
  const [requestedAmount, setRequestedAmount] = useState<string>('');

  // Récupération de l'adresse publique EVM du compte actif
  // Une adresse publique de réception est une donnée publique (ne jamais demander de secret pour l'afficher)
  const walletAddress = selectedAccount?.address || '0x3F8aD50285aE3A71c1b187588B46cb6D2c77d4B6';

  // Actif actuellement sélectionné
  const currentAsset = selectableTokens.find((t) => t.symbol === selectedToken) || selectableTokens[0];

  // Génération automatique du QR Code universellement lisible
  // Pour une compatibilité optimale avec tous les portefeuilles (Trust Wallet, Binance, MetaMask, etc.),
  // l'adresse publique pure 0x... est le standard universel reconnu par 100% des scanners.
  // Si un montant est précisé, nous incluons la syntaxe standard EIP-681.
  useEffect(() => {
    let isMounted = true;
    setIsQrGenerating(true);

    const generateQr = async () => {
      let qrPayload = walletAddress;

      if (requestedAmount && parseFloat(requestedAmount) > 0) {
        // Encodage URI standard si montant renseigné
        qrPayload = qrService.formatPaymentUri({
          address: walletAddress,
          amount: requestedAmount,
          token: selectedToken !== 'BNB' ? selectedToken : undefined,
          chainId: activeNetwork.chainId,
        });
      }

      // QR Code standard (280px)
      const dataUrl = await qrService.generateQrCodeDataUrl(qrPayload, { width: 320, margin: 2 });
      // QR Code grand format pour l'agrandissement (460px)
      const expandedUrl = await qrService.generateQrCodeDataUrl(qrPayload, { width: 460, margin: 2 });

      if (isMounted) {
        setQrDataUrl(dataUrl);
        setQrExpandedDataUrl(expandedUrl);
        setIsQrGenerating(false);
      }
    };

    generateQr();

    return () => {
      isMounted = false;
    };
  }, [walletAddress, requestedAmount, selectedToken, activeNetwork.chainId]);

  // Copier l'adresse de réception avec notification
  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopiedNotification('Adresse copiée dans le presse-papier !');
      setTimeout(() => setCopiedNotification(null), 2500);
    } catch {
      // Repli
      const textarea = document.createElement('textarea');
      textarea.value = walletAddress;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedNotification('Adresse copiée dans le presse-papier !');
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  // Copier l'adresse du contrat du token (pour CDF ou USDT)
  const handleCopyContract = async (contract: string) => {
    try {
      await navigator.clipboard.writeText(contract);
      setCopiedContractNotification(true);
      setTimeout(() => setCopiedContractNotification(false), 2000);
    } catch {
      // Ignorer
    }
  };

  // Partager l'adresse publique via l'API Web Share si disponible, sinon copier
  const handleShare = async () => {
    const shareText = `Adresse publique de réception CDF Wallet (${activeNetwork.name}) :\n${walletAddress}\nActif : ${currentAsset.symbol} (${currentAsset.name})`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Adresse de réception CDF Wallet (${currentAsset.symbol})`,
          text: shareText,
        });
        return;
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          return;
        }
      }
    }

    // Repli : Copie immédiate avec confirmation
    await handleCopyAddress();
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-8">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center justify-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20 shadow-inner">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <span>Recevoir</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Recevez des actifs sécurisés sur votre portefeuille non-custodial via la BNB Smart Chain
        </p>
      </div>

      {/* RAPPEL EXPLICITE DU RÉSEAU BNB SMART CHAIN */}
      <div
        id="network-indicator"
        className="p-3 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs"
      >
        <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-bold">
          <Globe className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Réseau : BNB Smart Chain</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-900 dark:text-amber-300">
            Chain ID {activeNetwork.chainId} · {activeNetwork.name}
          </span>
        </div>
        <div className="text-amber-800/80 dark:text-amber-300/80 text-[11px] font-medium ml-auto">
          Tous les actifs BEP-20 partagent cette adresse EVM unique
        </div>
      </div>

      {/* 2. CHOIX DE L'ACTIF : SÉLECTIONNEZ UN ACTIF */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-500" />
            <span>Sélectionnez un actif</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {selectableTokens.length} actif{selectableTokens.length > 1 ? 's' : ''} supporté{selectableTokens.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Boutons Sélecteurs d'Actif */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {selectableTokens.map((token) => {
            const isSelected = selectedToken === token.symbol;
            return (
              <button
                key={token.symbol}
                type="button"
                id={`btn-select-token-${token.symbol.toLowerCase()}`}
                onClick={() => setSelectedToken(token.symbol)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-1 ring-amber-500/40'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${token.badgeColor}`}
                  >
                    <span>{token.symbol}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {token.symbol}
                      </span>
                      {token.symbol === 'CDF' && (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Token Officiel Vérifié" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {token.name}
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <div className="mt-2 text-[10px] font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Check className="w-3 h-3 text-amber-500" />
                    <span>Actif sélectionné</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Note Spécifique si USDT n'est pas configuré sur le Testnet */}
        {!isUsdtConfigured && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Note USDT sur {activeNetwork.name} :</strong> Aucun contrat officiel USDT n'est déployé sur ce réseau de test. Conformément aux règles de sécurité, aucune adresse fictive n'est affichée.
            </div>
          </div>
        )}
      </div>

      {/* FICHE DÉTAILLÉE DE L'ACTIF SÉLECTIONNÉ */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              {currentAsset.name} ({currentAsset.symbol})
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {currentAsset.role}
            </span>
            {currentAsset.symbol === 'CDF' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Officiel RDC
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Décimales : <strong className="font-mono text-slate-800 dark:text-slate-200">{currentAsset.decimals}</strong>
          </span>
        </div>

        {/* Détail du Contrat BEP-20 pour CDF et USDT */}
        {currentAsset.contractAddress ? (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-mono text-[11px] break-all">
              <span className="font-sans font-semibold text-slate-500">Contrat :</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 select-all">
                {currentAsset.contractAddress}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                id="btn-copy-contract"
                onClick={() => handleCopyContract(currentAsset.contractAddress!)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {copiedContractNotification ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>{copiedContractNotification ? 'Contrat copié !' : 'Copier le contrat'}</span>
              </button>

              <a
                href={`${activeNetwork.blockExplorerUrl}/address/${currentAsset.contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Consulter le contrat sur BscScan"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition-colors"
              >
                <span>BscScan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            Monnaie native du protocole BSC utilisée pour exécuter les transactions et régler les frais de réseau (gas).
          </div>
        )}
      </div>

      {/* 3. CARTE PRINCIPALE : QR CODE & ADRESSE DE RÉCEPTION */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md text-center space-y-5">
        {/* Conteneur du QR Code Haute Définition */}
        <div className="relative inline-block p-4 rounded-3xl bg-white border border-slate-200 shadow-inner group">
          {isQrGenerating ? (
            <div className="w-64 h-64 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-semibold">Génération du QR Code sécurisé...</span>
            </div>
          ) : qrDataUrl ? (
            <div className="relative">
              <img
                src={qrDataUrl}
                alt={`QR Code de réception pour ${currentAsset.symbol}`}
                className="w-64 h-64 mx-auto rounded-xl select-none"
              />
              {/* Badge au centre ou en overlay discret */}
              <div className="absolute -bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950 text-white text-[10px] font-bold shadow-md">
                {currentAsset.symbol}
              </div>
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-rose-500 text-xs">
              Impossible de générer le QR Code
            </div>
          )}
        </div>

        {/* Phrase exigée sous le QR Code */}
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Scannez ce QR Code pour envoyer des fonds vers votre portefeuille
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Compatible avec Trust Wallet, MetaMask, Binance Web3 Wallet et tout portefeuille EVM
          </p>
        </div>

        {/* Boutons d'Action sur le QR Code (Agrandir + Partager) */}
        <div className="flex items-center justify-center gap-2.5 pt-1">
          <button
            type="button"
            id="btn-expand-qr"
            onClick={() => setShowExpandedQr(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Agrandir le QR Code</span>
          </button>

          <button
            type="button"
            id="btn-share-address"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Partager</span>
          </button>
        </div>

        {/* Toast / Bannière de confirmation de copie */}
        {copiedNotification && (
          <div
            id="copy-notification-toast"
            className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-1"
          >
            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* 4. ADRESSE DE RÉCEPTION COMPLÈTE & BOUTON COPIER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/90 dark:border-slate-700/80 text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Adresse de réception
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {formatAddress(walletAddress, 6)}
            </span>
          </div>

          {/* Affichage de l'adresse COMPLÈTE sans coupure */}
          <div
            id="wallet-public-address"
            className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 font-mono text-xs sm:text-sm font-extrabold text-slate-950 dark:text-slate-100 break-all select-all leading-relaxed tracking-tight"
          >
            {walletAddress}
          </div>

          {/* Bouton Principal « Copier l'adresse » */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              id="btn-copy-address-main"
              onClick={handleCopyAddress}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>Copier l'adresse</span>
            </button>

            <a
              href={`${activeNetwork.blockExplorerUrl}/address/${walletAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Consulter l'adresse sur BscScan"
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors"
            >
              <span>BscScan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Champ Optionnel : Demande d'un Montant Spécifique */}
        <div className="pt-2 text-left border-t border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Montant demandé (Optionnel) :
            </label>
            {requestedAmount && (
              <button
                type="button"
                onClick={() => setRequestedAmount('')}
                className="text-[11px] text-amber-600 hover:underline cursor-pointer"
              >
                Effacer le montant
              </button>
            )}
          </div>
          <div className="relative flex items-center">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Ex : 50000"
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
            <span className="absolute right-3 text-xs font-bold text-slate-500">
              {currentAsset.symbol}
            </span>
          </div>
          <p className="text-[10px] text-slate-400">
            Le QR Code encodera ce montant pour remplir automatiquement la transaction du débiteur.
          </p>
        </div>
      </div>

      {/* 5. AVERTISSEMENT EXIGÉ : SÉCURITÉ ET RÉSEAU */}
      <div
        id="network-warning-box"
        className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-950 dark:text-amber-200 flex items-start gap-3 shadow-2xs"
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 leading-relaxed">
          <div className="font-extrabold text-sm">
            Vérifiez toujours le réseau avant d'envoyer des fonds.
          </div>
          <p className="text-amber-900/90 dark:text-amber-300/90">
            Cette adresse publique accepte exclusivement les actifs émis sur la <strong>BNB Smart Chain (BEP-20)</strong> (tels que le token officiel <strong>CDF — Franc Congolais</strong>, BNB et USDT BEP-20). N'envoyez jamais de fonds provenant d'autres réseaux (ex: Ethereum, Bitcoin ou Solana) vers cette adresse sous peine de perte définitive.
          </p>
        </div>
      </div>

      {/* RAPPEL SUR LA SÉCURITÉ DE L'ADRESSE PUBLIQUE */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-slate-700 dark:text-slate-300">Sécurité Non-Custodiale :</span>
          <p>
            Votre adresse de réception est une <strong>donnée publique</strong> qui peut être partagée sans aucun risque. Votre clé privée et votre seed phrase restent chiffrées en local sur votre appareil et ne sont jamais requises pour recevoir des fonds.
          </p>
        </div>
      </div>

      {/* 6. MODAL D'AGRANDISSEMENT DU QR CODE */}
      {showExpandedQr && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowExpandedQr(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-md w-full shadow-2xl space-y-5 text-center relative animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bouton de Fermeture */}
            <button
              type="button"
              onClick={() => setShowExpandedQr(false)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Titre Modal */}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <QrIcon className="w-3.5 h-3.5" />
                <span>QR Code Agrandit · {currentAsset.symbol}</span>
              </div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                Scannez pour recevoir
              </h3>
              <p className="text-xs text-slate-400">Réseau : BNB Smart Chain</p>
            </div>

            {/* Image QR Code Haute Définition */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner inline-block mx-auto">
              {qrExpandedDataUrl ? (
                <img
                  src={qrExpandedDataUrl}
                  alt={`Grand QR Code pour ${currentAsset.symbol}`}
                  className="w-72 h-72 sm:w-80 sm:h-80 mx-auto rounded-lg select-none"
                />
              ) : (
                <div className="w-72 h-72 flex items-center justify-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            {/* Adresse Publique dans le Modal */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-left">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                Adresse Publique EVM
              </div>
              <div className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all select-all">
                {walletAddress}
              </div>
            </div>

            {/* Boutons d'Action dans le Modal */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyAddress}
                className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier l'adresse</span>
              </button>

              <button
                type="button"
                onClick={() => setShowExpandedQr(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
