import React from 'react';
import { CdfLogo } from '../components/CdfLogo';
import { CopyButton } from '../components/CopyButton';
import { CDF_CONTRACT_ADDRESS, CDF_DECIMALS, CDF_TREASURY_ADDRESS, CDF_SUPPORT_EMAIL, FEE_CONFIG } from '../config/tokens';
import {
  Info,
  Shield,
  Layers,
  Sparkles,
  GitBranch,
  ExternalLink,
  Cpu,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  const roadmapSteps = [
    {
      title: 'Étape 1 : Architecture & Interface Professionnelle',
      status: 'Complétée',
      desc: 'Structure modulaire, maquettes responsives, intégration de la configuration centrale CDF et validation cryptographique.',
      current: true,
    },
    {
      title: 'Étape 2 : CDF Wallet Core',
      status: 'Prochaine étape',
      desc: 'Génération mnémonique sécurisée (BIP-39), dérivation d’adresses EVM (BIP-44), signature locale et stockage chiffré.',
      current: false,
    },
    {
      title: 'Étape 3 : Intégration Blockchain Temps Réel',
      status: 'Planifiée',
      desc: 'Interrogation directe des soldes BEP-20 sur BSC, diffusion de transactions signées et écoute des événements Transfer.',
      current: false,
    },
    {
      title: 'Étape 4 : Déploiement Mobile Multi-Plateforme',
      status: 'Planifiée',
      desc: 'Export et compilation des applications natives Android et iOS avec biométrie Keychain / Keystore.',
      current: false,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Brand presentation banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 text-white shadow-xl text-center space-y-4">
        <div className="flex justify-center">
          <CdfLogo size="xl" showText={false} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            CDF Wallet
          </h1>
          <p className="text-xs text-amber-400 font-semibold tracking-wide uppercase mt-1">
            Portefeuille Crypto Décentralisé & Non-Custodial
          </p>
        </div>
        <p className="text-xs text-slate-300 max-w-lg mx-auto leading-relaxed">
          CDF Wallet est la solution moderne et souveraine pour gérer, envoyer et échanger le token{' '}
          <strong className="text-white">CDF — Franc Congolais</strong> ainsi que{' '}
          <strong className="text-white">BNB</strong> et <strong className="text-white">USDT</strong> en toute sécurité sur BNB Smart Chain.
        </p>
      </div>

      {/* Spécifications Officielles */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Fiche d'Identité Technique du Token
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400">Nom officiel du token :</span>
            <div className="font-bold text-slate-900 dark:text-white">CDF — Franc Congolais</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400">Symbole officiel :</span>
            <div className="font-bold text-slate-900 dark:text-white">CDF</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400">Décimales :</span>
            <div className="font-bold text-slate-900 dark:text-white">{CDF_DECIMALS}</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
            <span className="text-slate-400">Réseau d'ancrage :</span>
            <div className="font-bold text-slate-900 dark:text-white">BNB Smart Chain (BSC)</div>
          </div>
        </div>

        {/* Unique source of truth address */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-amber-900 dark:text-amber-200">
              Adresse du Contrat Intelligent (BEP-20)
            </span>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300">
              Source Unique de Vérité
            </span>
          </div>

          <div className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 break-all bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-amber-500/20 select-all">
            {CDF_CONTRACT_ADDRESS}
          </div>

          <div className="flex items-center justify-between pt-1">
            <CopyButton textToCopy={CDF_CONTRACT_ADDRESS} label="Copier l'adresse du contrat" />
            <a
              href={`https://bscscan.com/token/${CDF_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              <span>Vérifier sur BscScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Trésorerie du Projet / Creator Treasury */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trésorerie du Projet / Creator Treasury
            </h3>
          </div>
          <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
            Adresse Publique
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Cette adresse publique perçoit les frais de fonctionnement du portefeuille (2 % sur les envois, paiements QR et opérations CDF). Aucune clé privée n’y est associée dans le code source.
        </p>

        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 break-all select-all">
            {CDF_TREASURY_ADDRESS}
          </span>
          <CopyButton textToCopy={CDF_TREASURY_ADDRESS} iconOnly />
        </div>
      </div>

      {/* Support & Assistance Officielle */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Support & Contact Officiel
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Pour toute demande technique, partenariat ou assistance non-custodiale, contactez l’équipe du projet :
        </p>
        <div className="flex items-center gap-2">
          <a
            href={`mailto:${CDF_SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            <span>{CDF_SUPPORT_EMAIL}</span>
          </a>
        </div>
      </div>

      {/* Feuille de Route / Roadmap */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-500" />
          <span>Feuille de Route & Évolutions</span>
        </h3>

        <div className="space-y-3">
          {roadmapSteps.map((step, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all ${
                step.current
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold">{step.title}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    step.current
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {step.status}
                </span>
              </div>
              <p className="text-[11px] opacity-80 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
