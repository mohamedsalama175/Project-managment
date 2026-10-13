import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Key,
  Check,
  X,
  Plus,
  Trash2,
  Edit3,
  Lock,
  Users,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';
import { apiClient, ApiRole, ApiPermission } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { ClayButton } from '../common/ClayButton';
import { EmptyState } from '../common/EmptyState';

export const RolesMatrixView: React.FC = () => {
  const { can, user: currentUser } = useAuthStore();
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<Record<string, ApiPermission[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPermissions, setFormPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Confirm State
  const [roleToDelete, setRoleToDelete] = useState<ApiRole | null>(null);

  const fetchMatrixData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        apiClient.getRoles(),
        apiClient.getPermissions(),
      ]);
      setRoles(rolesRes.data);
      setPermissions(permsRes.data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load roles and permissions from backend.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrixData();
  }, []);

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormName('');
    setFormDisplayName('');
    setFormDescription('');
    setFormPermissions(['projects.view', 'tasks.update_progress', 'comments.create']);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (role: ApiRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDisplayName(role.displayName);
    setFormDescription(role.description || '');
    setFormPermissions([...role.permissions]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permName: string) => {
    setFormPermissions((prev) =>
      prev.includes(permName) ? prev.filter((p) => p !== permName) : [...prev, permName]
    );
  };

  const handleToggleGroup = (groupName: string) => {
    const groupPerms = (permissions[groupName] || []).map((p) => p.name);
    const allSelected = groupPerms.every((p) => formPermissions.includes(p));

    if (allSelected) {
      // Unselect all in group
      setFormPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      // Select all in group
      setFormPermissions((prev) => Array.from(new Set([...prev, ...groupPerms])));
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSaving(true);

    try {
      if (editingRole) {
        await apiClient.updateRole(editingRole.id, {
          displayName: formDisplayName.trim(),
          description: formDescription.trim(),
          permissions: formPermissions,
        });
        setSuccessMessage(`Role "${formDisplayName}" updated successfully.`);
      } else {
        if (!formName.trim()) {
          throw new Error('Role identifier is required.');
        }
        await apiClient.createRole({
          name: formName.trim().toLowerCase().replace(/\s+/g, '_'),
          displayName: formDisplayName.trim() || formName.trim(),
          description: formDescription.trim(),
          permissions: formPermissions,
        });
        setSuccessMessage(`Role "${formDisplayName || formName}" created successfully.`);
      }

      setIsModalOpen(false);
      await fetchMatrixData();
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save role.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: ApiRole) => {
    if (role.isSystem) {
      setError('System roles are protected and cannot be deleted.');
      return;
    }

    try {
      await apiClient.deleteRole(role.id);
      setSuccessMessage(`Role "${role.displayName}" deleted successfully.`);
      setRoleToDelete(null);
      await fetchMatrixData();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete role.');
      setRoleToDelete(null);
    }
  };

  const groupLabels: Record<string, { label: string; icon: any; desc: string }> = {
    users: { label: 'User Directory', icon: Users, desc: 'User accounts, profiles & capacity limits' },
    roles: { label: 'Roles & Security', icon: Shield, desc: 'RBAC definitions and permission matrices' },
    projects: { label: 'Project Portfolio', icon: ShieldCheck, desc: 'Projects creation, schedules & archives' },
    tasks: { label: 'WBS & Tasks', icon: Key, desc: 'Task authoring, progress, reviews & approval states' },
    baselines: { label: 'Baselines', icon: Lock, desc: 'Formal schedule lock and variant comparisons' },
    risks: { label: 'Risks & Blockers', icon: ShieldAlert, desc: 'Risk register, blockers and mitigation' },
    comments: { label: 'Collaboration', icon: CheckCircle2, desc: 'Task comments and audit dialogues' },
    audit: { label: 'Audit Log', icon: Info, desc: 'Forensic append-only audit trail and compliance' },
  };

  if (isLoading) {
    return (
      <EmptyState
        status="loading"
        title="Loading Capability Matrix"
        description="Synchronizing organizational roles and permissions..."
      />
    );
  }

  if (error && roles.length === 0) {
    return (
      <EmptyState
        status="error"
        title="Unable to Load RBAC Matrix"
        description="We encountered an issue retrieving permission sets from the server."
        errorDetails={error}
        onRetry={fetchMatrixData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 rounded-lg hover:bg-emerald-500/20">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs font-bold text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 rounded-lg hover:bg-red-500/20">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            Roles & Capability Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Enforce role-based access control (RBAC) backed by Spatie permissions on Laravel 12.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchMatrixData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 transition-all"
            title="Refresh Roles"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {can('roles.manage') && (
            <ClayButton
              size="sm"
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreate}
            >
              New Custom Role
            </ClayButton>
          )}
        </div>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden group hover:border-emerald-500/40 transition-all"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {role.displayName}
                  </h3>
                  <code className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {role.name}
                  </code>
                </div>

                {role.isSystem ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    System
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    Custom
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {role.description || 'No description provided.'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 font-semibold">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  {role.usersCount} {role.usersCount === 1 ? 'user' : 'users'}
                </span>
                <span>•</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {role.permissions.length} perms
                </span>
              </div>

              {can('roles.manage') && (
                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleOpenEdit(role)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                    title="Edit Role"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => setRoleToDelete(role)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"
                      title="Delete Role"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix Grid */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Granular Permission Breakdown
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {Object.values(permissions).flat().length} permissions registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[280px]">Permission Ability</th>
                <th className="py-3 px-4 min-w-[340px]">Description</th>
                {roles.map((role) => (
                  <th key={role.id} className="py-3 px-4 text-center min-w-[110px]">
                    <div className="font-bold text-slate-700 dark:text-slate-200">{role.displayName}</div>
                    <div className="text-[9px] font-mono font-normal text-slate-400">{role.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {Object.entries(permissions).map(([group, groupPerms]) => {
                const groupMeta = groupLabels[group] || { label: group, icon: Key, desc: '' };
                const IconComponent = groupMeta.icon;

                return (
                  <React.Fragment key={group}>
                    {/* Section Group Header */}
                    <tr className="bg-slate-100/60 dark:bg-slate-800/60 font-bold text-slate-700 dark:text-slate-200">
                      <td colSpan={2 + roles.length} className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-4 h-4 text-emerald-500" />
                          <span className="uppercase text-[11px] tracking-wide text-slate-900 dark:text-white font-black">
                            {groupMeta.label}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500">
                            — {groupMeta.desc}
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* Permissions rows */}
                    {groupPerms.map((perm) => (
                      <tr
                        key={perm.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-800 dark:text-slate-200 font-bold">
                          {perm.name}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs">
                          {perm.description || '—'}
                        </td>
                        {roles.map((role) => {
                          const hasPerm = role.permissions.includes(perm.name);
                          return (
                            <td key={role.id} className="py-3 px-4 text-center">
                              {hasPerm ? (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </span>
                              ) : (
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-slate-300 dark:text-slate-700">
                                  <X className="w-3 h-3 stroke-[2]" />
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  {editingRole ? `Edit Role: ${editingRole.displayName}` : 'Create Custom Role'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure role display attributes and assigned permission abilities.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="flex-1 overflow-y-auto p-6 space-y-6">
              {modalError && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Role Identifier (Slug) *
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingRole)}
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. qa_lead"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none font-mono disabled:opacity-60 text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique machine name (letters, numbers, underscore).</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="e.g. QA Automation Lead"
                    className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Human-friendly title shown across user interfaces.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Summarize the functional domain and scope of this role..."
                  className="w-full text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-900 dark:text-white"
                />
              </div>

              {/* Permissions Checklist Grouped */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Granted Permissions ({formPermissions.length} selected)
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormPermissions(Object.values(permissions).flat().map((p) => p.name))
                      }
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormPermissions([])}
                      className="text-[11px] font-bold text-slate-500 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {Object.entries(permissions).map(([group, groupPerms]) => {
                    const groupSelectedCount = groupPerms.filter((p) =>
                      formPermissions.includes(p.name)
                    ).length;
                    const isAllSelected = groupSelectedCount === groupPerms.length;

                    return (
                      <div
                        key={group}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">
                            {groupLabels[group]?.label || group} ({groupSelectedCount}/{groupPerms.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleGroup(group)}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            {isAllSelected ? 'Deselect Group' : 'Select All in Group'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {groupPerms.map((perm) => {
                            const isChecked = formPermissions.includes(perm.name);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                                  isChecked
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-100 font-bold'
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(perm.name)}
                                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <div className="flex-1">
                                  <div className="font-mono text-[11px]">{perm.name}</div>
                                  <div className="text-[10px] font-normal opacity-80">
                                    {perm.description}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl flex items-center justify-end gap-3 sticky bottom-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <ClayButton
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isSaving}
                  icon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                >
                  {isSaving ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
                </ClayButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete Role: {roleToDelete.displayName}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                This action is irreversible. Users assigned to this role must be reallocated before deletion.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRoleToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteRole(roleToDelete)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
