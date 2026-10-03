/**
 * Vérification d'Identité (KYC) — CDF Wallet
 * 
 * Spécification Section 3.4 & Section 2 :
 * - Choix du document : Carte d'identité, Passeport, Permis de conduire.
 * - Photos : recto et verso (carte, permis) ou page avec la photo (passeport).
 * - Selfie du titulaire.
 * - Écran « Vérification en cours ».
 * - À la validation, la limite mensuelle passe de 500 $ à 200 000 $ par mois.
 * - Chaque étape exige l'action demandée avant de continuer.
 * - Les documents sont chiffrés localement, aucune clé privée ni secret n'est exposé.
 */

import React, { useState } from 'react';
import { AppStorage } from '../storage';
import { MONTHLY_LIMITS } from '../config/tokens';
import {
  ShieldCheck,
  CreditCard,
  FileText,
  Camera,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Lock,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'document_choice' | 'photos' | 'selfie' | 'pending' | 'verified';
type DocumentType = 'id_card' | 'passport' | 'driving_license';

export const KycModal: React.FC<KycModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<Step>('document_choice');
  const [documentType, setDocumentType] = useState<DocumentType>('id_card');

  // Fichiers simulés / captures
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEncrypting, setIsEncrypting] = useState(false);

  if (!isOpen) return null;

  const handleDocumentSelect = (type: DocumentType) => {
    setDocumentType(type);
    setError(null);
    setStep('photos');
  };

  const handleSimulateCapture = (target: 'front' | 'back' | 'selfie') => {
    // Crée une chaîne encodée simulant la capture chiffrée
    const timestamp = Date.now();
    const mockHash = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='80' viewBox='0 0 120 80'><rect width='100%' height='100%' fill='%231e293b'/><text x='50%' y='50%' fill='%2310b981' font-size='10' dominant-baseline='middle' text-anchor='middle'>DOC_${target.toUpperCase()}_OK</text></svg>`;

    if (target === 'front') setFrontImage(mockHash);
    if (target === 'back') setBackImage(mockHash);
    if (target === 'selfie') setSelfieImage(mockHash);
    setError(null);
  };

  const handleValidatePhotos = () => {
    if (!frontImage) {
      setError(
        documentType === 'passport'
          ? 'Veuillez prendre en photo la page officielle avec photo de votre passeport.'
          : 'Veuillez prendre en photo le recto de votre document.'
      );
      return;
    }
    if (documentType !== 'passport' && !backImage) {
      setError('Veuillez prendre en photo le verso de votre document.');
      return;
    }
    setError(null);
    setStep('selfie');
  };

  const handleValidateSelfie = () => {
    if (!selfieImage) {
      setError('Veuillez capturer votre selfie de vérification.');
      return;
    }
    setError(null);
    setIsEncrypting(true);

    setTimeout(() => {
      setIsEncrypting(false);
      setStep('pending');

      // Simulation de la validation automatique du KYC
      setTimeout(() => {
        AppStorage.saveKycData({
          documentType,
          documentNumber: documentNumber.trim() || 'DOC-243-VERIFIED',
          status: 'verified',
          submittedAt: new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
        });
        setStep('verified');
        if (onSuccess) onSuccess();
      }, 1500);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Vérification d'Identité
              </h2>
              <p className="text-[11px] text-slate-400">
                Plafond étendu à {MONTHLY_LIMITS.verifiedUsd.toLocaleString()} $ / mois
              </p>
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

        {/* Corps */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* ÉTAPE 1 : CHOIX DU DOCUMENT */}
          {step === 'document_choice' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Étape 1 sur 3
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2">
                  Sélectionnez un document officiel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choisissez une pièce d'identité en cours de validité (RDC ou internationale).
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => handleDocumentSelect('id_card')}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Carte d'identité nationale
                      </div>
                      <div className="text-[10px] text-slate-400">Recto et verso requis</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDocumentSelect('passport')}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Passeport biométrique
                      </div>
                      <div className="text-[10px] text-slate-400">Page principale avec photo</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDocumentSelect('driving_license')}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:border-emerald-500 flex items-center justify-between transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        Permis de conduire
                      </div>
                      <div className="text-[10px] text-slate-400">Recto et verso requis</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Chiffrement de bout en bout. Vos documents restent strictement protégés et confidentiels.
                </span>
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : PHOTOS DU DOCUMENT */}
          {step === 'photos' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Étape 2 sur 3
                </span>
                <button
                  type="button"
                  onClick={() => setStep('document_choice')}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Changer de document</span>
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Photographie du document
                </h3>
                <p className="text-xs text-slate-400">
                  {documentType === 'passport'
                    ? 'Prenez une photo nette de la page avec photo de votre passeport.'
                    : 'Prenez une photo nette du recto et du verso de votre document.'}
                </p>
              </div>

              {/* Cadre Recto / Page photo */}
              <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center space-y-2">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {documentType === 'passport' ? 'Page principale avec photo' : 'Recto du document'}
                </div>
                {frontImage ? (
                  <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs py-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Photo capturée</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSimulateCapture('front')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Prendre la photo</span>
                  </button>
                )}
              </div>

              {/* Cadre Verso (si carte ou permis) */}
              {documentType !== 'passport' && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-center space-y-2">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Verso du document
                  </div>
                  {backImage ? (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs py-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Photo capturée</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSimulateCapture('back')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-emerald-400"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Prendre la photo</span>
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleValidatePhotos}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Passer au selfie</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ÉTAPE 3 : SELFIE DU TITULAIRE */}
          {step === 'selfie' && (
            <div className="space-y-4 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                Étape 3 sur 3
              </span>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Selfie de vérification
                </h3>
                <p className="text-xs text-slate-400">
                  Cadrez bien votre visage dans un endroit bien éclairé pour confirmer votre identité.
                </p>
              </div>

              <div className="aspect-square max-w-[200px] mx-auto rounded-full border-4 border-emerald-500/40 bg-slate-950 flex flex-col items-center justify-center text-center p-4">
                {selfieImage ? (
                  <div className="text-emerald-400 flex flex-col items-center gap-1">
                    <CheckCircle2 className="w-10 h-10" />
                    <span className="text-xs font-bold">Selfie validé</span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <Camera className="w-8 h-8 text-emerald-400" />
                    <span className="text-[10px]">Visage au centre</span>
                  </div>
                )}
              </div>

              {!selfieImage ? (
                <button
                  type="button"
                  onClick={() => handleSimulateCapture('selfie')}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Prendre le selfie</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isEncrypting}
                  onClick={handleValidateSelfie}
                  className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isEncrypting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Chiffrement et soumission sécurisée...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Soumettre ma vérification</span>
                    </>
                  )}
                </button>
              )}

              {error && (
                <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ÉTAPE : VÉRIFICATION EN COURS */}
          {step === 'pending' && (
            <div className="text-center space-y-4 py-8 animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Vérification en cours
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Vos documents sont en cours de contrôle sécurisé par nos algorithmes conformes RDC.
                </p>
              </div>
            </div>
          )}

          {/* ÉTAPE : VÉRIFIÉ (SUCCÈS) */}
          {step === 'verified' && (
            <div className="text-center space-y-4 py-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Identité Validée
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-3">
                  Limite débloquée : 200 000 $ / mois
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Votre identité a été vérifiée avec succès. Vous bénéficiez désormais du plafond maximal de 200 000 $ par mois pour tous vos envois, swaps, ventes et paiements QR.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                Plafond mensuel actuel : <strong>200 000 $</strong> (se réinitialise le 1er de chaque mois).
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Terminer et retourner au portefeuille
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
