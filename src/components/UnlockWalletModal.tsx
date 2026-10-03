/**
 * UnlockWalletModal — CDF Wallet
 * 
 * Écran de déverrouillage sécurisé par mot de passe local :
 * - « Déverrouiller le portefeuille »
 * - Validation locale sans transmission serveur
 * - Dérivation de clé cryptographique en direct via Web Crypto API
 * - Préparation de l'architecture pour la biométrie (Android Keystore / iOS Keychain / WebAuthn)
 */

import React, { useState } from 'react';
import { useWallet } from '../wallet';
import {
  Lock,
  Unlock,
  Key,
  Fingerprint,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
} from 'lucide-react';

interface UnlockWalletModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
  canDismiss?: boolean;
}

export const UnlockWalletModal: React.FC<UnlockWalletModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  canDismiss = true,
}) => {
  const { unlockWallet, isPasswordSet } = useWallet();
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Veuillez saisir votre mot de passe.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const success = await unlockWallet(password);
      if (success) {
        setPassword('');
        if (onSuccess) onSuccess();
        if (onClose) onClose();
      } else {
        setError('Mot de passe incorrect. Veuillez réessayer.');
      }
    } catch (err) {
      setError((err as Error).message || 'Erreur lors du déverrouillage.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBiometricClick = () => {
    setError('Authentification biométrique préparée pour les applications mobiles Android & iOS.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 space-y-5">
        {/* Bouton de fermeture si optionnel */}
        {canDismiss && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
            Déverrouiller le portefeuille
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Saisissez votre mot de passe local pour accéder à vos clés et signer vos transactions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mot de passe local
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] inline-flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Masquer' : 'Afficher'}</span>
              </button>
            </div>

            <input
              type={showPassword ? 'text' : 'password'}
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            id="btn-confirm-unlock-wallet"
            disabled={isProcessing || !password}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Déchiffrement local...</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Déverrouiller le portefeuille</span>
              </>
            )}
          </button>

          {/* Option Biométrie / Sécurité future */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center">
            <button
              type="button"
              onClick={handleBiometricClick}
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-slate-400" />
              <span>Biométrie (Touch ID / Face ID)</span>
            </button>
          </div>
        </form>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Verrouillage automatique actif après inactivité.</span>
        </div>
      </div>
    </div>
  );
};
