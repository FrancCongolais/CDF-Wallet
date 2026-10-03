/**
 * Actions Rapides — CDF Wallet (Style Trust Wallet)
 * 
 * Spécification Section 3.5 :
 * Actions rapides : Envoyer, Recevoir, Acheter/Vendre, Swap, Scanner.
 */

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, ShoppingCart, QrCode } from 'lucide-react';
import { BuySellModal } from './BuySellModal';

interface ActionButtonsProps {
  onNavigate: (route: string) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ onNavigate }) => {
  const [showBuySellModal, setShowBuySellModal] = useState(false);

  return (
    <>
      <div className="grid grid-cols-5 gap-1.5 sm:gap-3 my-6">
        {/* Envoyer */}
        <button
          id="btn-action-send"
          type="button"
          onClick={() => onNavigate('/send')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner">
            <ArrowUpRight className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate max-w-full">
            Envoyer
          </span>
        </button>

        {/* Recevoir */}
        <button
          id="btn-action-receive"
          type="button"
          onClick={() => onNavigate('/receive')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-inner">
            <ArrowDownLeft className="w-5 h-5 transition-transform group-hover:translate-y-0.5 group-hover:-translate-x-0.5" />
          </div>
          <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate max-w-full">
            Recevoir
          </span>
        </button>

        {/* Acheter / Vendre */}
        <button
          id="btn-action-buy-sell"
          type="button"
          onClick={() => setShowBuySellModal(true)}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-500/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-full">
            Acheter
          </span>
        </button>

        {/* Échanger / Swap */}
        <button
          id="btn-action-swap"
          type="button"
          onClick={() => onNavigate('/swap')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-purple-500/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-purple-500 group-hover:text-white transition-all shadow-inner">
            <RefreshCw className="w-5 h-5 transition-transform group-hover:rotate-45" />
          </div>
          <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 truncate max-w-full">
            Swap
          </span>
        </button>

        {/* Scanner */}
        <button
          id="btn-action-scan"
          type="button"
          onClick={() => onNavigate('/scan')}
          className="flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-amber-500/50 shadow-sm hover:shadow-md transition-all group cursor-pointer"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-inner">
            <QrCode className="w-5 h-5" />
          </div>
          <span className="mt-2 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate max-w-full">
            Scanner
          </span>
        </button>
      </div>

      <BuySellModal
        isOpen={showBuySellModal}
        onClose={() => setShowBuySellModal(false)}
      />
    </>
  );
};
