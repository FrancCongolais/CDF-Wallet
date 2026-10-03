import React, { useState } from 'react';
import { useWallet } from '../wallet';
import {
  Compass,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
  Search,
  Globe,
  Lock,
} from 'lucide-react';

export const DappsPage: React.FC = () => {
  const { activeNetwork, selectedAccount } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');

  const dapps = [
    {
      id: 'pancakeswap',
      name: 'PancakeSwap DEX',
      description: 'Échangeur décentralisé leader sur BNB Smart Chain.',
      category: 'DeFi / DEX',
      url: 'https://pancakeswap.finance',
      badge: 'Principal',
    },
    {
      id: 'bscscan',
      name: 'BscScan Explorer',
      description: 'Explorateur officiel des blocs, transactions et tokens BEP-20.',
      category: 'Outils & Données',
      url: activeNetwork.blockExplorerUrl,
      badge: 'Officiel',
    },
    {
      id: 'cdf-staking',
      name: 'CDF Staking & Récompenses',
      description: 'Protocole de mise en jeu pour le token CDF — Franc Congolais.',
      category: 'Écosystème CDF',
      url: '#',
      badge: 'À venir',
    },
    {
      id: 'snapshot',
      name: 'Gouvernance CDF',
      description: 'Votez sur les propositions d’évolution communautaire de CDF Wallet.',
      category: 'Gouvernance',
      url: '#',
      badge: 'À venir',
    },
  ];

  const filtered = dapps.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Compass className="w-5 h-5 text-amber-500" />
          <span>Explorateur DApps Web3</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Connectez votre portefeuille aux applications décentralisées sur {activeNetwork.name}
        </p>
      </div>

      {/* Search & URL Input Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="dapp-search-input"
          type="text"
          placeholder="Rechercher une DApp ou saisir une URL https://..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none shadow-sm"
        />
      </div>

      {/* DApp Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {filtered.map((dapp) => (
          <div
            key={dapp.id}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/40 dark:hover:border-amber-500/40 transition-all shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {dapp.category}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  {dapp.badge}
                </span>
              </div>

              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {dapp.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {dapp.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {dapp.url !== '#' ? dapp.url.replace('https://', '') : 'Écosystème natif'}
              </span>

              {dapp.url !== '#' ? (
                <a
                  href={dapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                >
                  <span>Ouvrir</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">Bientôt disponible</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Web3 Provider Invariant note */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-3">
        <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900 dark:text-slate-200">
            Sécurité des sessions DApps (EIP-1193) :
          </span>{' '}
          Toutes les demandes de signature ou d’autorisation émanant de sites tiers nécessitent toujours votre confirmation explicite et se font sans jamais révéler votre clé privée ou votre seed phrase.
        </div>
      </div>
    </div>
  );
};
