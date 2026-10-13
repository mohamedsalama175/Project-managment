import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Paperclip,
  Trash2,
  CheckCircle,
  FileText,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { apiClient, ApiActivityEvent } from '../../api/client';

interface ActivityFeedProps {
  projectId: string;
  taskId?: string;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  projectId,
  taskId,
  className = '',
}) => {
  const [events, setEvents] = useState<ApiActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = taskId
        ? await apiClient.getTaskActivity(projectId, taskId, 30)
        : await apiClient.getProjectActivity(projectId, 30);
      setEvents(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load activity stream.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [projectId, taskId]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'comment.created':
        return <MessageSquare className="w-4 h-4 text-emerald-500" />;
      case 'attachment.uploaded':
        return <Paperclip className="w-4 h-4 text-blue-500" />;
      case 'attachment.deleted':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case 'task.created':
      case 'task.completed':
        return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getActionLabel = (event: ApiActivityEvent) => {
    const actorName = event.actor?.name || 'A team member';
    switch (event.action) {
      case 'comment.created':
        return (
          <span>
            <strong className="text-slate-900 dark:text-slate-100">{actorName}</strong> posted a comment
            {event.metadata?.snippet && (
              <span className="block text-xs text-slate-500 italic mt-0.5 line-clamp-1">
                "{event.metadata.snippet}"
              </span>
            )}
          </span>
        );
      case 'attachment.uploaded':
        return (
          <span>
            <strong className="text-slate-900 dark:text-slate-100">{actorName}</strong> uploaded attachment{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {event.metadata?.file_name || 'file'}
            </span>
          </span>
        );
      case 'attachment.deleted':
        return (
          <span>
            <strong className="text-slate-900 dark:text-slate-100">{actorName}</strong> deleted attachment{' '}
            <span className="line-through text-slate-400">
              {event.metadata?.file_name || 'file'}
            </span>
          </span>
        );
      default:
        return (
          <span>
            <strong className="text-slate-900 dark:text-slate-100">{actorName}</strong> performed{' '}
            <code>{event.action}</code>
          </span>
        );
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Activity Timeline
        </h4>
        <button
          type="button"
          onClick={fetchEvents}
          disabled={isLoading}
          className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Refresh activity"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading && events.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">
          Loading activity stream...
        </div>
      ) : error ? (
        <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
          {error}
        </div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">
          No activity recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          {events.map((event) => (
            <div key={event.id} className="relative group flex items-start gap-3">
              {/* Timeline marker icon */}
              <div className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs group-hover:border-emerald-500 transition-colors">
                {getActionIcon(event.action)}
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {getActionLabel(event)}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {formatRelativeTime(event.created_at)}
                </div>
              </div>

              {/* Actor avatar pill */}
              {event.actor && (
                <div className="shrink-0 flex items-center gap-1">
                  {event.actor.avatar_url ? (
                    <img
                      src={event.actor.avatar_url}
                      alt={event.actor.name}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                      <UserIcon className="w-3 h-3" />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
