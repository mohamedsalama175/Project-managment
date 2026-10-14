import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  FileText,
  Bell,
  PlusCircle,
  Filter,
  RotateCcw,
  Edit2,
  Eye,
  Copy,
  Trash2,
  Home,
  ChevronRight,
  Loader2,
  Shield,
  X,
  CheckCircle2,
} from 'lucide-react';
import { apiClient, ApiRole } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjectStore } from '../../stores/useProjectStore';

export const RolesListView: React.FC = () => {
  const { user: currentAuthUser } = useAuthStore();
  const { setActiveView } = useProjectStore();

  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingRole, setViewingRole] = useState<ApiRole | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getRoles();
      setRoles(res.data || []);
    } catch (err: any) {
      showToast(err.message || 'Failed to load roles', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = roles.filter(
    (r) =>
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.displayName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteRole = async (role: ApiRole) => {
    if (role.isSystem || ['admin', 'project_manager', 'contributor', 'viewer', 'field_engineer'].includes(role.name)) {
      showToast('Protected system roles cannot be deleted.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete role "${role.displayName || role.name}"?`)) {
      return;
    }

    try {
      await apiClient.deleteRole(role.id);
      showToast(`Role "${role.name}" deleted successfully.`);
      fetchRoles();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-800 font-sans min-h-screen">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white shadow-emerald-900/20'
              : 'bg-rose-600 text-white shadow-rose-900/20'
          }`}
        >
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Top Bar Matching Screenshot (Hamburger, Breadcrumb, Search, Flag, Bell, Avatar) */}
      <div className="px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Toggle Menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <Home className="w-3.5 h-3.5" />
            <button
              type="button"
              onClick={() => setActiveView('users')}
              className="hover:text-slate-800 transition-colors"
            >
              Users Management
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-800">
              Roles
            </span>
          </div>
        </div>

        {/* Top-Right Search, Flag, Bell, Avatar */}
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 w-44"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            title="Documentation"
          >
            <FileText className="w-4 h-4" />
          </button>

          <div className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-xs">
            🇺🇸
          </div>

          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
          </button>

          <div className="w-7 h-7 rounded-full bg-[#1e254b] text-white font-bold text-xs flex items-center justify-center shadow-sm">
            {currentAuthUser?.name?.charAt(0) || 'A'}
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="p-6 max-w-[1400px] w-full mx-auto space-y-5">
        {/* Title & Top Right Actions */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Roles
          </h1>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 bg-white shadow-sm"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-3.5 py-2 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('create-role')}
              className="px-4 py-2 rounded-lg bg-[#1e254b] hover:bg-[#161c3b] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Role</span>
            </button>
          </div>
        </div>

        {/* Roles Table Matching Screenshot 3 */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f5f9] text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-6 font-bold">ROLE NAME</th>
                  <th className="py-3.5 px-6 font-bold text-center">PERMISSIONS COUNT</th>
                  <th className="py-3.5 px-6 font-bold text-center">USERS COUNT</th>
                  <th className="py-3.5 px-6 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading roles...
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      No roles found. Click &quot;Create Role&quot; to define a new access role.
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const isSystem =
                      role.isSystem ||
                      ['admin', 'project_manager', 'contributor', 'viewer', 'field_engineer'].includes(role.name);

                    return (
                      <tr key={role.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* ROLE NAME */}
                        <td className="py-4 px-6 font-medium text-slate-800 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{role.displayName || role.name}</span>
                            {isSystem && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200/60">
                                System
                              </span>
                            )}
                          </div>
                          {role.description && (
                            <div className="text-[11px] text-slate-400 font-normal">{role.description}</div>
                          )}
                        </td>

                        {/* PERMISSIONS COUNT */}
                        <td className="py-4 px-6 text-center font-semibold text-slate-700 whitespace-nowrap">
                          {role.name === 'admin' ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/70 text-[11px]">
                              All ({role.permissions?.length || 52})
                            </span>
                          ) : (
                            role.permissions?.length || 0
                          )}
                        </td>

                        {/* USERS COUNT */}
                        <td className="py-4 px-6 text-center text-slate-600 font-medium whitespace-nowrap">
                          {role.usersCount ?? 0}
                        </td>

                        {/* ACTIONS (Pencil, Eye, Copy, Trash) */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2 text-slate-400">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => {
                                // Switch to create role view with selected role for edit
                                setActiveView('create-role');
                              }}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit Role"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* View Permissions */}
                            <button
                              type="button"
                              onClick={() => setViewingRole(role)}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="View Permissions"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Clone / Duplicate */}
                            <button
                              type="button"
                              onClick={() => {
                                showToast(`Cloned draft for role "${role.displayName || role.name}"`);
                                setActiveView('create-role');
                              }}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Clone Role"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete (if non-system) */}
                            <button
                              type="button"
                              onClick={() => handleDeleteRole(role)}
                              disabled={isSystem}
                              className={`p-1 rounded-lg transition-colors ${
                                isSystem
                                  ? 'opacity-30 cursor-not-allowed text-slate-300'
                                  : 'hover:text-rose-600 hover:bg-rose-50 text-slate-400'
                              }`}
                              title={isSystem ? 'System roles cannot be deleted' : 'Delete Role'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Matching Screenshot 3 */}
          <div className="py-3 px-6 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-600">
            <button
              type="button"
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-50"
            >
              &lt;
            </button>
            <span className="w-7 h-7 rounded bg-[#1e254b] text-white flex items-center justify-center font-semibold text-xs shadow-xs">
              1
            </span>
            <button
              type="button"
              disabled
              className="w-7 h-7 rounded border border-slate-200 flex items-center justify-center text-slate-400 disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>

        {/* Branded Footer Matching Screenshot */}
        <div className="text-center text-[11px] text-slate-400 py-4">
          © 2026. All rights reserved by Bitwise-solutions.
        </div>
      </div>

      {/* Modal: View Role Permissions */}
      {viewingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#1e254b]" />
                <h2 className="text-base font-bold text-slate-900">
                  {viewingRole.displayName || viewingRole.name} Permissions
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewingRole(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5 text-xs">
              {viewingRole.name === 'admin' ? (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 font-semibold">
                  Administrator role possesses unrestricted access to all modules and actions.
                </div>
              ) : viewingRole.permissions && viewingRole.permissions.length > 0 ? (
                viewingRole.permissions.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-700">{p}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-4">No permissions assigned.</div>
              )}
            </div>

            <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRole(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
