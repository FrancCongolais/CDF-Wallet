import React, { useState } from 'react';
import { runWalletIntegrityTests, TestResultItem } from '../tests/walletIntegrity.test';
import {
  CheckCircle2,
  XCircle,
  Play,
  X,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [results, setResults] = useState<TestResultItem[]>(() => runWalletIntegrityTests());

  if (!isOpen) return null;

  const handleRerun = () => {
    setResults(runWalletIntegrityTests());
  };

  const totalPassed = results.filter((r) => r.passed).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Banc de Tests & Intégrité (Étape 1)
              </h2>
              <p className="text-xs text-slate-500">
                {totalPassed} / {results.length} tests réussis
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test items list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {results.map((test) => (
            <div
              key={test.id}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-start gap-3 text-xs"
            >
              {test.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {test.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      test.passed
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  Catégorie : {test.category}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">
                  {test.details}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRerun}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Relancer les tests</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-bold transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
