import React, { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { Download, X } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const { canInstall, isInstalled, installApp } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || isInstalled || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full p-4 rounded-2xl bg-slate-900 border border-indigo-500/30 shadow-2xl shadow-indigo-500/10 text-white flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
          <Download className="w-5 h-5" />
        </div>
        <div>
          <div className="text-xs font-semibold">Install DeliverOps App</div>
          <div className="text-[11px] text-slate-400">Add to home screen for offline access</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={installApp}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
