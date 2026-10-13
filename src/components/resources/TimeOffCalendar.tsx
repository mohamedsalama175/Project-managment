import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  Check,
  X,
  Clock,
  AlertTriangle,
  Plane,
  HeartPulse,
  Coffee,
  Sun,
  Loader2,
  User,
  ShieldCheck,
  Trash2,
  Filter,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { RequestTimeOffModal } from './RequestTimeOffModal';
import { resourcesApi, TimeOffRequest } from '../../api/resources';
import { useAuthStore } from '../../stores/useAuthStore';

export const TimeOffCalendar: React.FC = () => {
  const { user: currentAuthUser } = useAuthStore();
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resourcesApi.getTimeOffRequests(
        filterStatus === 'all' ? undefined : filterStatus
      );
      setRequests(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load time-off records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const handleApprove = async (request: TimeOffRequest) => {
    if (currentAuthUser?.id === request.user_id && currentAuthUser?.primaryRole !== 'admin') {
      setError('Anti-self-approval policy: Managers cannot approve their own time-off requests.');
      return;
    }

    setActionLoadingId(request.id);
    setError(null);
    try {
      await resourcesApi.approveTimeOffRequest(request.id);
      setActionSuccess(`Approved time-off request for ${request.user?.name || 'team member'}.`);
      fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to approve request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (request: TimeOffRequest) => {
    const reason = prompt('Please enter rejection notes (optional):');
    if (reason === null) return; // user cancelled prompt

    setActionLoadingId(request.id);
    setError(null);
    try {
      await resourcesApi.rejectTimeOffRequest(request.id, reason || undefined);
      setActionSuccess(`Rejected time-off request.`);
      fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to reject request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this pending request?')) return;
    setActionLoadingId(id);
    setError(null);
    try {
      await resourcesApi.deleteTimeOffRequest(id);
      setActionSuccess('Pending request removed.');
      fetchRequests();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete request.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sick':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'personal':
        return <Coffee className="w-4 h-4 text-indigo-500" />;
      case 'holiday':
        return <Sun className="w-4 h-4 text-emerald-500" />;
      case 'vacation':
      default:
        return <Plane className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <X className="w-3 h-3" /> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-pulse" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Filter Status:</span>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['all', 'pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <ClayButton
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Request Time Off
        </ClayButton>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-500/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="p-1 hover:bg-emerald-500/20 rounded-lg">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Requests Table / Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-2" />
          <p className="text-xs text-slate-500 font-medium">Fetching scheduled time-off records...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center">
          <div className="p-3.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-3">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            No Time-Off Requests Found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {filterStatus === 'all'
              ? 'No scheduled vacations, sick days, or holidays logged yet.'
              : `No requests with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {requests.map((req) => {
              const isSelf = currentAuthUser?.id === req.user_id;
              const isSelfApprovalForbidden = isSelf && currentAuthUser?.primaryRole !== 'admin';
              const isActionLoading = actionLoadingId === req.id;

              return (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 shrink-0">
                      {getTypeIcon(req.type)}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {req.user?.name || 'Team Member'}
                        </span>
                        <span className="text-xs text-slate-400 capitalize font-medium">
                          ({req.type})
                        </span>
                        {getStatusBadge(req.status)}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                          {req.start_date} → {req.end_date}
                        </span>
                        {req.hours_off && (
                          <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-3.5 h-3.5" />
                            {req.hours_off}h
                          </span>
                        )}
                      </div>

                      {req.notes && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-0.5 line-clamp-1">
                          "{req.notes}"
                        </p>
                      )}

                      {/* Approval snapshot attribution */}
                      {req.status === 'approved' && req.approved_by_name && (
                        <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium pt-0.5 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Approved by {req.approved_by_name} on {req.approved_at?.substring(0, 10)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(req)}
                          disabled={isActionLoading || isSelfApprovalForbidden}
                          title={
                            isSelfApprovalForbidden
                              ? 'Self-approval is strictly forbidden by company policy'
                              : 'Approve Request'
                          }
                          className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelfApprovalForbidden
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Approve</span>
                        </button>

                        <button
                          onClick={() => handleReject(req)}
                          disabled={isActionLoading || isSelfApprovalForbidden}
                          title="Reject Request"
                          className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden md:inline">Reject</span>
                        </button>

                        {isSelf && (
                          <button
                            onClick={() => handleDelete(req.id)}
                            disabled={isActionLoading}
                            title="Cancel Request"
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Request Modal */}
      <RequestTimeOffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setActionSuccess('Time-off request created successfully.');
          fetchRequests();
        }}
      />
    </div>
  );
};
