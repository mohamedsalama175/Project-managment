import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineQueueBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-600/90 backdrop-blur-md text-amber-50 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-500/30 shadow-md">
      <WifiOff className="w-4 h-4 animate-pulse" />
      <span>Working Offline • Changes are locally cached and will sync automatically when reconnected.</span>
      <RefreshCw className="w-3.5 h-3.5 opacity-70" />
    </div>
  );
};
