import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export const DemoModeBanner: React.FC = () => {
  const { isDemoMode, setDemoMode } = useWallet();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      id="demo-mode-banner"
      className="w-full bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs transition-all"
    >
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span className="font-bold uppercase tracking-wider text-[11px] bg-amber-500/20 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300">
              {isDemoMode ? 'Mode Démonstration' : 'Mode Réel (Vide)'}
            </span>
            {!collapsed && (
              <span className="hidden md:inline text-slate-600 dark:text-slate-400">
                {isDemoMode
                  ? 'Données de démonstration simulées. Aucune transaction réelle n’est exécutée.'
                  : 'Affichage réel non-custodial. En attente du module de création de clés (Étape 2).'}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            id="toggle-demo-mode-btn"
            onClick={() => setDemoMode(!isDemoMode)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            {isDemoMode ? (
              <>
                <EyeOff className="w-3 h-3" />
                <span>Basculer en Mode Réel</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span>Activer Données Démo</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-amber-700/60 dark:text-amber-300/60 hover:text-amber-800 dark:hover:text-amber-200 text-[11px] underline ml-1"
          >
            {collapsed ? 'Détails' : 'Réduire'}
          </button>
        </div>
      </div>
    </div>
  );
};
