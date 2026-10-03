import React, { useState } from 'react';
import { useWallet } from '../wallet';
import { SUPPORTED_NETWORKS } from '../config/networks';
import { Globe, ChevronDown, Check } from 'lucide-react';

export const NetworkBadge: React.FC = () => {
  const { activeNetwork, switchNetwork } = useWallet();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="network-selector-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 transition-all shadow-sm"
      >
        <span
          className={`w-2 h-2 rounded-full ${
            activeNetwork.isTestnet ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
          }`}
        />
        <Globe className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span className="hidden sm:inline font-mono text-[11px]">{activeNetwork.name}</span>
        <span className="sm:hidden font-mono text-[11px]">
          {activeNetwork.isTestnet ? 'BSC Test' : 'BSC'}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1">
              Réseaux EVM Supportés
            </div>
            {Object.values(SUPPORTED_NETWORKS).map((net) => {
              const isSelected = net.id === activeNetwork.id;
              return (
                <button
                  key={net.id}
                  id={`network-option-${net.id}`}
                  type="button"
                  onClick={() => {
                    switchNetwork(net.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        net.isTestnet ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div>
                      <div>{net.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Chain ID: {net.chainId}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-amber-500" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
