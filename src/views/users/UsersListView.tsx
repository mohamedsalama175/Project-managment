import React, { useState, useEffect, useRef } from 'react';
import {
  Download,
  Upload,
  UserPlus,
  Filter,
  RotateCcw,
  Edit2,
  Eye,
  Key,
  Shield,
  Search,
  CheckCircle2,
  X,
  FileSpreadsheet,
  MessageSquare,
  Settings as SettingsIcon,
  Home,
  ChevronRight,
  Loader2,
  Trash2,
  Camera,
  User,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { apiClient, ApiUser, ApiRole } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjectStore } from '../../stores/useProjectStore';

export const UsersListView: React.FC = () => {
  const { user: currentAuthUser } = useAuthStore();
  const { setActiveView } = useProjectStore();

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [viewingUser, setViewingUser] = useState<ApiUser | null>(null);
  const [roleModalUser, setRoleModalUser] = useState<ApiUser | null>(null);
  const [selectedRoleForUser, setSelectedRoleForUser] = useState<string>('contributor');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('Engineering');
  const [formRole, setFormRole] = useState('contributor');
  const [formCapacity, setFormCapacity] = useState(40);
  const [formStatus, setFormStatus] = useState<'active' | 'on_leave' | 'inactive'>('active');
  const [formSkills, setFormSkills] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsersAndRoles = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getRoles().catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      if (usersRes.data && usersRes.data.length > 0) {
        useProjectStore.getState().syncTeamMembersFromBackend(usersRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load users', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.jobTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.department || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDept = selectedDept === 'all' || (u.department || '').toLowerCase() === selectedDept.toLowerCase();
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleToggleStatus = async (user: ApiUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      useProjectStore.getState().updateTeamMember(user.id, { status: newStatus });
      await apiClient.updateUser(user.id, { status: newStatus });
      showToast(`User ${user.name} is now ${newStatus}`);
      fetchUsersAndRoles();
    } catch (err: any) {
      showToast(`Failed to update status: ${err.message}`, 'error');
      fetchUsersAndRoles();
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDept('all');
    setSelectedStatus('all');
    showToast('Filters reset to default');
  };

  const handleExportCSV = () => {
    const headers = ['EMPLOYEE ID', 'NAME', 'EMAIL', 'ROLE', 'POSITION', 'DEPARTMENT', 'CAPACITY', 'STATUS'];
    const rows = filteredUsers.map((u, idx) => [
      `EMP-${1000 + idx}`,
      `"${u.name}"`,
      `"${u.email}"`,
      `"${u.roles?.[0] || u.primaryRole || 'contributor'}"`,
      `"${u.jobTitle || ''}"`,
      `"${u.department || ''}"`,
      u.weeklyCapacityHours || 40,
      u.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `deliverops_users_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Users directory exported successfully');
  };

  const handleDownloadTemplate = () => {
    const headers = ['NAME', 'EMAIL', 'ROLE', 'JOB_TITLE', 'DEPARTMENT', 'WEEKLY_CAPACITY_HOURS'];
    const sample = ['Jane Doe', 'jane.doe@example.com', 'contributor', 'Software Engineer', 'Engineering', '40'];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), sample.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'deliverops_users_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Import template downloaded');
  };

  const handleProcessImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds 10MB limit.');
      return;
    }

    setIsProcessingPhoto(true);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetDim = 256;
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFormError('Canvas context creation failed.');
          setIsProcessingPhoto(false);
          return;
        }

        const minEdge = Math.min(img.width, img.height);
        const sx = (img.width - minEdge) / 2;
        const sy = (img.height - minEdge) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, targetDim, targetDim);
        const compressed = canvas.toDataURL('image/jpeg', 0.9);
        setFormPhotoUrl(compressed);
        setIsProcessingPhoto(false);
      };
      img.onerror = () => {
        setFormError('Failed to process image file.');
        setIsProcessingPhoto(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => {
      setFormError('Failed to read file from disk.');
      setIsProcessingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
    e.target.value = '';
  };

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormJobTitle('');
    setFormDepartment('Engineering');
    setFormRole('contributor');
    setFormCapacity(40);
    setFormStatus('active');
    setFormSkills('');
    setFormPhotoUrl('');
    setShowUrlInput(false);
    setIsProcessingPhoto(false);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditUser = (u: ApiUser) => {
    setEditingUser(u);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword('');
    setFormJobTitle(u.jobTitle || '');
    setFormDepartment(u.department || 'Engineering');
    setFormRole(u.roles?.[0] || u.primaryRole || 'contributor');
    setFormCapacity(u.weeklyCapacityHours || 40);
    setFormStatus(u.status || 'active');
    setFormSkills((u.skills || []).join(', '));
    const photo = u.avatarUrl || u.avatarPath || '';
    setFormPhotoUrl(photo);
    setShowUrlInput(Boolean(photo && !photo.startsWith('data:')));
    setIsProcessingPhoto(false);
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!formEmail.trim()) {
      setFormError('Email address is required.');
      return;
    }

    const skillsArray = formSkills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingUser) {
        const payload: any = {
          name: formName.trim(),
          email: formEmail.trim(),
          jobTitle: formJobTitle.trim() || 'Team Member',
          department: formDepartment.trim() || 'General',
          weeklyCapacityHours: Math.max(0, Number(formCapacity)),
          status: formStatus,
          skills: skillsArray,
          roles: [formRole],
          avatarUrl: formPhotoUrl.trim() || null,
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        const res = await apiClient.updateUser(editingUser.id, payload);
        showToast(`User ${formName} updated successfully!`);
        setIsCreateModalOpen(false);
        if (res.data) {
          useProjectStore.getState().syncTeamMembersFromBackend([res.data]);
        }
        fetchUsersAndRoles();
      } else {
        const res = await apiClient.createUser({
          name: formName.trim(),
          email: formEmail.trim(),
          password: formPassword.trim() || 'Password123!',
          jobTitle: formJobTitle.trim() || 'Team Member',
          department: formDepartment.trim() || 'General',
          weeklyCapacityHours: Math.max(0, Number(formCapacity)),
          status: formStatus,
          skills: skillsArray,
          roles: [formRole],
          avatarUrl: formPhotoUrl.trim() || undefined,
        });
        showToast(`User ${formName} created successfully!`);
        setIsCreateModalOpen(false);
        if (res.data) {
          useProjectStore.getState().syncTeamMembersFromBackend([res.data]);
        }
        fetchUsersAndRoles();
      }
    } catch (err: any) {
      setFormError(err.message || 'Operation failed on server.');
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    try {
      const res = await apiClient.updateUser(roleModalUser.id, { roles: [selectedRoleForUser] });
      showToast(`Updated role for ${roleModalUser.name} to ${selectedRoleForUser}`);
      setRoleModalUser(null);
      if (res.data) {
        useProjectStore.getState().syncTeamMembersFromBackend([res.data]);
      }
      fetchUsersAndRoles();
    } catch (err: any) {
      showToast(err.message || 'Failed to update role', 'error');
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

      {/* Top Breadcrumb Bar */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-slate-200/70 bg-white">
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
            Users
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 max-w-[1400px] w-full mx-auto space-y-5">
        {/* Header Title & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
            Users List
          </h1>

          {/* Top Right Buttons Matching Screenshot */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export (Purple Outline) */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm bg-white"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            {/* Download Template (Blue Outline) */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-lg border border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm bg-white"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Download Template</span>
            </button>

            {/* Import (Green Outline) */}
            <label className="px-3.5 py-2 rounded-lg border border-emerald-300 text-emerald-600 hover:bg-emerald-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm bg-white cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    showToast('Import batch processing started...');
                  }
                }}
              />
            </label>

            {/* Create User (Solid Navy) */}
            <button
              type="button"
              onClick={handleOpenCreateUser}
              className="px-4 py-2 rounded-lg bg-[#1e254b] hover:bg-[#161c3b] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create User</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              showFilterPanel
                ? 'bg-slate-100 border-slate-300 text-slate-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter</span>
          </button>

          <button
            type="button"
            onClick={handleResetFilters}
            className="px-3.5 py-2 rounded-lg bg-[#ef4444] hover:bg-red-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Expandable Filter Panel */}
        {showFilterPanel && (
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-150">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Search Name / Email / Title
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">All Departments</option>
                <option value="Executive">Executive</option>
                <option value="Engineering">Engineering</option>
                <option value="Operations">Operations</option>
                <option value="QA & Compliance">QA & Compliance</option>
                <option value="Product & Design">Product & Design</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#f1f5f9] text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                  <th className="py-3.5 px-4 font-bold">EMPLOYEE ID</th>
                  <th className="py-3.5 px-4 font-bold">USER / MEMBER</th>
                  <th className="py-3.5 px-4 font-bold">ROLE / ENTITY</th>
                  <th className="py-3.5 px-4 font-bold">POSITION / DEPARTMENT</th>
                  <th className="py-3.5 px-4 font-bold">SKILLS</th>
                  <th className="py-3.5 px-4 font-bold">CAPACITY</th>
                  <th className="py-3.5 px-4 font-bold">STATUS</th>
                  <th className="py-3.5 px-4 font-bold text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                      Loading users directory...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <p className="mb-2">No users found matching your filters.</p>
                      <button
                        type="button"
                        onClick={handleOpenCreateUser}
                        className="px-3.5 py-1.5 rounded-lg bg-[#1e254b] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create User</span>
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, idx) => {
                    const empId = `77000${String(100 + idx).padStart(3, '0')}`;
                    const isActive = user.status === 'active';
                    const userRole = user.roles?.[0] || user.primaryRole || 'contributor';

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* EMPLOYEE ID */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 whitespace-nowrap">
                          {empId}
                        </td>

                        {/* USER / MEMBER */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] aspect-square rounded-xl overflow-hidden ring-1 ring-slate-200/80 bg-slate-100 flex items-center justify-center shrink-0 shadow-xs">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  className="w-full h-full object-cover object-center"
                                />
                              ) : (
                                <div
                                  className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: user.color || '#1e254b' }}
                                >
                                  {user.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-900 font-semibold">{user.name}</span>
                                {user.email === currentAuthUser?.email && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-normal">{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* ROLE / ENTITY */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 font-medium text-[11px] capitalize">
                            {userRole.replace('_', ' ')}
                          </span>
                        </td>

                        {/* POSITION / DEPARTMENT */}
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          <div className="font-medium">{user.jobTitle || 'Team Member'}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {user.department || 'Operations'}
                          </div>
                        </td>

                        {/* SKILLS */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex flex-wrap items-center gap-1 max-w-[200px]">
                            {user.skills && user.skills.length > 0 ? (
                              <>
                                {user.skills.slice(0, 3).map((skill, sIdx) => (
                                  <span
                                    key={sIdx}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200/70"
                                  >
                                    {skill}
                                  </span>
                                ))}
                                {user.skills.length > 3 && (
                                  <span className="px-1 py-0.5 rounded text-[10px] font-medium bg-slate-200/80 text-slate-600">
                                    +{user.skills.length - 3}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">None</span>
                            )}
                          </div>
                        </td>

                        {/* CAPACITY */}
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                          {user.weeklyCapacityHours || 40}h / week
                        </td>

                        {/* STATUS (Custom Toggle Pill Switch) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all shadow-sm ${
                              isActive
                                ? 'bg-[#00a86b] hover:bg-[#00925d] text-white'
                                : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                            }`}
                            title="Click to toggle status"
                          >
                            <span>{isActive ? 'Active' : 'Inactive'}</span>
                            <span
                              className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
                                isActive ? 'translate-x-0' : '-translate-x-1'
                              }`}
                            />
                          </button>
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 text-slate-400">
                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditUser(user)}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit User & Member Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* View */}
                            <button
                              type="button"
                              onClick={() => setViewingUser(user)}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Password Reset Key */}
                            <button
                              type="button"
                              onClick={() => {
                                showToast(`Password reset link generated for ${user.email}`);
                              }}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Role / Shield */}
                            <button
                              type="button"
                              onClick={() => {
                                setRoleModalUser(user);
                                setSelectedRoleForUser(user.roles?.[0] || user.primaryRole || 'contributor');
                              }}
                              className="p-1 rounded-lg hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Assign Role & Permissions"
                            >
                              <Shield className="w-3.5 h-3.5" />
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
        </div>
      </div>

      {/* Floating Gear (Settings) on Right Edge */}
      <button
        type="button"
        onClick={() => setActiveView('config')}
        className="fixed right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-l-lg bg-[#1e254b] text-white flex items-center justify-center shadow-lg hover:w-9 transition-all z-30"
        title="Workspace Configuration"
      >
        <SettingsIcon className="w-4 h-4 animate-spin-slow" />
      </button>

      {/* Floating Support Chat Widget at Bottom Right */}
      <button
        type="button"
        onClick={() => showToast('DeliverOps Support Assistant: How can we assist you today?')}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-[#1e254b] hover:bg-[#161c3b] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all z-30"
        title="DeliverOps Assistant & Support"
      >
        <MessageSquare className="w-5 h-5" />
      </button>

      {/* Modal: Create or Edit User */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {editingUser ? 'Edit User & Team Member' : 'Create New User'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingUser
                    ? 'Update profile photo, job title, department, skills, and credentials.'
                    : 'Add a new member to the organization directory with system access.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-600 flex items-center gap-2">
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo Upload Area (1:1 Cropped Preview) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Profile Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 min-w-[64px] min-h-[64px] shrink-0 aspect-square rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 shadow-md bg-slate-100 flex items-center justify-center">
                      {formPhotoUrl ? (
                        <img
                          src={formPhotoUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                          <User className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition-colors"
                        title="Remove photo"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isProcessingPhoto}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-all"
                      >
                        {isProcessingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5" />
                        )}
                        <span>Upload Image</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-200 transition-all"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>URL</span>
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400">
                      JPEG, PNG, WebP up to 10MB (automatically cropped 1:1).
                    </p>
                  </div>
                </div>

                {showUrlInput && (
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or direct image link"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    className="w-full mt-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 focus:bg-white"
                  />
                )}
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Khalil"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ahmed.khalil@deliverops.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>{editingUser ? 'Password (Leave blank to keep existing)' : 'Initial Password'}</span>
                  {!editingUser && (
                    <span className="text-[10px] text-slate-400">Defaults to Password123!</span>
                  )}
                </label>
                <input
                  type="password"
                  placeholder={editingUser ? '••••••••' : 'Min 8 characters (default: Password123!)'}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title / Position</label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Integration Engineer"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  >
                    <option value="Executive">Executive</option>
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="QA & Compliance">QA & Compliance</option>
                    <option value="Product & Design">Product & Design</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  >
                    {roles.length > 0 ? (
                      roles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.displayName || r.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="admin">Administrator (Super Admin)</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="contributor">Contributor</option>
                        <option value="viewer">Viewer</option>
                        <option value="field_engineer">Field Engineer</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                  >
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Capacity (Hours)</label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Skills & Capabilities</span>
                  <span className="text-[10px] text-slate-400">Comma-separated</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. React, TypeScript, DevOps, Figma"
                  value={formSkills}
                  onChange={(e) => setFormSkills(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b]"
                />
                {formSkills.trim() && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formSkills
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#1e254b] hover:bg-[#161c3b] text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingUser ? 'Save Changes' : 'Create User'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Assign Role */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Assign Role to {roleModalUser.name}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Select the system access role for this user account.
            </p>

            <div className="space-y-3 mb-5">
              <select
                value={selectedRoleForUser}
                onChange={(e) => setSelectedRoleForUser(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
              >
                {roles.length > 0 ? (
                  roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.displayName || r.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="admin">Administrator</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="contributor">Contributor</option>
                    <option value="viewer">Viewer</option>
                    <option value="field_engineer">Field Engineer</option>
                  </>
                )}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRole}
                className="px-4 py-1.5 rounded-lg bg-[#1e254b] text-white text-xs font-semibold hover:bg-[#161c3b]"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: View User Details */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900">User Profile</h2>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Name:</span>
                <span className="font-bold">{viewingUser.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Email:</span>
                <span>{viewingUser.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Position / Title:</span>
                <span>{viewingUser.jobTitle || 'Team Member'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Department:</span>
                <span>{viewingUser.department || 'Operations'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Weekly Capacity:</span>
                <span>{viewingUser.weeklyCapacityHours || 40} hours</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="font-semibold text-slate-500">Current Role:</span>
                <span className="capitalize font-semibold text-[#1e254b]">
                  {viewingUser.roles?.[0] || viewingUser.primaryRole || 'contributor'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="font-semibold text-slate-500">Account Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                    viewingUser.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {viewingUser.status}
                </span>
              </div>
            </div>

            <div className="pt-5 mt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
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
