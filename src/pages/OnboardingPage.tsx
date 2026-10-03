import React, { useState } from 'react';
import { CdfLogo } from '../components/CdfLogo';
import { useWallet } from '../wallet';
import { WalletCore } from '../wallet/WalletCore';
import { CopyButton } from '../components/CopyButton';
import { CreateWalletModal } from '../components/CreateWalletModal';
import { ImportWalletModal } from '../components/ImportWalletModal';
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Key,
  Lock,
  DownloadCloud,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react';

interface OnboardingPageProps {
  onNavigate: (route: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { isPasswordSet } = useWallet();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 5;

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onNavigate('/wallet');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Progress Dots */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((step) => (
            <button
              key={step}
              type="button"
              onClick={() => setCurrentStep(step)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                currentStep === step
                  ? 'w-8 bg-amber-500'
                  : currentStep > step
                  ? 'w-2 bg-emerald-500'
                  : 'w-2 bg-slate-200 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/wallet')}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          Passer l'introduction
        </button>
      </div>

      {/* Main Stepped Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl min-h-[490px] flex flex-col justify-between">
        {/* ÉCRAN 1 : BIENVENUE DANS CDF WALLET */}
        {currentStep === 1 && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="flex justify-center">
              <CdfLogo size="xl" showText={false} />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                Étape 1 sur 5
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                Bienvenue dans CDF Wallet
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Le portefeuille moderne, performant et décentralisé conçu pour l’écosystème{' '}
                <strong className="text-slate-800 dark:text-slate-200">BNB Smart Chain</strong> et le token{' '}
                <strong className="text-amber-600 dark:text-amber-400">CDF — Franc Congolais</strong>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
              Gérez vos actifs BNB, CDF et USDT en toute autonomie avec une interface épurée, non-custodiale et réactive.
            </div>
          </div>
        )}

        {/* ÉCRAN 2 : VOTRE PORTEFEUILLE NON-CUSTODIAL */}
        {currentStep === 2 && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                Étape 2 sur 5
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                Votre Portefeuille Non-Custodial
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                Vous êtes l'unique propriétaire de vos actifs. Aucun tiers, aucune banque ni aucun serveur ne peut bloquer ou confisquer vos transactions.
              </p>
            </div>

            <div className="space-y-2 text-left">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Zéro intermédiaire financier entre vous et la blockchain.
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300">
                  Accès direct aux protocoles DeFi et aux transactions BSC.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ÉCRAN 3 : VOUS CONTRÔLEZ VOS CLÉS */}
        {currentStep === 3 && (
          <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Key className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                Étape 3 sur 5
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
                Vous Contrôlez Vos Clés
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                « Pas vos clés, pas vos cryptos ». Vos clés cryptographiques privées sont dérivées localement et chiffrées avec AES-GCM 256-bit.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Règle d'or de sécurité :</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Ne partagez jamais votre phrase de récupération (seed phrase). L'équipe CDF Wallet et Supabase ne vous la demanderont jamais.
              </p>
            </div>
          </div>
        )}

        {/* ÉCRAN 4 : CRÉER UN PORTEFEUILLE */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full">
                Étape 4 sur 5
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
                Créer un portefeuille
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Générez une seed phrase BIP-39 sécurisée de 12 mots, enregistrez-la et validez sa sauvegarde par notre test de vérification.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Processus guidé de sécurité :</span>
              </div>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1 list-disc list-inside">
                <li>Définition d'un mot de passe local pour chiffrer vos clés.</li>
                <li>« Sauvegardez votre phrase de récupération ».</li>
                <li>« Vérifier ma phrase » pour certifier votre sauvegarde.</li>
                <li>Activation immédiate : « Portefeuille créé ».</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="btn-launch-create-modal"
                onClick={() => setShowCreateModal(true)}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Créer un portefeuille</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(5)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                Ou importer un portefeuille existant →
              </button>
            </div>
          </div>
        )}

        {/* ÉCRAN 5 : IMPORTER UN PORTEFEUILLE */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200 my-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <DownloadCloud className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
                Étape 5 sur 5
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
                Importer un portefeuille
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Restaurez un portefeuille existant avec votre phrase secrète (12 ou 24 mots) ou votre clé privée hexadécimale.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-left space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-950 dark:text-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Garanties non-custodiales :</span>
              </div>
              <ul className="text-[11px] text-blue-900/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                <li>Validation locale et dérivation mathématique via ethers.js.</li>
                <li>Zéro envoi au backend ou à Supabase.</li>
                <li>Stockage chiffré par SecureStorage avec AES-GCM 256-bit.</li>
                <li>Confirmation immédiate : « Portefeuille importé ».</li>
              </ul>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                id="btn-launch-import-modal"
                onClick={() => setShowImportModal(true)}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Importer un portefeuille</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('/wallet')}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 font-semibold transition-colors cursor-pointer"
              >
                Continuer vers l'accueil du portefeuille →
              </button>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Précédent</span>
            </button>
          ) : (
            <div />
          )}

          <button
            id="onboarding-next-btn"
            type="button"
            onClick={nextStep}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-bold shadow-md hover:shadow-lg transition-all ml-auto cursor-pointer"
          >
            <span>{currentStep === totalSteps ? 'Terminer' : 'Suivant'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <CreateWalletModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          onNavigate('/wallet');
        }}
      />

      <ImportWalletModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          setShowImportModal(false);
          onNavigate('/wallet');
        }}
      />
    </div>
  );
};

