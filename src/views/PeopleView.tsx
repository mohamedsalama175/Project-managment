import React, { useState, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  Calendar,
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
} from 'lucide-react';
import { TeamMember, UserRole, MemberAvailabilityStatus, Task } from '../types';
import { useProjectStore } from '../stores/useProjectStore';
import { ClayButton } from '../components/common/ClayButton';
import { calculateMemberWorkload, getMemberTaskBreakdown } from '../utils/capacityUtils';

export const PeopleView: React.FC = () => {
  const {
    teamMembers,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    projects,
    activeProjectId,
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [selectedMemberForTasks, setSelectedMemberForTasks] = useState<TeamMember | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formJobTitle, setFormJobTitle] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formSystemRole, setFormSystemRole] = useState<UserRole>('contributor');
  const [formCapacity, setFormCapacity] = useState(40);
  const [formStatus, setFormStatus] = useState<MemberAvailabilityStatus>('active');
  const [formSkills, setFormSkills] = useState('');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

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
        // Automatically optimize & scale image down to max 384x384 for smooth rendering and lightweight storage
        const maxDim = 384;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFormPhotoUrl(dataUrl);
          setIsProcessingPhoto(false);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.88);
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

  const handleSaveMember = (e: React.FormEvent) => {
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

    if (editingMember) {
      updateTeamMember(editingMember.id, {
        name: formName.trim(),
        jobTitle: formJobTitle.trim(),
        department: formDepartment.trim(),
        systemRole: formSystemRole,
        weeklyCapacityHours: Math.max(0, Number(formCapacity)),
        status: formStatus,
        skills: skillsArray,
        photoUrl: formPhotoUrl.trim() || undefined,
        avatar: formPhotoUrl.trim() || undefined,
      });
    } else {
      addTeamMember({
        name: formName.trim(),
        jobTitle: formJobTitle.trim(),
        department: formDepartment.trim() || 'General',
        systemRole: formSystemRole,
        weeklyCapacityHours: Math.max(0, Number(formCapacity)),
        status: formStatus,
        skills: skillsArray,
        color: '#10b981',
        photoUrl: formPhotoUrl.trim() || undefined,
        avatar: formPhotoUrl.trim() || undefined,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteErrorMessage(null);
    const result = deleteTeamMember(id);
    if (!result.success) {
      setDeleteErrorMessage(result.reason || `Cannot delete ${name}: Member has active assignments.`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Top Banner & Search */}
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-inner">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Team Directory & Workload Hub
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                Manage team profiles, monitor capacity utilization, and maintain single-point accountability.
              </p>
            </div>
          </div>

          <ClayButton
            size="md"
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            Add Team Member
          </ClayButton>
        </div>

        {/* Delete Error Alert (TC-1.5) */}
        {deleteErrorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400 font-bold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 shrink-0 text-red-500" />
              <span>{deleteErrorMessage}</span>
            </div>
            <button
              onClick={() => setDeleteErrorMessage(null)}
              className="p-1 rounded-lg hover:bg-red-500/20 text-red-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMembers.map((member) => {
            const workload = calculateMemberWorkload(member, allTasks, activeProject.config.weekendDays);
            const breakdown = getMemberTaskBreakdown(member.id, allTasks, activeProject.config.weekendDays);

            return (
              <div
                key={member.id}
                className="clay-card !p-5 flex flex-col justify-between space-y-4 border border-slate-200/80 dark:border-slate-800/80 hover:shadow-lg transition-all group"
              >
                <div>
                  {/* Card Top: Avatar & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {member.photoUrl || member.avatar ? (
                        <img
                          src={member.photoUrl || member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-md">
                          {member.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                      )}

                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {member.name}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {member.jobTitle}
                        </div>
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {member.department}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                        title="Edit profile"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member.id, member.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                        title="Delete profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Role & Status Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {member.systemRole.replace('_', ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        member.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : member.status === 'on_leave'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                      }`}
                    >
                      {member.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Skills tags */}
                  {(member.skills || []).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {member.skills!.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Capacity & Workload Gauge */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">
                      Weekly Workload:
                    </span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                      {workload.totalAssignedHours}h / {workload.weeklyCapacityHours}h
                    </span>
                  </div>

                  {/* Utilization Progress Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        workload.overallocated
                          ? 'bg-red-500'
                          : workload.utilizationPercentage > 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, workload.utilizationPercentage)}%` }}
                    />
                  </div>

                  {/* Warnings & Task Count */}
                  <div className="flex items-center justify-between text-[11px] font-semibold pt-0.5">
                    <button
                      onClick={() => setSelectedMemberForTasks(member)}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{breakdown.length} active tasks</span>
                    </button>

                    {workload.overallocated ? (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1 font-bold animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Overallocated ({workload.utilizationPercentage}%)
                      </span>
                    ) : (
                      <span className="text-slate-400 font-mono">
                        {workload.utilizationPercentage}% loaded
                      </span>
                    )}
                  </div>

                  {/* Unestimated & Overtime notices */}
                  {workload.unestimatedTaskCount > 0 && (
                    <div className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ {workload.unestimatedTaskCount} task(s) unestimated
                    </div>
                  )}
                  {workload.overtimeTaskCount > 0 && (
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                      ⚠️ {workload.overtimeTaskCount} weekend overtime task(s)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="clay-card w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-500" />
                <span>{editingMember ? 'Edit Team Member' : 'Add New Team Member'}</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs font-semibold text-red-600">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveMember} className="space-y-3.5">
              {/* Profile Photo / Avatar Upload Section */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropPhoto}
                className="flex items-center gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
              >
                {/* Avatar Preview with click to upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative group cursor-pointer shrink-0"
                  title="Click to choose a photo from your computer or phone"
                >
                  {formPhotoUrl ? (
                    <img
                      src={formPhotoUrl}
                      alt="Profile preview"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500 shadow-md group-hover:opacity-85 transition-opacity"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-lg flex items-center justify-center shadow-md group-hover:brightness-105 transition-all">
                      {formName.trim() ? (
                        formName
                          .trim()
                          .split(/\s+/)
                          .map((p) => p[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()
                      ) : (
                        <User className="w-8 h-8 text-white/80" />
                      )}
                    </div>
                  )}

                  {/* Hover Camera Overlay */}
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                    {isProcessingPhoto ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5 drop-shadow" />
                    )}
                  </div>
                </div>

                {/* Upload Buttons & Options */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />

                    <button
                      type="button"
                      disabled={isProcessingPhoto}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
                    >
                      {isProcessingPhoto ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Optimizing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>{formPhotoUrl ? 'Change Photo' : 'Upload Photo'}</span>
                        </>
                      )}
                    </button>

                    {formPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormPhotoUrl('')}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click or drag & drop a photo from your device (JPG, PNG, WebP).
                  </p>

                  {/* Optional URL Toggle / Input */}
                  <div className="pt-0.5">
                    {!showUrlInput ? (
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(true)}
                        className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>Or link via image URL</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="text"
                          placeholder="Paste image URL (https://...)"
                          value={formPhotoUrl}
                          onChange={(e) => setFormPhotoUrl(e.target.value)}
                          className="flex-1 text-[11px] py-1 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(false)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                          title="Hide URL input"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mahmoud Abdel-Fattah"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Industrial Automation Lead"
                    value={formJobTitle}
                    onChange={(e) => setFormJobTitle(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Engineering"
                    value={formDepartment}
                    onChange={(e) => setFormDepartment(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    System Role
                  </label>
                  <select
                    value={formSystemRole}
                    onChange={(e) => setFormSystemRole(e.target.value as UserRole)}
                    className="w-full text-xs font-semibold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="contributor">Contributor</option>
                    <option value="project_manager">Project Manager</option>
                    <option value="admin">Administrator</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Weekly Capacity (Hours)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={80}
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
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
                <ClayButton size="sm" variant="primary" type="submit">
                  {editingMember ? 'Save Changes' : 'Create Member'}
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
              {getMemberTaskBreakdown(selectedMemberForTasks.id, allTasks, activeProject.config.weekendDays).length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No active tasks assigned to this team member.
                </div>
              ) : (
                getMemberTaskBreakdown(selectedMemberForTasks.id, allTasks, activeProject.config.weekendDays).map((t) => (
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
    </div>
  );
};
