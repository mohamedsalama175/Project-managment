import React from 'react';
import {
  X,
  CheckCheck,
  Settings,
  AtSign,
  MessageSquare,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { ApiNotification } from '../../api/client';

export const NotificationDrawer: React.FC = () => {
  const {
    isOpen,
    setIsOpen,
    notifications,
    isLoading,
    filterUnreadOnly,
    setFilterUnreadOnly,
    markAsRead,
    markAllAsRead,
    setIsPreferencesOpen,
  } = useNotificationStore();

  if (!isOpen) return null;

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'mention':
        return <AtSign className="w-4 h-4 text-emerald-500" />;
      case 'comment_watched':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const handleNotificationClick = async (notif: ApiNotification) => {
    if (!notif.read_at) {
      await markAsRead(notif.id);
    }
    if (notif.action_url) {
      setIsOpen(false);
      window.location.href = notif.action_url;
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(isoString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                Notifications Inbox
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsPreferencesOpen(true);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Notification Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader / Filters */}
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(false)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  !filterUnreadOnly
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterUnreadOnly(true)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  filterUnreadOnly
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Unread
              </button>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 font-medium transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                {filterUnreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.read_at;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 ${
                      isUnread
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20'
                        : ''
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 mt-0.5">
                      {getEventIcon(notif.event_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className={`text-sm truncate ${isUnread ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {notif.body}
                      </p>

                      {notif.action_url && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
