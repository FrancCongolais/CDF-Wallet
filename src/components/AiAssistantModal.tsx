/**
 * Assistant IA — CDF Wallet
 * 
 * Spécification Section 3.12 :
 * Répond aux questions sur :
 * - Le dépôt minimum (10 $ à la création, ou 15 $ par Visa)
 * - Les frais (2 % envoi/QR, 3 % achat/vente de CDF, 3 % swap avec CDF, 2 % swap sans CDF)
 * - L'achat de CDF (Mobile Money M-Pesa, Airtel Money, Orange Money +243, ou Carte Visa)
 * - Le paiement par QR (création de tarifs commerçants et transport)
 * - La phrase perdue (portefeuille non-custodial, clés stockées localement, jamais sur le serveur)
 * 
 * Si la question n'est pas reconnue ou nécessite une intervention humaine :
 * Renvoi systématique vers le support officiel : franc.congolais.fc@gmail.com
 */

import React, { useState, useRef, useEffect } from 'react';
import { CDF_SUPPORT_EMAIL, CDF_CONTRACT_ADDRESS, FEE_CONFIG, MIN_AMOUNTS, MONTHLY_LIMITS } from '../config/tokens';
import {
  Bot,
  Send,
  X,
  Mail,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Coins,
  QrCode,
  CreditCard,
  ExternalLink,
} from 'lucide-react';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  showSupportEmail?: boolean;
  actionRoute?: string;
  actionLabel?: string;
}

const FAQ_SUGGESTIONS = [
  'Quel est le dépôt minimum ?',
  'Quels sont les frais de transaction ?',
  'Comment acheter des CDF ?',
  'Comment fonctionnent les QR de paiement ?',
  'J’ai perdu ma phrase de récupération',
  'Quelles sont les limites mensuelles ?',
];

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Bonjour ! Je suis l’assistant officiel de CDF Wallet. Je peux vous renseigner sur le fonctionnement de votre portefeuille non-custodial, le token CDF, les frais, le dépôt minimum, et les paiements par QR.',
      timestamp: Date.now(),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    // Analyse intelligente des intentions selon la spécification
    setTimeout(() => {
      const lower = query.toLowerCase();
      let reply = '';
      let showSupport = false;
      let actionRoute: string | undefined = undefined;
      let actionLabel: string | undefined = undefined;

      if (lower.includes('dépôt minimum') || lower.includes('depot minimum') || lower.includes('10 $') || lower.includes('10$') || lower.includes('activer')) {
        reply = `Le dépôt initial obligatoire pour activer un nouveau portefeuille CDF Wallet est de 10 $ par Mobile Money (M-Pesa, Airtel Money, Orange Money). Si vous utilisez une carte Visa, le minimum est de 15 $. En cas d’échec du paiement, votre portefeuille reste en attente d’activation et vous pouvez réessayer à tout moment.`;
        actionRoute = '/wallet';
        actionLabel = 'Voir mon portefeuille';
      } else if (lower.includes('frais') || lower.includes('commission') || lower.includes('pourcentage') || lower.includes('2 %') || lower.includes('3 %')) {
        reply = `Voici la grille des frais validée pour CDF Wallet :\n\n• Envoi et paiement QR : 2 % (payés par l’expéditeur et ajoutés au montant. Le destinataire reçoit toujours le montant complet à 100 %).\n• Achat ou vente de CDF : 3 % (2 % portefeuille perçus sur l’adresse d’administration 0x0E9dBe33a4fb33Fc9e6595A154538D721965401b + 1 % intégré au contrat du token CDF).\n• Échange / Swap avec CDF : 3 %.\n• Échange / Swap sans CDF : 2 %.\n\nLe token CDF a obtenu 0 risque et 0 avertissement lors de l’audit Binance.`;
      } else if (lower.includes('acheter') || lower.includes('achat') || lower.includes('vendre') || lower.includes('vente') || lower.includes('mobile money') || lower.includes('visa')) {
        reply = `Vous pouvez acheter ou vendre des CDF très simplement :\n\n• Achat : par Mobile Money (M-Pesa, Airtel Money, Orange Money au numéro +243 à 9 chiffres) à partir de 8 $, ou par Carte Visa (16 chiffres) à partir de 15 $.\n• Vente : vous recevez l’argent sur votre compte Mobile Money. Le montant débité en CDF correspond au montant reçu majoré de 3 % de frais.`;
        actionRoute = '/buy-sell';
        actionLabel = 'Acheter ou Vendre des CDF';
      } else if (lower.includes('qr') || lower.includes('prix') || lower.includes('tarif') || lower.includes('transport') || lower.includes('commerçant') || lower.includes('payer')) {
        reply = `CDF Wallet propose un système de « QR de prix et tarifs » pour le transport et le petit commerce :\n\n• Les commerçants créent un QR avec le nom du tarif (ex: course de bus, repas) et le prix en dollars.\n• Le client scanne le QR, voit le prix net, les frais de 2 % et le total débité, puis confirme avec son code à 6 chiffres.\n• Un scan ne déclenche JAMAIS de transaction automatique sans votre confirmation !`;
        actionRoute = '/my-qr';
        actionLabel = 'Gérer mes QR de tarifs';
      } else if (lower.includes('perdu') || lower.includes('phrase') || lower.includes('mnemonic') || lower.includes('seed') || lower.includes('récupération') || lower.includes('recuperation') || lower.includes('mot de passe oublié')) {
        reply = `IMPORTANT : CDF Wallet est un portefeuille non-custodial. Votre phrase de récupération (12 ou 24 mots) est le SEUL moyen d'accéder à vos fonds en cas de changement d'appareil ou d'oubli de mot de passe.\n\nPar mesure de sécurité stricte, votre phrase n'est JAMAIS stockée sur nos serveurs. Si vous l'avez égarée et que vous avez encore accès à l'application, rendez-vous immédiatement dans les Réglages > Sécurité pour la copier et la noter sur papier hors ligne.`;
        actionRoute = '/security';
        actionLabel = 'Centre de Sécurité';
      } else if (lower.includes('limite') || lower.includes('plafond') || lower.includes('mensuel') || lower.includes('200 000') || lower.includes('500 $') || lower.includes('kyc') || lower.includes('identité')) {
        reply = `Les plafonds mensuels de sortie (envois, paiements QR, swaps, ventes) se réinitialisent le 1er de chaque mois :\n\n• Identité non vérifiée : 500 $ par mois.\n• Identité vérifiée (KYC) : 200 000 $ par mois.\n\nSi une transaction dépasse ce plafond, elle est bloquée avant validation. Vous pouvez augmenter votre limite à 200 000 $ en effectuant la vérification d'identité avec une carte d'identité, passeport ou permis.`;
        actionRoute = '/kyc';
        actionLabel = 'Vérifier mon identité';
      } else if (lower.includes('contrat') || lower.includes('token') || lower.includes('adresse') || lower.includes('bnb chain') || lower.includes('bsc')) {
        reply = `Informations officielles sur le token CDF :\n\n• Symbole : CDF (Franc Congolais)\n• Contrat BEP-20 : ${CDF_CONTRACT_ADDRESS}\n• Décimales : 18\n• Réseau : BNB Smart Chain (Chain ID : 56, Testnet : 97)\n• Trésorerie du projet : 0x0E9dBe33a4fb33Fc9e6595A154538D721965401b`;
      } else {
        reply = `Je n’ai pas trouvé de réponse standard à votre demande spécifique. Pour toute question particulière ou assistance personnalisée, notre équipe de support dédiée est à votre disposition :\n\n📧 franc.congolais.fc@gmail.com`;
        showSupport = true;
      }

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        showSupportEmail: showSupport,
        actionRoute,
        actionLabel,
      };

      setMessages((prev) => [...prev, botMsg]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Assistant CDF Wallet
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  En ligne
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Guide officiel et assistance non-custodiale
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Zone de discussion */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line shadow-xs ${
                  m.role === 'user'
                    ? 'bg-amber-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {m.content}

                {/* Bouton d'action contextuelle */}
                {m.actionRoute && m.actionLabel && onNavigate && (
                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigate(m.actionRoute!);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition-colors cursor-pointer"
                    >
                      <span>{m.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Bloc de support email */}
                {m.showSupportEmail && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <a
                      href={`mailto:${CDF_SUPPORT_EMAIL}?subject=Demande%20assistance%20CDF%20Wallet`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[11px] transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Écrire à {CDF_SUPPORT_EMAIL}</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions rapides */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto scrollbar-none flex items-center gap-1.5">
          {FAQ_SUGGESTIONS.map((faq) => (
            <button
              key={faq}
              type="button"
              onClick={() => handleSend(faq)}
              className="text-[11px] px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap hover:border-amber-500/50 dark:hover:border-amber-500/50 transition-colors cursor-pointer"
            >
              {faq}
            </button>
          ))}
        </div>

        {/* Zone de saisie */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question (frais, dépôt, QR, CDF...)"
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="text-center mt-1.5">
            <span className="text-[10px] text-slate-400">
              Support humain : <a href={`mailto:${CDF_SUPPORT_EMAIL}`} className="underline hover:text-amber-500">{CDF_SUPPORT_EMAIL}</a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
