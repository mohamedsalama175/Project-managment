import React, { useState } from 'react';
import { Reply, Edit2, Trash2, Check, X, Clock } from 'lucide-react';
import {
  apiClient,
  ApiTaskComment,
  ApiCommentUser,
} from '../../api/client';
import { ReactionBar, AllowedEmoji } from './ReactionBar';
import { CommentComposer } from './CommentComposer';

interface CommentThreadProps {
  projectId: string;
  taskId: string;
  comment: ApiTaskComment;
  currentUserId?: string;
  projectMembers?: ApiCommentUser[];
  onCommentUpdated: (updated: ApiTaskComment) => void;
  onCommentDeleted: (commentId: string) => void;
  onReplyAdded: (reply: ApiTaskComment) => void;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  projectId,
  taskId,
  comment,
  currentUserId,
  projectMembers = [],
  onCommentUpdated,
  onCommentDeleted,
  onReplyAdded,
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Check 15-minute edit window
  const createdAtMs = new Date(comment.created_at).getTime();
  const minutesSinceCreated = (Date.now() - createdAtMs) / (1000 * 60);
  const canEdit =
    !comment.is_tombstone &&
    comment.user_id === currentUserId &&
    minutesSinceCreated <= 15;

  const canDelete =
    !comment.is_tombstone &&
    comment.user_id === currentUserId;

  const handleToggleReaction = async (emoji: AllowedEmoji) => {
    try {
      const res = await apiClient.toggleCommentReaction(comment.id, emoji);
      onCommentUpdated({
        ...comment,
        reactions: res.reactions,
      });
    } catch (err) {
      console.error('Reaction toggle failed', err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    setEditError(null);

    try {
      const res = await apiClient.updateTaskComment(projectId, taskId, comment.id, {
        content: editContent.trim(),
      });
      setIsEditing(false);
      onCommentUpdated(res.data);
    } catch (err: any) {
      setEditError(err?.message || 'Failed to edit comment.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await apiClient.deleteTaskComment(projectId, taskId, comment.id);
      onCommentDeleted(comment.id);
    } catch (err) {
      console.error('Failed to delete comment', err);
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

  // Render text with clickable/highlighted mentions
  const renderFormattedContent = (text: string) => {
    const formatted = text.replace(
      /@\[([^\]]+)\]\([0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}\)/gi,
      '<span class="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium text-xs">@$1</span>'
    );
    return { __html: formatted };
  };

  const authorName = comment.user?.name || 'Deleted User';
  const authorInitials = authorName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="group/comment py-3">
      {/* Main Comment Item */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="shrink-0 mt-0.5">
          {comment.is_tombstone || !comment.user ? (
            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-medium">
              ?
            </div>
          ) : comment.user.avatar_url ? (
            <img
              src={comment.user.avatar_url}
              alt={authorName}
              className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-xs font-bold border border-emerald-200 dark:border-emerald-800">
              {authorInitials}
            </div>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${comment.is_tombstone ? 'text-slate-400 italic' : 'text-slate-900 dark:text-slate-100'}`}>
                {comment.is_tombstone ? '[deleted author]' : authorName}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.is_edited && !comment.is_tombstone && (
                <span className="text-[10px] text-slate-400 italic flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>edited</span>
                </span>
              )}
            </div>

            {/* Actions Menu */}
            {!comment.is_tombstone && (
              <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity flex items-center gap-1">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditContent(comment.content);
                      setIsEditing(true);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit comment (within 15m)"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comment Body / Edit Form */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                disabled={isSavingEdit}
                rows={3}
                className="w-full text-sm p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {editError && (
                <div className="text-xs text-rose-500">{editError}</div>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSavingEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingEdit}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`mt-1 text-sm text-slate-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none break-words ${
                comment.is_tombstone ? 'italic text-slate-400 dark:text-slate-500' : ''
              }`}
              dangerouslySetInnerHTML={renderFormattedContent(comment.content)}
            />
          )}

          {/* Reactions & Reply button */}
          {!comment.is_tombstone && (
            <div className="flex items-center gap-3 mt-1.5">
              <ReactionBar
                commentId={comment.id}
                reactions={comment.reactions}
                onToggleReaction={handleToggleReaction}
              />

              {!comment.parent_comment_id && (
                <button
                  type="button"
                  onClick={() => setIsReplying(!isReplying)}
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium mt-2 transition-colors"
                >
                  <Reply className="w-3.5 h-3.5" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          )}

          {/* Inline Reply Composer */}
          {isReplying && (
            <div className="mt-3 pl-2 border-l-2 border-emerald-500/40">
              <CommentComposer
                projectId={projectId}
                taskId={taskId}
                parentCommentId={comment.id}
                projectMembers={projectMembers}
                placeholder={`Replying to ${authorName}...`}
                autoFocus
                onCommentCreated={(reply) => {
                  setIsReplying(false);
                  onReplyAdded(reply);
                }}
                onCancel={() => setIsReplying(false)}
              />
            </div>
          )}

          {/* Nested Replies (1-level indentation) */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-3">
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  projectId={projectId}
                  taskId={taskId}
                  comment={reply}
                  currentUserId={currentUserId}
                  projectMembers={projectMembers}
                  onCommentUpdated={(up) => {
                    const newReplies = comment.replies?.map((r) =>
                      r.id === up.id ? up : r
                    );
                    onCommentUpdated({ ...comment, replies: newReplies });
                  }}
                  onCommentDeleted={(delId) => {
                    const newReplies = comment.replies?.map((r) =>
                      r.id === delId ? { ...r, is_tombstone: true, content: '[deleted]', user: null } : r
                    );
                    onCommentUpdated({ ...comment, replies: newReplies });
                  }}
                  onReplyAdded={onReplyAdded}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
