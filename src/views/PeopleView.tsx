import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  X,
  UserCheck,
  AlertOctagon,
  FolderKanban,
  Sparkles,
  Upload,
  Camera,
  User,
  Link as LinkIcon,
  Loader2,
  Shield,
  RefreshCw,
  Database,
  Mail,
  Copy,
  Lock,
  Key,
  LogIn,
  Calendar,
  TrendingUp,
  Award,
  Layers,
  Sliders,
  TableProperties,
} from 'lucide-react';
import { TeamMember, UserRole, MemberAvailabilityStatus, Task } from '../types';
import { useProjectStore } from '../stores/useProjectStore';
import { useAuthStore } from '../stores/useAuthStore';
import { apiClient, ApiUser, ApiRole } from '../api/client';
import { ClayButton } from '../components/common/ClayButton';
import { EmptyState } from '../components/common/EmptyState';
import { LoginModal } from '../components/auth/LoginModal';
import { calculateMemberWorkload, getMemberTaskBreakdown } from '../utils/capacityUtils';
import { UsersListView } from './users/UsersListView';

// Phase 5 Resource Management Components
import { TimeOffCalendar } from '../components/resources/TimeOffCalendar';
import { SkillsMatrixTable } from '../components/resources/SkillsMatrixTable';
import { CapacityForecastChart } from '../components/resources/CapacityForecastChart';
import { HiringRecommendationsCard } from '../components/resources/HiringRecommendationsCard';
import { LevelingWizardModal } from '../components/resources/LevelingWizardModal';
import { CrossProjectTimelineSlideout } from '../components/resources/CrossProjectTimelineSlideout';
import { TimesheetGrid } from '../components/resources/TimesheetGrid';
import { FloatingTimerWidget } from '../components/resources/FloatingTimerWidget';

export type PeopleTab =
  | 'directory'
  | 'users'
  | 'capacity'
  | 'time_off'
  | 'skills'
  | 'timesheets';

interface PeopleViewProps {
  initialTab?: PeopleTab;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ initialTab }) => {
  const {
    teamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    projects,
    activeProjectId,
  } = useProjectStore();

  const { can, user: currentAuthUser, checkAuth } = useAuthStore();

  // Active Sub-Tab
  const [activeTab, setActiveTab] = useState<PeopleTab>(initialTab || 'directory');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Resource Management Modals & Slideouts
  const [slideoutMember, setSlideoutMember] = useState<{ id: string; name: string } | null>(null);
  const [isLevelingModalOpen, setIsLevelingModalOpen] = useState(false);
  const [levelingProjectId, setLevelingProjectId] = useState<string>(
    activeProjectId || projects[0]?.id || ''
  );

  // Backend state
  const [isSyncingBackend, setIsSyncingBackend] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [backendSuccess, setBackendSuccess] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<ApiRole[]>([]);

  // Directory Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMemberForTasks, setSelectedMemberForTasks] = useState<TeamMember | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formSystemRole, setFormSystemRole] = useState<string>('contributor');
  const [formCapacity, setFormCapacity] = useState(40);
  const [formStatus, setFormStatus] = useState<MemberAvailabilityStatus>('active');
  const [formSkills, setFormSkills] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Fetch users & roles from Laravel backend on mount
  const syncWithBackend = async () => {
    setIsSyncingBackend(true);
    setBackendError(null);
    try {
      await checkAuth();
      const [usersRes, rolesRes] = await Promise.all([
        apiClient.getUsers(),
        apiClient.getRoles(),
      ]);

      setAvailableRoles(rolesRes.data);

      if (usersRes.data && usersRes.data.length > 0) {
        useProjectStore.getState().syncTeamMembersFromBackend(usersRes.data);
      }
    } catch (err: any) {
      setBackendError(err?.message || 'Could not connect to Laravel API. Operating in local mode.');
    } finally {
      setIsSyncingBackend(false);
    }
  };

  useEffect(() => {
    syncWithBackend();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read, scale down, and compress selected image file into lightweight base64 data URL
  const handleProcessImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFormError('Image size exceeds 10MB limit. Please select a smaller file.');
      return;
    }

    setIsProcessingPhoto(true);
    setFormError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        // High quality square center-crop for crisp, un-distorted 1:1 avatars
        const minEdge = Math.min(img.width, img.height);
        const sx = Math.round((img.width - minEdge) / 2);
        // Slightly bias toward top for portrait headshots so hair/face are preserved
        const sy = img.height > img.width
          ? Math.max(0, Math.round((img.height - minEdge) * 0.2))
          : Math.round((img.height - minEdge) / 2);

        const targetDim = Math.min(minEdge, 384);
        const canvas = document.createElement('canvas');
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFormPhotoUrl(dataUrl);
          setIsProcessingPhoto(false);
          return;
        }

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

  const handleDropPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessImageFile(file);
    }
  };

  // Collect all tasks across all active projects for global workload math
  const allTasks: Task[] = (projects || []).flatMap((p) => p.tasks || []);
  const activeProject = (projects || []).find((p) => p.id === activeProjectId) || (projects && projects[0]);

  // Unique departments
  const departments = ['all', ...Array.from(new Set((teamMembers || []).map((m) => m.department)))];

  const filteredMembers = (teamMembers || []).filter((m) => {
    if (selectedDept !== 'all' && m.department !== selectedDept) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = m.name.toLowerCase().includes(q);
      const matchTitle = m.jobTitle.toLowerCase().includes(q);
      const matchDept = m.department.toLowerCase().includes(q);
      const matchSkills = (m.skills || []).some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchTitle && !matchDept && !matchSkills) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormName('');
    setFormEmail('');
    setFormJobTitle('');
    setFormDepartment('Engineering');
    setFormSystemRole('contributor');
    setFormCapacity(40);
    setFormStatus('active');
    setFormSkills('');
    setFormPhotoUrl('');
    setShowUrlInput(false);
    setIsProcessingPhoto(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (m: TeamMember) => {
    setEditingMember(m);
    setFormName(m.name);
    setFormEmail(m.email || '');
    setFormJobTitle(m.jobTitle);
    setFormDepartment(m.department);
    setFormSystemRole(m.systemRole);
    setFormCapacity(m.weeklyCapacityHours);
    setFormStatus(m.status);
    setFormSkills((m.skills || []).join(', '));
    const photo = m.photoUrl || m.avatar || '';
    setFormPhotoUrl(photo);
    setShowUrlInput(Boolean(photo && !photo.startsWith('data:')));
    setIsProcessingPhoto(false);
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError('Member name is required.');
      return;
    }
    if (!formJobTitle.trim()) {
      setFormError('Job title is required.');
      return;
    }

    const skillsArray = formSkills
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const generatedEmail =
      formEmail.trim() ||
      `${formName.trim().toLowerCase().replace(/\s+/g, '.')}@deliverops.local`;

    setIsSubmitting(true);
    setFormError(null);

    try {
      if (editingMember) {
        // Update on Laravel API
        try {
          await apiClient.updateUser(editingMember.id, {
            name: formName.trim(),
            email: generatedEmail,
            jobTitle: formJobTitle.trim(),
            department: formDepartment.trim(),
            weeklyCapacityHours: Math.max(0, Number(formCapacity)),
            status: formStatus,
            skills: skillsArray,
            roles: [formSystemRole],
            avatarUrl: formPhotoUrl.trim() || undefined,
          });
        } catch (apiErr: any) {
          console.warn('API update warning:', apiErr?.message);
        }

        // Update local store
        updateTeamMember(editingMember.id, {
          name: formName.trim(),
          email: generatedEmail,
          jobTitle: formJobTitle.trim(),
          department: formDepartment.trim(),
          systemRole: formSystemRole as UserRole,
          weeklyCapacityHours: Math.max(0, Number(formCapacity)),
          status: formStatus,
          skills: skillsArray,
          photoUrl: formPhotoUrl.trim() || undefined,
          avatar: formPhotoUrl.trim() || undefined,
        });

        setBackendSuccess(`User "${formName}" updated successfully.`);
      } else {
        // Create on Laravel API
        let createdId: string | undefined;
        try {
          const res = await apiClient.createUser({
            name: formName.trim(),
            email: generatedEmail,
            password: 'Password123!',
            jobTitle: formJobTitle.trim(),
            department: formDepartment.trim() || 'General',
            weeklyCapacityHours: Math.max(0, Number(formCapacity)),
            status: formStatus,
            skills: skillsArray,
            roles: [formSystemRole],
            color: '#10b981',
            avatarUrl: formPhotoUrl.trim() || undefined,
          });
          createdId = res.data?.id;
        } catch (apiErr: any) {
          console.error('API create error:', apiErr);
          if (apiErr?.status === 422 || apiErr?.message?.includes('Validation') || apiErr?.message?.includes('roles')) {
            throw new Error(apiErr.message || 'Validation failed on backend server.');
          }
        }

        // Add to local store
        addTeamMember({
          id: createdId,
          name: formName.trim(),
          email: generatedEmail,
          jobTitle: formJobTitle.trim(),
          department: formDepartment.trim() || 'General',
          systemRole: formSystemRole as UserRole,
          weeklyCapacityHours: Math.max(0, Number(formCapacity)),
          status: formStatus,
          skills: skillsArray,
          color: '#10b981',
          photoUrl: formPhotoUrl.trim() || undefined,
          avatar: formPhotoUrl.trim() || undefined,
        });

        setBackendSuccess(`User "${formName}" registered successfully.`);
      }

      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteErrorMessage(null);

    // Call Laravel API for soft delete with RBAC guards
    try {
      await apiClient.deleteUser(id);
      setBackendSuccess(`User "${name}" deactivated successfully.`);
    } catch (apiErr: any) {
      setDeleteErrorMessage(
        apiErr?.message || `Cannot delete ${name}: Protected user account.`
      );
      return;
    }

    const result = deleteTeamMember(id);
    if (!result.success) {
      setDeleteErrorMessage(
        result.reason || `Cannot delete ${name}: Member has active assignments.`
      );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Top Header & Console Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  People & Access Control Hub
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Laravel 12 API Active
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Manage team capacity, single-point accountability, and RBAC roles matrix.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncWithBackend}
              disabled={isSyncingBackend}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all flex items-center gap-1.5 text-xs font-bold"
              title="Sync with MySQL Backend"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBackend ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">Sync DB</span>
            </button>

            {activeTab === 'directory' && can('users.create') && (
              <ClayButton
                size="md"
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Add Team Member
              </ClayButton>
            )}
          </div>
        </div>

        {/* Global Connection & Identity Pill */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Database className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold">Backend Engine:</span>
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
              MySQL 8.0 · Sanctum ULID Auth
            </code>
          </div>

          {currentAuthUser ? (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="text-slate-400">Identity:</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{currentAuthUser.name}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase font-mono">
                {currentAuthUser.primaryRole || 'admin'}
              </span>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="ml-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1"
                title="View all credentials or switch login"
              >
                <Key className="w-3 h-3" />
                Switch Account
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}
        </div>

        {/* Navigation Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('directory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'directory'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Team Directory ({filteredMembers.length})
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <TableProperties className="w-4 h-4 text-sky-400" />
            Users Management (Table & CSV)
          </button>

          <button
            onClick={() => setActiveTab('capacity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'capacity'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Capacity & Forecast
          </button>

          <button
            onClick={() => setActiveTab('time_off')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'time_off'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Time-Off Calendar
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'skills'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4" />
            Skills Matrix
          </button>

          <button
            onClick={() => setActiveTab('timesheets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'timesheets'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            Timesheets & Approvals
          </button>
        </div>

        {/* Global Success Banner */}
        {backendSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{backendSuccess}</span>
            </div>
            <button onClick={() => setBackendSuccess(null)} className="p-1 rounded-lg hover:bg-emerald-500/20">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {(deleteErrorMessage || backendError) && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-xs text-red-600 dark:text-red-400 font-bold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0 text-red-500" />
              <span>{deleteErrorMessage || backendError}</span>
            </div>
            <button
              onClick={() => {
                setDeleteErrorMessage(null);
                setBackendError(null);
              }}
              className="p-1 rounded-lg hover:bg-red-500/20 text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: TEAM DIRECTORY VIEW */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Search & Department Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, role, department, or skill (e.g., PLC, React)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-400 mr-1">Department:</span>
                {departments.map((dept) => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold capitalize transition-all ${
                      selectedDept === dept
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {dept}
                  </button>
                ))}
              </div>
            </div>

            {/* Team Members Grid or Empty State */}
            {filteredMembers.length === 0 ? (
              <EmptyState
                icon={<Users className="w-6 h-6 text-emerald-500" />}
                title={
                  searchQuery || selectedDept !== 'all'
                    ? 'No Matching Team Members'
                    : 'No Team Members in Directory'
                }
                description={
                  searchQuery || selectedDept !== 'all'
                    ? 'No members match the search query or department filter. Try clearing your filters.'
                    : 'Your organization directory is currently empty. Add team members or invite colleagues to collaborate on delivery schedules.'
                }
                primaryAction={{
                  label: 'Add Team Member',
                  onClick: () => setIsAddModalOpen(true),
                  icon: <Plus className="w-4 h-4" />,
                }}
                secondaryAction={
                  searchQuery || selectedDept !== 'all'
                    ? {
                        label: 'Clear Filters',
                        onClick: () => {
                          setSearchQuery('');
                          setSelectedDept('all');
                        },
                      }
                    : undefined
                }
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredMembers.map((member) => {
                const workload = calculateMemberWorkload(member, allTasks, activeProject?.config.weekendDays || []);
                const breakdown = getMemberTaskBreakdown(member.id, allTasks, activeProject?.config.weekendDays || [], member.name);

                const formatTitle = (str?: string) => {
                  if (!str) return '';
                  return str
                    .split(/\s+/)
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ');
                };

                return (
                  <div
                    key={member.id}
                    className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 flex flex-col justify-between space-y-4 shadow-xs border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 transition-all group"
                  >
                    <div>
                      {/* Card Top: Avatar & Actions */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {member.photoUrl || member.avatar ? (
                            <div
                              onClick={() => can('users.edit') && handleOpenEdit(member)}
                              className={`w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 aspect-square rounded-2xl overflow-hidden ring-2 ring-emerald-500/20 shadow-xs bg-slate-100 dark:bg-slate-800 ${
                                can('users.edit') ? 'cursor-pointer hover:ring-emerald-500/50 hover:shadow-sm transition-all' : ''
                              }`}
                              title={can('users.edit') ? 'Click to edit member & photo' : member.name}
                            >
                              <img
                                src={member.photoUrl || member.avatar}
                                alt={member.name}
                                className="w-full h-full object-cover object-center"
                              />
                            </div>
                          ) : (
                            <div
                              onClick={() => can('users.edit') && handleOpenEdit(member)}
                              className={`w-12 h-12 min-w-[48px] min-h-[48px] shrink-0 aspect-square rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-xs ${
                                can('users.edit') ? 'cursor-pointer hover:brightness-105 transition-all' : ''
                              }`}
                              title={can('users.edit') ? 'Click to edit member & photo' : member.name}
                            >
                              {member.name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              {formatTitle(member.name)}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                              {formatTitle(member.jobTitle)}
                            </div>
                            {member.email && (
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5 group/email">
                                <span className="truncate max-w-[150px]">{member.email}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(member.email || '');
                                    setBackendSuccess(`Copied ${member.email} to clipboard.`);
                                    setTimeout(() => setBackendSuccess(null), 2000);
                                  }}
                                  className="opacity-0 group-hover/email:opacity-100 p-0.5 hover:text-emerald-500 transition-opacity cursor-pointer shrink-0"
                                  title="Copy email to clipboard"
                                >
                                  <Copy className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {can('users.edit') && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleOpenEdit(member)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {can('users.delete') && (
                              <button
                                onClick={() => handleDelete(member.id, member.name)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                title="Deactivate Member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Badges: Department, Role, Status */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {member.department}
                        </span>

                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 capitalize">
                          {member.systemRole.replace('_', ' ')}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            member.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : member.status === 'on_leave'
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}
                        >
                          {member.status === 'on_leave' ? 'On Leave' : member.status}
                        </span>
                      </div>

                      {/* Skills Tags */}
                      {member.skills && member.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {member.skills.map((skill) => (
                            <span
                              key={skill}
                              className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Capacity & Workload Math */}
                      <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            Workload Ratio:
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              workload.overallocated
                                ? 'text-red-500 animate-pulse'
                                : workload.utilizationPercentage >= 80
                                ? 'text-amber-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {workload.utilizationPercentage}% ({workload.totalAssignedHours}h / {workload.weeklyCapacityHours}h)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              workload.overallocated
                                ? 'bg-red-500'
                                : workload.utilizationPercentage >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, workload.utilizationPercentage)}%` }}
                          />
                        </div>

                        {/* Overload Alert Warning */}
                        {workload.overallocated && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 mt-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>Over-allocated ({workload.totalAssignedHours}h assigned / {workload.weeklyCapacityHours}h capacity)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* View Task Breakdown Drawer Trigger & Cross-Project Timeline */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedMemberForTasks(member)}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-emerald-500" />
                          Assigned Tasks
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-mono">
                          {breakdown.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setSlideoutMember({ id: member.id, name: member.name })}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-600 dark:text-slate-300 transition-colors"
                        title="Cross-Project Workload Timeline"
                      >
                        <Layers className="w-4 h-4 text-emerald-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

        {/* TAB 2: USERS MANAGEMENT & CSV TABLE */}
        {activeTab === 'users' && (
          <div className="rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
            <UsersListView />
          </div>
        )}

        {/* TAB 3: CAPACITY & FORECASTING */}
        {activeTab === 'capacity' && (
          <div className="space-y-6">
            {/* Advisory Leveling Banner */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Advisory Engine
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Resource Leveling & Critical Path Protection
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
                  Run heuristic schedule optimizations without altering tasks until you review and apply proposals. Preserves zero-float critical path items.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={levelingProjectId}
                  onChange={(e) => setLevelingProjectId(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <ClayButton
                  variant="primary"
                  size="sm"
                  onClick={() => setIsLevelingModalOpen(true)}
                  disabled={!levelingProjectId}
                  className="flex items-center gap-1.5 text-xs font-bold"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Run Leveling Wizard
                </ClayButton>
              </div>
            </div>

            {/* Capacity Forecast Chart */}
            <CapacityForecastChart
              onSelectUserForSlideout={(userId, userName) =>
                setSlideoutMember({ id: userId, name: userName })
              }
            />

            {/* Hiring Recommendations Card */}
            <HiringRecommendationsCard />
          </div>
        )}

        {/* TAB 3: TIME-OFF CALENDAR */}
        {activeTab === 'time_off' && <TimeOffCalendar />}

        {/* TAB 4: SKILLS MATRIX */}
        {activeTab === 'skills' && <SkillsMatrixTable />}

        {/* TAB 5: TIMESHEETS & APPROVALS */}
        {activeTab === 'timesheets' && <TimesheetGrid />}
      </div>

      {/* Add / Edit Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="clay-card w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                {editingMember ? 'Edit Team Member' : 'Add New Team Member'}
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-500 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Photo Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  Member Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative group shrink-0">
                    <div className="w-16 h-16 min-w-[64px] min-h-[64px] shrink-0 aspect-square rounded-2xl overflow-hidden ring-2 ring-emerald-500/30 shadow-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      {formPhotoUrl ? (
                        <img
                          src={formPhotoUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
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
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        {isProcessingPhoto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                        Upload Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 hover:bg-slate-200 transition-all"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        URL
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                    <p className="text-[10px] text-slate-400">JPEG, PNG, WebP up to 10MB (auto-compressed).</p>
                  </div>
                </div>

                {showUrlInput && (
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formPhotoUrl}
                    onChange={(e) => setFormPhotoUrl(e.target.value)}
                    className="w-full mt-2 text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                )}
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ahmed Khalil"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ahmed.khalil@deliverops.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>



              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Integration Engineer"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Department *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Engineering"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={formSystemRole}
                    onChange={(e) => setFormSystemRole(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    {availableRoles.length > 0 ? (
                      availableRoles.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.displayName} ({r.name})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="contributor">Contributor</option>
                        <option value="project_manager">Project Manager</option>
                        <option value="viewer">Viewer</option>
                        <option value="admin">Administrator</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Weekly Capacity (Hours)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="168"
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Availability Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as MemberAvailabilityStatus)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="active">Active (Available)</option>
                    <option value="on_leave">On Leave (0h Capacity)</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PLC, Python, Automation"
                    value={formSkills}
                    onChange={(e) => setFormSkills(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <ClayButton
                  size="sm"
                  variant="default"
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </ClayButton>
                <ClayButton
                  size="sm"
                  variant="primary"
                  type="submit"
                  disabled={isSubmitting}
                  icon={isSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : undefined}
                >
                  {isSubmitting ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Member'}
                </ClayButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Tasks Breakdown Modal */}
      {selectedMemberForTasks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="clay-card w-full max-w-xl max-h-[85vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Assigned Tasks: {selectedMemberForTasks.name}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {selectedMemberForTasks.jobTitle} • {selectedMemberForTasks.department}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMemberForTasks(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {getMemberTaskBreakdown(selectedMemberForTasks.id, allTasks, activeProject?.config.weekendDays || []).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No active tasks assigned to this team member.
                </div>
              ) : (
                getMemberTaskBreakdown(selectedMemberForTasks.id, allTasks, activeProject?.config.weekendDays || []).map((t) => (
                  <div
                    key={t.taskId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">{t.taskName}</div>
                      <div className="text-[10px] text-slate-400">
                        {t.start} → {t.end} • Role: <strong className="capitalize">{t.role}</strong>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {t.assignedHours}h
                      </div>
                      {t.isOvertimeSchedule && (
                        <span className="text-[10px] text-purple-600 font-semibold">Overtime</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <ClayButton
                size="sm"
                variant="default"
                onClick={() => setSelectedMemberForTasks(null)}
              >
                Close
              </ClayButton>
            </div>
          </div>
        </div>
      )}
      {/* DeliverOps Auth & Login Console Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Floating Timer Quick-Log Widget */}
      <FloatingTimerWidget />

      {/* Cross-Project Timeline Slideout */}
      <CrossProjectTimelineSlideout
        isOpen={!!slideoutMember}
        onClose={() => setSlideoutMember(null)}
        userId={slideoutMember?.id || ''}
        userName={slideoutMember?.name || ''}
      />

      {/* Advisory Leveling Wizard Modal */}
      <LevelingWizardModal
        isOpen={isLevelingModalOpen}
        onClose={() => setIsLevelingModalOpen(false)}
        projectId={levelingProjectId}
        projectName={projects.find((p) => p.id === levelingProjectId)?.name || 'Project'}
      />
    </div>
  );
};
