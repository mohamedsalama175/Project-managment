import React, { useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';

export const NotificationBell: React.FC = () => {
  const { unreadCount, fetchUnreadCount, setIsOpen } = useNotificationStore();

  useEffect(() => {
    fetchUnreadCount();
    // Poll unread count every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      type="button"
      onClick={() => setIsOpen(true)}
      className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title="Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
