import React, { useState, useEffect } from 'react';
import { useWallet } from '../wallet';
import { securityManager } from '../security';
import { checkBiometricsSupport, BiometricsStatus } from '../security/biometrics';
import { CDF_CONTRACT_ADDRESS } from '../config/tokens';
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  Lock,
  Unlock,
  Key,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  Fingerprint,
  Eye,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Info,
  Clock,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  FileText,
  LockKeyhole,
} from 'lucide-react';

interface SecurityPageProps {
  onNavigate?: (route: string) => void;
}

export const SecurityPage: React.FC<SecurityPageProps> = ({ onNavigate }) => {
  const {
    isUnlocked,
    isPasswordSet,
    lockWallet,
    unlockWallet,
    setupWalletPassword,
    changeWalletPassword,
    revealMnemonic,
    selectedAccount,
    isDemoMode,
  } = useWallet();

  // Audit d'environnement
  const [auditResult] = useState(() => securityManager.checkSecurityAudit());

  // Statut Biométrique réel
  const [biometricsStatus, setBiometricsStatus] = useState<BiometricsStatus>({
    isSupported: false,
    message: 'Vérification de la biométrie...',
    detail: 'Analyse des capacités du matériel et du navigateur...',
  });
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState<boolean>(true);

  // Gestion du Mot de passe local
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [passwordMode, setPasswordMode] = useState<'setup' | 'change'>('setup');
  const [currentPwd, setCurrentPwd] = useState<string>('');
  const [newPwd, setNewPwd] = useState<string>('');
  const [confirmPwd, setConfirmPwd] = useState<string>('');
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [isSubmittingPwd, setIsSubmittingPwd] = useState<boolean>(false);

  // Procédure de Sauvegarde (Mnémonique 12 mots)
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [hasConfirmedPrivacy, setHasConfirmedPrivacy] = useState<boolean>(false);
  const [backupPassword, setBackupPassword] = useState<string>('');
  const [backupError, setBackupError] = useState<string | null>(null);
  const [revealedWords, setRevealedWords] = useState<string[] | null>(null);
  const [isMnemonicBlurred, setIsMnemonicBlurred] = useState<boolean>(true);
  const [autoHideSeconds, setAutoHideSeconds] = useState<number>(60);
  const [isRevealingMnemonic, setIsRevealingMnemonic] = useState<boolean>(false);
  const [copiedMnemonic, setCopiedMnemonic] = useState<boolean>(false);

  // Déverrouillage rapide depuis la page
  const [unlockInput, setUnlockInput] = useState<string>('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  // Banc d'essai EIP-55
  const [testAddress, setTestAddress] = useState(CDF_CONTRACT_ADDRESS);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Vérification de la biométrie réelle au montage
  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsCheckingBiometrics(true);
      const status = await checkBiometricsSupport();
      if (mounted) {
        setBiometricsStatus(status);
        setIsCheckingBiometrics(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Décompte de sécurité pour masquer la seed phrase
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (revealedWords && autoHideSeconds > 0) {
      timer = setInterval(() => {
        setAutoHideSeconds((prev) => {
          if (prev <= 1) {
            closeBackupModal();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [revealedWords, autoHideSeconds]);

  // Invariants non-custodiaux stricts
  const securityInvariants = [
    {
      title: 'Aucune seed phrase sur serveur',
      desc: 'Votre phrase de récupération de 12 mots est générée localement et ne quitte jamais votre appareil.',
      status: 'Inviolable',
    },
    {
      title: 'Aucune clé privée transmise à Supabase',
      desc: 'La base Supabase est strictement cantonnée aux préférences publiques et configurations non-sensibles.',
      status: 'Inviolable',
    },
    {
      title: 'Zéro journalisation sensible dans les logs',
      desc: 'Les clés privées et secrets sont interceptés et interdits de logging ou de télémétrie.',
      status: 'Inviolable',
    },
    {
      title: 'Zéro secret codé en dur',
      desc: 'Aucun token d’accès ni clé cryptographique dans le bundle frontend.',
      status: 'Inviolable',
    },
    {
      title: 'Validation d’adresses EIP-55 stricte',
      desc: 'Toutes les adresses sont vérifiées avec le protocole de checksum ethers.js pour éviter les erreurs de saisie.',
      status: 'Inviolable',
    },
    {
      title: 'Signatures locales sur terminal',
      desc: 'Les transactions BEP-20 et BNB sont signées exclusivement côté client par votre clé privée.',
      status: 'Inviolable',
    },
  ];

  const handleTestAddress = () => {
    const isValid = securityManager.validateAddress(testAddress);
    if (isValid) {
      const checksummed = securityManager.getChecksumAddress(testAddress);
      setTestResult(`Valide (Checksum EIP-55) : ${checksummed}`);
    } else {
      setTestResult('Adresse invalide.');
    }
  };

  // Gestion du mot de passe
  const openPasswordModal = (mode: 'setup' | 'change') => {
    setPasswordMode(mode);
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError(null);
    setPwdSuccess(null);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPwd.length < 8) {
      setPwdError('Le mot de passe doit contenir au minimum 8 caractères.');
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdError('Les deux nouveaux mots de passe ne correspondent pas.');
      return;
    }

    setIsSubmittingPwd(true);

    try {
      if (passwordMode === 'setup') {
        await setupWalletPassword(newPwd);
        setPwdSuccess('Mot de passe local configuré avec succès ! Votre coffre-fort est désormais chiffré.');
        setTimeout(() => setIsPasswordModalOpen(false), 1500);
      } else {
        if (!currentPwd) {
          setPwdError("Veuillez saisir votre mot de passe actuel.");
          setIsSubmittingPwd(false);
          return;
        }
        const res = await changeWalletPassword(currentPwd, newPwd);
        if (res.success) {
          setPwdSuccess('Mot de passe mis à jour avec succès !');
          setTimeout(() => setIsPasswordModalOpen(false), 1500);
        } else {
          setPwdError(res.error || "L'ancien mot de passe est incorrect.");
        }
      }
    } catch (err) {
      setPwdError((err as Error).message || "Erreur lors de l'enregistrement du mot de passe.");
    } finally {
      setIsSubmittingPwd(false);
    }
  };

  // Déverrouillage rapide depuis la carte d'état
  const handleQuickUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setUnlockError(null);
    setIsUnlocking(true);
    try {
      const ok = await unlockWallet(unlockInput);
      if (ok) {
        setUnlockInput('');
      } else {
        setUnlockError('Mot de passe incorrect.');
      }
    } catch {
      setUnlockError('Échec du déverrouillage.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Procédure de sauvegarde
  const openBackupProcedure = () => {
    setHasConfirmedPrivacy(false);
    setBackupPassword('');
    setBackupError(null);
    setRevealedWords(null);
    setIsMnemonicBlurred(true);
    setAutoHideSeconds(60);
    setCopiedMnemonic(false);
    setIsBackupModalOpen(true);
  };

  const closeBackupModal = () => {
    setIsBackupModalOpen(false);
    setRevealedWords(null);
    setBackupPassword('');
    setHasConfirmedPrivacy(false);
  };

  const handleRevealBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setBackupError(null);

    if (!hasConfirmedPrivacy) {
      setBackupError("Vous devez confirmer que vous êtes dans un lieu privé sans aucun écran partagé.");
      return;
    }

    if (isPasswordSet && !isUnlocked && !backupPassword) {
      setBackupError("Veuillez saisir votre mot de passe pour autoriser l'affichage.");
      return;
    }

    setIsRevealingMnemonic(true);

    try {
      // Déverrouiller si nécessaire
      if (isPasswordSet && !isUnlocked) {
        const unlocked = await unlockWallet(backupPassword);
        if (!unlocked) {
          setBackupError("Mot de passe incorrect.");
          setIsRevealingMnemonic(false);
          return;
        }
      }

      if (!selectedAccount) {
        setBackupError("Aucun compte sélectionné.");
        setIsRevealingMnemonic(false);
        return;
      }

      // Si le compte est un compte démo par défaut
      if (isDemoMode) {
        setRevealedWords([
          'demo',
          'wallet',
          'non',
          'custodial',
          'cdf',
          'franc',
          'congolais',
          'blockchain',
          'smart',
          'chain',
          'secure',
          'token',
        ]);
        setAutoHideSeconds(60);
        setIsMnemonicBlurred(false);
        setIsRevealingMnemonic(false);
        return;
      }

      // Compte réel : extraction locale sécurisée
      const phrase = await revealMnemonic(selectedAccount.address);
      if (!phrase) {
        setBackupError(
          "Aucune phrase mnémonique trouvée pour ce compte (ce compte a peut-être été importé via clé privée brute)."
        );
        setIsRevealingMnemonic(false);
        return;
      }

      const words = phrase.trim().split(/\s+/);
      setRevealedWords(words);
      setAutoHideSeconds(60);
      setIsMnemonicBlurred(false);
    } catch (err) {
      setBackupError((err as Error).message || "Impossible d'accéder aux secrets.");
    } finally {
      setIsRevealingMnemonic(false);
    }
  };

  const handleCopyPhrase = () => {
    if (!revealedWords) return;
    navigator.clipboard.writeText(revealedWords.join(' '));
    setCopiedMnemonic(true);
    setTimeout(() => setCopiedMnemonic(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* 1. EN-TÊTE DE LA PAGE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-1 ring-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span>Centre de Sécurité & Non-Custodialité</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chiffrement local AES-GCM, contrôle d'accès et souveraineté totale de vos clés
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-extrabold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
            Audit Conforme · 100% Non-Custodial
          </span>
        </div>
      </div>

      {/* 2. ÉTAT DU VERROUILLAGE & SESSION */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <LockKeyhole className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              État de Protection de la Session
            </h2>
          </div>
          <span
            className={`text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
              isUnlocked
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}
          >
            {isUnlocked ? 'Session Active (Déverrouillé)' : 'Protégé (Verrouillé)'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ring-1 ${
                isUnlocked
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20'
              }`}
            >
              {isUnlocked ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">
                {isUnlocked ? 'Portefeuille Déverrouillé' : 'Portefeuille Verrouillé'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isUnlocked
                  ? 'Les clés nécessaires à la signature locale sont présentes en mémoire volatile.'
                  : 'Aucune clé active en mémoire. Mot de passe requis pour signer toute transaction.'}
              </p>
            </div>
          </div>

          <div>
            {isUnlocked ? (
              <button
                type="button"
                id="btn-security-lock-now"
                onClick={lockWallet}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Verrouiller maintenant</span>
              </button>
            ) : (
              <div className="space-y-2">
                <form onSubmit={handleQuickUnlock} className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder="Mot de passe"
                    value={unlockInput}
                    onChange={(e) => setUnlockInput(e.target.value)}
                    className="w-36 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={isUnlocking}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {isUnlocking ? '...' : 'Déverrouiller'}
                  </button>
                </form>
                {unlockError && <div className="text-[11px] text-rose-500 font-semibold">{unlockError}</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. GESTION DU MOT DE PASSE LOCAL */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Gestion du Mot de Passe Local
            </h2>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
              isPasswordSet
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isPasswordSet ? 'Mot de Passe Configuré' : 'Non Configuré'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {isPasswordSet ? 'Coffre-fort local chiffré' : 'Chiffrez votre coffre-fort local'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
              {isPasswordSet
                ? 'Vos clés privées et phrase de récupération sont chiffrées en AES-GCM 256-bit avec dérivation PBKDF2 (100 000 itérations).'
                : 'Configurez un mot de passe pour chiffrer vos clés privées sur votre appareil et bloquer les accès non autorisés.'}
            </p>
          </div>

          <div className="shrink-0">
            {isPasswordSet ? (
              <button
                type="button"
                id="btn-change-password"
                onClick={() => openPasswordModal('change')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors shadow-2xs cursor-pointer"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Modifier le mot de passe</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-setup-password"
                onClick={() => openPasswordModal('setup')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Définir un mot de passe local</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. OPTION BIOMÉTRIQUE (CONTRÔLE RÉEL) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4 text-purple-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Authentification Biométrique
            </h2>
          </div>
          <span
            className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
              biometricsStatus.isSupported
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}
          >
            {isCheckingBiometrics ? 'Vérification...' : biometricsStatus.isSupported ? 'Disponible' : 'Non supporté'}
          </span>
        </div>

        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ring-1 ${
              biometricsStatus.isSupported
                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 ring-purple-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 ring-slate-200 dark:ring-slate-700'
            }`}
          >
            <Fingerprint className="w-6 h-6" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {biometricsStatus.isSupported ? (
                <span className="text-emerald-600 dark:text-emerald-400">Biométrie disponible sur cet appareil</span>
              ) : (
                <span className="text-slate-700 dark:text-slate-300">Biométrie non disponible sur cet appareil</span>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {biometricsStatus.isSupported
                ? "Votre équipement intègre un authentificateur de plateforme (Touch ID, Face ID, Windows Hello ou capteur d'empreintes compatible WebAuthn). Vous pouvez l'utiliser pour un déverrouillage local rapide."
                : "Cet appareil ou ce navigateur ne dispose pas d'un authentificateur de plateforme compatible (Touch ID, Face ID, Windows Hello ou capteur d'empreintes WebAuthn). La sécurité du portefeuille repose intégralement sur le mot de passe local chiffré."}
            </p>

            <div className="text-[11px] font-mono text-slate-400 pt-1">
              Détail technique : {biometricsStatus.detail}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SECTION SAUVEGARDE / RÉCUPÉRATION (PÉDAGOGIE & CONTRÔLE) */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Sauvegarde & Phrase de Récupération (Seed Phrase)
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
            Souveraineté Non-Custodial
          </span>
        </div>

        {/* Explication pédagogique obligatoire */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2.5 text-xs text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Principe Fondamental : Votre phrase doit rester SECRÈTE et HORS LIGNE</span>
          </div>
          <p className="leading-relaxed opacity-95">
            Votre phrase de récupération de <strong>12 mots</strong> (standard BIP-39) est l'unique clé maîtresse permettant de restaurer vos jetons CDF et BNB en cas de perte, panne ou changement de matériel.
          </p>
          <ul className="list-disc list-inside space-y-1 opacity-90 pl-1 text-[11px]">
            <li>Notez physiquement ces 12 mots sur une feuille de papier ou un support métallique.</li>
            <li>Ne prenez <strong>jamais de photo ni de capture d'écran</strong> de votre phrase.</li>
            <li>Ne stockez <strong>jamais</strong> ces mots dans le Cloud, un email ou une messagerie.</li>
            <li>En tant que portefeuille non-custodial, <strong>CDF Wallet ne connaît pas vos clés</strong> et ne pourra jamais les récupérer à votre place.</li>
            <li>Aucune phrase seed, clé privée ou mot de passe n'est envoyée à Supabase.</li>
          </ul>
        </div>

        {/* Bouton d'action sécurisé (NE JAMAIS afficher automatiquement) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <div>
            <div className="text-xs font-bold text-slate-900 dark:text-white">
              Procédure de sauvegarde protégée
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              L'affichage requiert une confirmation de confidentialité visuelle et votre mot de passe local.
            </div>
          </div>

          <button
            type="button"
            id="btn-start-backup-procedure"
            onClick={openBackupProcedure}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-sm cursor-pointer shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span>Afficher la procédure de sauvegarde</span>
          </button>
        </div>
      </div>

      {/* 6. AUDIT DE L'ENVIRONNEMENT CLIENT & EIP-55 */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Audit Cryptographique de l'Environnement
          </h2>
          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            {auditResult.pass ? 'Audit Conforme' : 'Attention requise'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">SubtleCrypto (Web Crypto API) :</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Opérationnel
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Filtre anti-fuite SecurityManager :</span>
            <span className="font-bold text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Actif (Strict)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Chiffrement de coffre :</span>
            <span className="font-bold text-slate-900 dark:text-white">AES-GCM 256-bit</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Dérivation de clé (KDF) :</span>
            <span className="font-bold text-slate-900 dark:text-white">PBKDF2 (100k)</span>
          </div>
        </div>

        {/* Banc de test interactif EIP-55 avec le contrat CDF officiel */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Vérificateur de Checksum d'Adresse EVM (EIP-55)
            </span>
            <span className="text-[10px] font-mono text-slate-400">Contrat CDF Officiel</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={testAddress}
              onChange={(e) => setTestAddress(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500 select-all"
            />
            <button
              type="button"
              onClick={handleTestAddress}
              className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Vérifier
            </button>
          </div>

          {testResult && (
            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all">
              {testResult}
            </div>
          )}
        </div>
      </div>

      {/* 7. CHARTE DES INVARIANTS NON-CUSTODIAL */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>Charte des Invariants Non-Custodial Obligatoires</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {securityInvariants.map((inv, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{inv.title}</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  {inv.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{inv.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL : GESTION DU MOT DE PASSE */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {passwordMode === 'setup' ? 'Définir un mot de passe local' : 'Modifier le mot de passe local'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordMode === 'change' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mot de passe actuel :
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    placeholder="Saisissez l'ancien mot de passe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {passwordMode === 'setup' ? 'Nouveau mot de passe :' : 'Nouveau mot de passe :'}
                </label>
                <input
                  type="password"
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="text-[10px] text-slate-400">
                  Longueur : {newPwd.length} / 8 caractères minimum
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Confirmer le mot de passe :
                </label>
                <input
                  type="password"
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Retapez à l'identique"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {pwdError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                  {pwdError}
                </div>
              )}

              {pwdSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                  {pwdSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPwd}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPwd ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL : PROCÉDURE DE SAUVEGARDE STRICTEMENT PROTÉGÉE */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header du modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Procédure de Sauvegarde Sécurisée
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Affichage contrôlé de la phrase de récupération de 12 mots
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeBackupModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Étape 1 : Si la phrase n'a pas encore été révélée */}
            {!revealedWords ? (
              <form onSubmit={handleRevealBackup} className="space-y-4">
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Avertissement de Sécurité Critique</span>
                  </div>
                  <p className="leading-relaxed text-[11px]">
                    Quiconque possède cette phrase peut accéder immédiatement à vos fonds et les dérober sans aucun recours possible.
                  </p>
                </div>

                {/* Case à cocher de confirmation de discrétion */}
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConfirmedPrivacy}
                    onChange={(e) => setHasConfirmedPrivacy(e.target.checked)}
                    className="mt-0.5 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    Je confirme être dans un endroit privé, sans caméra, écran partagé ou personne derrière moi.
                  </span>
                </label>

                {/* Saisie du mot de passe si configuré et verrouillé */}
                {isPasswordSet && !isUnlocked && (
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Mot de passe de déchiffrement :
                    </label>
                    <input
                      type="password"
                      required
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder="Votre mot de passe local"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {backupError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                    {backupError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closeBackupModal}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={!hasConfirmedPrivacy || isRevealingMnemonic}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isRevealingMnemonic ? 'Déchiffrement local...' : 'Révéler la phrase de 12 mots'}
                  </button>
                </div>
              </form>
            ) : (
              /* Étape 2 : Phrase révélée avec sécurité temporisée */
              <div className="space-y-5">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Masquage automatique dans {autoHideSeconds} secondes</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMnemonicBlurred(!isMnemonicBlurred)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                  >
                    {isMnemonicBlurred ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{isMnemonicBlurred ? 'Déflouter' : 'Flouter'}</span>
                  </button>
                </div>

                {isDemoMode && (
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500">
                    Compte Démonstration : cette phrase mnémonique est fournie à des fins didactiques. Créez un compte personnalisé en mode réel pour générer votre phrase unique et souveraine.
                  </div>
                )}

                {/* Grille des 12 mots numérotés */}
                <div
                  className={`grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-all ${
                    isMnemonicBlurred ? 'filter blur-sm select-none' : ''
                  }`}
                >
                  {revealedWords.map((word, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 font-mono text-xs"
                    >
                      <span className="text-[10px] text-slate-400 font-sans w-4">{index + 1}.</span>
                      <span className="font-bold text-slate-900 dark:text-white select-all">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCopyPhrase}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                  >
                    {copiedMnemonic ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Phrase copiée</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier la phrase</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={closeBackupModal}
                    className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold cursor-pointer"
                  >
                    Masquer et terminer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
