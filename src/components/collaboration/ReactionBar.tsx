import React, { useState } from 'react';
import { Smile, Plus } from 'lucide-react';
import { ApiCommentReaction } from '../../api/client';

export const ALLOWED_EMOJIS = ['👍', '❤️', '🎉', '👀', '✅'] as const;
export type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

interface ReactionBarProps {
  commentId: string;
  reactions?: Record<string, ApiCommentReaction>;
  onToggleReaction: (emoji: AllowedEmoji) => Promise<void>;
  disabled?: boolean;
}

export const ReactionBar: React.FC<ReactionBarProps> = ({
  commentId: _commentId,
  reactions = {},
  onToggleReaction,
  disabled = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleToggle = async (emoji: AllowedEmoji) => {
    if (disabled || isLoading) return;
    setIsLoading(emoji);
    try {
      await onToggleReaction(emoji);
    } finally {
      setIsLoading(null);
      setShowPicker(false);
    }
  };

  const activeEntries = Object.entries(reactions).filter(([, data]) => data.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-2">
      {activeEntries.map(([emoji, data]) => {
        const isSelected = data.has_reacted;
        const usersTooltip = data.users?.length ? data.users.join(', ') : '';

        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => handleToggle(emoji as AllowedEmoji)}
            title={usersTooltip ? `Reacted by: ${usersTooltip}` : undefined}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
              isSelected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            } ${isLoading === emoji ? 'opacity-50 animate-pulse' : ''}`}
          >
            <span>{emoji}</span>
            <span className="text-[11px] font-semibold">{data.count}</span>
          </button>
        );
      })}

      {/* Emoji Picker Popover Toggle */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowPicker(!showPicker)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Add reaction"
        >
          {activeEntries.length === 0 ? (
            <span className="flex items-center gap-1 text-xs text-slate-400 px-1.5 py-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
              <Smile className="w-3.5 h-3.5" />
              <span>React</span>
            </span>
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
        </button>

        {showPicker && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowPicker(false)}
            />
            <div className="absolute left-0 bottom-full mb-1 z-50 flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg">
              {ALLOWED_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleToggle(emoji)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-base transition-transform hover:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
