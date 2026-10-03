/**
 * Mes QR — Tarifs Commerçants et Paiement Transport
 * 
 * Spécification Section 3.10 :
 * - Les utilisateurs créent eux-mêmes des QR de prix et de tarifs (transport, produit, autre) avec un nom et un prix en dollars.
 * - Le QR contient le prix, le nom du tarif et l'adresse du commerçant.
 * - Le client scanne le QR (/scan), voit le prix, les frais de 2 % et le total débité, puis confirme avec son code à 6 chiffres.
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useWallet } from '../wallet';
import { AppStorage } from '../storage';
import { MerchantQr } from '../types';
import { formatAddress, formatFiatValue } from '../blockchain/utils';
import {
  QrCode,
  Plus,
  Trash2,
  Share2,
  Copy,
  Check,
  Tag,
  Bus,
  ShoppingBag,
  Sparkles,
  ExternalLink,
  X,
  Eye,
} from 'lucide-react';

interface MerchantQrPageProps {
  onNavigate?: (route: string) => void;
}

export const MerchantQrPage: React.FC<MerchantQrPageProps> = ({ onNavigate }) => {
  const { selectedAccount } = useWallet();
  const [qrs, setQrs] = useState<MerchantQr[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activePreviewQr, setActivePreviewQr] = useState<MerchantQr | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Champs de création
  const [title, setTitle] = useState('');
  const [amountUsd, setAmountUsd] = useState('2.5');
  const [category, setCategory] = useState<'transport' | 'commerce' | 'service' | 'autre'>('transport');
  const [notes, setNotes] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const loadQrs = () => {
    const list = AppStorage.getMerchantQrs();
    setQrs(list);
  };

  useEffect(() => {
    loadQrs();
  }, []);

  // Génération du QR code visuel lorsqu'un tarif est sélectionné
  useEffect(() => {
    if (activePreviewQr) {
      // Format standard JSON lisible et universel par le scanner
      const payload = JSON.stringify({
        type: 'cdf_merchant_payment',
        version: 1,
        title: activePreviewQr.title,
        amountUsd: activePreviewQr.amountUsd,
        merchantAddress: activePreviewQr.merchantAddress,
        category: activePreviewQr.category,
      });

      QRCode.toDataURL(payload, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch(() => setQrCodeDataUrl(''));
    } else {
      setQrCodeDataUrl('');
    }
  }, [activePreviewQr]);

  const handleCreateQr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError('Veuillez renseigner le nom du tarif ou produit.');
      return;
    }
    const num = parseFloat(amountUsd);
    if (isNaN(num) || num <= 0) {
      setCreateError('Le montant doit être supérieur à zéro.');
      return;
    }

    const newQr: MerchantQr = {
      id: `qr-${Date.now()}`,
      title: title.trim(),
      amountUsd: num,
      category,
      merchantAddress: selectedAccount?.address || '0x0E9dBe33a4fb33Fc9e6595A154538D721965401b',
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    AppStorage.saveMerchantQr(newQr);
    loadQrs();
    setShowCreateModal(false);
    setTitle('');
    setAmountUsd('2.5');
    setNotes('');
    setCreateError(null);
    setActivePreviewQr(newQr);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    AppStorage.deleteMerchantQr(id);
    if (activePreviewQr?.id === id) setActivePreviewQr(null);
    loadQrs();
  };

  const handleCopyPayload = (qr: MerchantQr, e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = JSON.stringify({
      type: 'cdf_merchant_payment',
      title: qr.title,
      amountUsd: qr.amountUsd,
      merchantAddress: qr.merchantAddress,
    });
    navigator.clipboard.writeText(payload);
    setCopiedId(qr.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 text-amber-500" />
            <span>Mes QR de Prix & Tarifs</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Créez des QR codes pour encaissement direct en commerce et transport
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau QR</span>
        </button>
      </div>

      {/* Explication règle métier */}
      <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-amber-500" />
          <span>Principe des paiements QR marchands :</span>
        </div>
        <p className="leading-relaxed text-[11px] text-slate-500 dark:text-slate-400">
          Les clients scannent votre QR, visualisent le prix net, les <strong>2 % de frais</strong> ajoutés au montant et confirment avec leur code à 6 chiffres. Vous recevez toujours <strong>100 % du montant du tarif</strong> sur votre adresse.
        </p>
      </div>

      {/* Liste des QR créés */}
      <div className="space-y-3">
        {qrs.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 space-y-3">
            <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
            <div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Aucun QR de prix créé
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Créez vos tarifs pour commencer à encaisser vos clients en transport ou commerce.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer hover:bg-amber-400"
            >
              Créer mon premier QR
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {qrs.map((qr) => (
              <div
                key={qr.id}
                onClick={() => setActivePreviewQr(qr)}
                className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 transition-all shadow-xs hover:shadow-md cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {qr.category === 'transport'
                        ? 'Transport'
                        : qr.category === 'commerce'
                        ? 'Commerce'
                        : qr.category === 'service'
                        ? 'Service'
                        : 'Autre'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(qr.id, e)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-2">
                    {qr.title}
                  </h3>
                  {qr.notes && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{qr.notes}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                    {qr.amountUsd.toFixed(2)} $
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyPayload(qr, e)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-amber-500 transition-colors"
                      title="Copier le code"
                    >
                      {copiedId === qr.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl">
                      <Eye className="w-3 h-3" />
                      <span>Afficher</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal d'affichage grand format pour scan par le client */}
      {activePreviewQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 text-center space-y-4">
            <button
              type="button"
              onClick={() => setActivePreviewQr(null)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full">
                À faire scanner par le client
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1.5">
                {activePreviewQr.title}
              </h2>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {activePreviewQr.amountUsd.toFixed(2)} $
              </div>
            </div>

            {/* QR code grand format */}
            <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-inner max-w-[260px] mx-auto flex items-center justify-center">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt={`QR de ${activePreviewQr.title}`}
                  className="w-full h-auto rounded-xl"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  Génération du QR...
                </div>
              )}
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Adresse commerçant :</div>
              <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {formatAddress(activePreviewQr.merchantAddress, 6)}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Le client paiera {activePreviewQr.amountUsd.toFixed(2)} $ + 2 % de frais. Vous recevrez {activePreviewQr.amountUsd.toFixed(2)} $ nets.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActivePreviewQr(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Modal Création Nouveau QR */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Créer un QR de prix
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQr} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nom du tarif ou produit *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Course Bus Gombe-Victoire"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Prix en dollars (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  placeholder="2.50"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Catégorie
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'transport', label: 'Transport' },
                    { id: 'commerce', label: 'Commerce' },
                    { id: 'service', label: 'Service' },
                    { id: 'autre', label: 'Autre' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`py-1.5 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                        category === cat.id
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Note ou description (facultatif)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex : Aller simple par passager"
                  className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {createError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs">
                  {createError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Générer le QR de prix
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
