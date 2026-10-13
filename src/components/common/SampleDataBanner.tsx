import React, { useState } from 'react';
import { Sparkles, Trash2, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { ClayButton } from './ClayButton';
import { Modal } from './Modal';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAuthStore } from '../../stores/useAuthStore';

export const SampleDataBanner: React.FC = () => {
  const { projects, activeProjectId, setActiveProject } = useProjectStore();
  const { currentOrganization, refreshUser } = useAuthStore();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if active project is sample, or organization has sample data
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const isSampleActive =
    (activeProject as any)?.is_sample ||
    (currentOrganization as any)?.has_sample_data ||
    (currentOrganization as any)?.sample_project_id;

  if (!isSampleActive) {
    return null;
  }

  const handlePurge = async () => {
    setIsPurging(true);
    setError(null);

    try {
      await apiClient.purgeSampleData();

      // Remove any sample projects from local Zustand store
      useProjectStore.setState((state) => {
        const remaining = state.projects.filter(
          (p) => !(p as any).is_sample && p.id !== (currentOrganization as any)?.sample_project_id
        );
        return {
          projects: remaining,
          activeProjectId: remaining.length > 0 ? remaining[0].id : '',
        };
      });

      // Update current organization in auth store
      if (currentOrganization) {
        useAuthStore.setState((state) => ({
          currentOrganization: state.currentOrganization
            ? {
                ...state.currentOrganization,
                has_sample_data: false,
                sample_project_id: undefined,
              }
            : null,
        }));
      }

      await refreshUser();
      setIsConfirmOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to purge sample data');
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <>
      <div className="bg-amber-500/10 dark:bg-amber-950/30 border-b border-amber-500/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-extrabold uppercase tracking-wide text-[10px] bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
            Sample Data Active
          </span>
          <span className="font-medium hidden sm:inline">
            You are exploring pre-configured sample projects and tasks for workspace evaluation.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ClayButton
            size="sm"
            variant="danger"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={() => setIsConfirmOpen(true)}
          >
            Purge Sample Data
          </ClayButton>
        </div>
      </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Purge Sample Delivery Data"
        description="Permanently remove all evaluation sample projects, associated tasks, and mock risks from your organization."
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              This action will delete the sample project and reset sample tracking on your organization. Any custom projects created by you will remain completely intact.
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <ClayButton
              size="sm"
              variant="default"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isPurging}
            >
              Cancel
            </ClayButton>
            <ClayButton
              size="sm"
              variant="danger"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={handlePurge}
              disabled={isPurging}
            >
              {isPurging ? 'Purging Data...' : 'Confirm & Purge Sample Data'}
            </ClayButton>
          </div>
        </div>
      </Modal>
    </>
  );
};
