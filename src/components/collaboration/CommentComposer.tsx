import React, { useState, useRef, useEffect } from 'react';
import { Send, AtSign, Eye, Edit3, X } from 'lucide-react';
import { apiClient, ApiTaskComment, ApiCommentUser } from '../../api/client';

interface CommentComposerProps {
  projectId: string;
  taskId: string;
  parentCommentId?: string | null;
  projectMembers?: ApiCommentUser[];
  onCommentCreated: (comment: ApiTaskComment) => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export const CommentComposer: React.FC<CommentComposerProps> = ({
  projectId,
  taskId,
  parentCommentId = null,
  projectMembers = [],
  onCommentCreated,
  onCancel,
  placeholder = 'Write a comment... (Type @ to mention team members)',
  autoFocus = false,
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(0);
  const [mentionCursorPos, setMentionCursorPos] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  // Handle textarea text change and detect @
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart;
    setContent(val);
    setError(null);

    // Look back from cursor to see if inside @mention
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtMatch = textBeforeCursor.match(/@([a-zA-Z0-9_\s]*)$/);

    if (lastAtMatch && lastAtMatch[1].length < 20) {
      setMentionQuery(lastAtMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const filteredMembers = mentionQuery !== null
    ? projectMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(mentionQuery) ||
          m.email?.toLowerCase().includes(mentionQuery)
      ).slice(0, 5)
    : [];

  const handleSelectMention = (member: ApiCommentUser) => {
    if (!textareaRef.current || mentionQuery === null) return;

    const textBeforeCursor = content.slice(0, mentionCursorPos);
    const textAfterCursor = content.slice(mentionCursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    const formattedMention = `@[${member.name}](${member.id}) `;
    const newContent =
      textBeforeCursor.slice(0, atIndex) + formattedMention + textAfterCursor;

    setContent(newContent);
    setMentionQuery(null);

    // Reposition cursor
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = atIndex + formattedMention.length;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    // Ctrl/Cmd + Enter submits
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiClient.createTaskComment(projectId, taskId, {
        content: content.trim(),
        parent_comment_id: parentCommentId,
      });

      setContent('');
      setShowPreview(false);
      onCommentCreated(res.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to render mention-friendly preview
  const renderPreview = (text: string) => {
    const formatted = text.replace(
      /@\[([^\]]+)\]\([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}\)/gi,
      '<span class="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold text-xs">@$1</span>'
    );
    return { __html: formatted };
  };

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/20">
      {/* Header controls (Preview toggle & Mentions hint) */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-slate-800/80 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium"
          >
            {showPreview ? (
              <>
                <Edit3 className="w-3.5 h-3.5" />
                <span>Write</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </>
            )}
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1 text-[11px] text-slate-400">
            <AtSign className="w-3 h-3" />
            <span>Mention with @</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400">Ctrl+Enter to post</span>
      </div>

      {/* Editor Body */}
      <div className="relative p-2.5">
        {showPreview ? (
          <div
            className="min-h-[72px] text-sm text-slate-800 dark:text-slate-200 prose prose-sm dark:prose-invert max-w-none p-1"
            dangerouslySetInnerHTML={renderPreview(content || '*Nothing to preview*')}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder={placeholder}
            rows={parentCommentId ? 2 : 3}
            className="w-full text-sm bg-transparent border-0 resize-y focus:outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
        )}

        {/* Mention autocomplete popup */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute left-3 top-full -mt-2 z-50 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden py-1">
            <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Project Members
            </div>
            {filteredMembers.map((member, idx) => (
              <button
                key={member.id}
                type="button"
                onClick={() => handleSelectMention(member)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                  idx === mentionIndex
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-medium truncate">{member.name}</div>
                  {member.email && (
                    <div className="text-[10px] text-slate-400 truncate">{member.email}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900">
          {error}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800/80 rounded-b-xl">
        <span className="text-[11px] text-slate-400">
          Supports bold, italics, code, links
        </span>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{parentCommentId ? 'Reply' : 'Post Comment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
