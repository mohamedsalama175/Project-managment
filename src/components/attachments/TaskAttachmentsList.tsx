import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Archive,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { apiClient, ApiAttachment } from '../../api/client';

interface TaskAttachmentsListProps {
  projectId: string;
  taskId: string;
}

export const TaskAttachmentsList: React.FC<TaskAttachmentsListProps> = ({
  projectId,
  taskId,
}) => {
  const [attachments, setAttachments] = useState<ApiAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getTaskAttachments(projectId, taskId);
      setAttachments(res.data);
    } catch (err: any) {
      console.error('Failed to load attachments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, [projectId, taskId]);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Client-side 25MB check
    if (file.size > 25 * 1024 * 1024) {
      setUploadError('The selected file exceeds the 25 MB limit.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const res = await apiClient.uploadTaskAttachment(projectId, taskId, file);
      setAttachments((prev) => [res.data, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload attachment.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await apiClient.deleteTaskAttachment(projectId, taskId, attachmentId);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete attachment.');
    }
  };

  const getFileIcon = (mime: string, name: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="w-5 h-5 text-purple-500" />;
    if (mime.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mime.includes('zip') || name.endsWith('.zip')) {
      return <Archive className="w-5 h-5 text-amber-500" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const getScanBadge = (status: ApiAttachment['scan_status']) => {
    switch (status) {
      case 'clean':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            <span>Clean</span>
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse">
            <Clock className="w-3 h-3" />
            <span>Scanning...</span>
          </span>
        );
      case 'infected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            <span>Quarantined</span>
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-3 h-3" />
            <span>Scan Error</span>
          </span>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFileSelect(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.docx,.zip"
        />

        <div className="flex flex-col items-center gap-1.5">
          <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {isUploading ? 'Uploading & scanning file...' : 'Click or drag files here to upload'}
          </p>
          <p className="text-xs text-slate-400">
            PDF, PNG, JPG, CSV, XLSX, DOCX, ZIP up to 25 MB
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900">
          {uploadError}
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Attached Files ({attachments.length})
        </h4>

        {isLoading ? (
          <div className="py-6 text-center text-sm text-slate-400">
            Loading attachments...
          </div>
        ) : attachments.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400">
            No files attached to this task.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
            {attachments.map((att) => {
              const isDownloadable = att.scan_status === 'clean';
              const downloadUrl = apiClient.getAttachmentDownloadUrl(projectId, taskId, att.id);

              return (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getFileIcon(att.mime_type, att.file_name)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {att.file_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span>{formatFileSize(att.file_size_bytes)}</span>
                        <span>&bull;</span>
                        <span>{att.uploader?.name || 'Uploader'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2.5 shrink-0 ml-3">
                    {getScanBadge(att.scan_status)}

                    {isDownloadable ? (
                      <a
                        href={downloadUrl}
                        download={att.file_name}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                        title="Download verified attachment"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span
                        className="p-1.5 rounded-lg text-slate-300 dark:text-slate-700 cursor-not-allowed"
                        title={
                          att.scan_status === 'pending'
                            ? 'Scanning in progress...'
                            : 'Download quarantined by security scan'
                        }
                      >
                        <Download className="w-4 h-4" />
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(att.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete attachment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
