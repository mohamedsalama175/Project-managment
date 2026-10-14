import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Key,
  Plus,
  Globe,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Save,
  Check,
  Home,
  ChevronRight,
  FolderKanban,
  ListTodo,
  ShieldAlert,
  DollarSign,
  Users,
  Zap,
  ShieldCheck,
  Plug,
  LayoutGrid,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useProjectStore } from '../../stores/useProjectStore';

interface PermissionItem {
  id: string;
  name: string;
  description: string;
  label: string;
}

interface SubjectItem {
  name: string;
  permissions: PermissionItem[];
}

interface ModuleItem {
  key: string;
  name: string;
  icon: string;
  subjects_count: number;
  permissions_count: number;
  subjects: SubjectItem[];
}

// Fallback hierarchy if API returns empty
const DEFAULT_DELIVEROPS_MODULES: ModuleItem[] = [
  {
    key: 'projects',
    name: 'Projects & Scheduling',
    icon: 'FolderKanban',
    subjects_count: 2,
    permissions_count: 6,
    subjects: [
      {
        name: 'Project Management',
        permissions: [
          { id: '1', name: 'projects.view', description: 'View accessible project schedules', label: 'View Projects' },
          { id: '2', name: 'projects.create', description: 'Create new project schedules', label: 'Create Projects' },
          { id: '3', name: 'projects.edit', description: 'Modify project metadata and calendar', label: 'Edit Projects' },
          { id: '4', name: 'projects.archive', description: 'Archive or restore projects', label: 'Archive Projects' },
          { id: '5', name: 'projects.import', description: 'Perform bootstrap data migration', label: 'Import Projects' },
        ],
      },
      {
        name: 'Baselines & Milestones',
        permissions: [
          { id: '6', name: 'baselines.lock', description: 'Lock or clear official project baselines', label: 'Lock Baselines' },
        ],
      },
    ],
  },
  {
    key: 'tasks',
    name: 'Tasks & WBS',
    icon: 'ListTodo',
    subjects_count: 4,
    permissions_count: 12,
    subjects: [
      {
        name: 'WBS Hierarchy',
        permissions: [
          { id: '7', name: 'tasks.create', description: 'Add new tasks to project WBS', label: 'Create WBS Tasks' },
          { id: '8', name: 'tasks.edit_details', description: 'Edit task description, duration, and dates', label: 'Edit Task Details' },
          { id: '9', name: 'tasks.delete', description: 'Delete tasks from project WBS', label: 'Delete Tasks' },
          { id: '10', name: 'tasks.view.all', description: 'View all tasks across all users and projects', label: 'View All Tasks' },
        ],
      },
      {
        name: 'Execution & Progress',
        permissions: [
          { id: '11', name: 'tasks.list', description: 'List assigned tasks', label: 'List Assigned Tasks' },
          { id: '12', name: 'tasks.show', description: 'View task details', label: 'Show Task Details' },
          { id: '13', name: 'tasks.update_progress', description: 'Update progress percentage on tasks', label: 'Update Progress' },
          { id: '14', name: 'tasks.edit_own_progress', description: 'Update progress on own tasks', label: 'Update Own Progress' },
        ],
      },
      {
        name: 'Reviews & Approvals',
        permissions: [
          { id: '15', name: 'tasks.request_review', description: 'Submit completed tasks for sign-off review', label: 'Request Review' },
          { id: '16', name: 'tasks.approve_review', description: 'Approve or reject tasks pending review', label: 'Approve Review' },
        ],
      },
      {
        name: 'Task Collaboration',
        permissions: [
          { id: '17', name: 'tasks.comment', description: 'Comment on assigned tasks', label: 'Comment on Tasks' },
          { id: '18', name: 'comments.create', description: 'Post comments across project tasks', label: 'Create Comments' },
        ],
      },
    ],
  },
  {
    key: 'risks',
    name: 'Risks & Governance',
    icon: 'ShieldAlert',
    subjects_count: 1,
    permissions_count: 2,
    subjects: [
      {
        name: 'Risk Register & Mitigation',
        permissions: [
          { id: '19', name: 'risks.view', description: 'View risk register', label: 'View Risks' },
          { id: '20', name: 'risks.manage', description: 'Create, update, and resolve project risks and blockers', label: 'Manage Risks' },
        ],
      },
    ],
  },
  {
    key: 'financials',
    name: 'Financials & Invoicing',
    icon: 'DollarSign',
    subjects_count: 4,
    permissions_count: 14,
    subjects: [
      {
        name: 'Budgets & EVM',
        permissions: [
          { id: '21', name: 'budget.view', description: 'View project budgets and financial metrics', label: 'View Budgets' },
          { id: '22', name: 'budget.manage', description: 'Update project budgets and parameters', label: 'Manage Budgets' },
          { id: '23', name: 'evm.view', description: 'View Earned Value Management computations and charts', label: 'View EVM Analysis' },
        ],
      },
      {
        name: 'Labor Rates & Costing',
        permissions: [
          { id: '24', name: 'rates.view', description: 'View user labor and billable cost rates', label: 'View Labor Rates' },
          { id: '25', name: 'rates.manage', description: 'Manage user labor rates and rate histories', label: 'Manage Rates' },
          { id: '26', name: 'costs.view', description: 'Inspect project labor costs and snapshots', label: 'Inspect Costs' },
        ],
      },
      {
        name: 'Expense Claims',
        permissions: [
          { id: '27', name: 'expenses.create', description: 'Submit project expense claims and receipts', label: 'Submit Expenses' },
          { id: '28', name: 'expenses.view', description: 'View project expense claims', label: 'View Expenses' },
          { id: '29', name: 'expenses.approve', description: 'Approve or reject expense claims', label: 'Approve Expenses' },
          { id: '30', name: 'expenses.reimburse', description: 'Mark approved expenses as reimbursed', label: 'Reimburse Expenses' },
        ],
      },
      {
        name: 'Invoices & Billing',
        permissions: [
          { id: '31', name: 'invoices.view', description: 'View customer invoices', label: 'View Invoices' },
          { id: '32', name: 'invoices.manage', description: 'Create, edit, send, and void invoices', label: 'Manage Invoices' },
          { id: '33', name: 'currencies.manage', description: 'Manage exchange rates and base currencies', label: 'Manage Currencies' },
          { id: '34', name: 'reports.generate', description: 'Generate and export financial and progress reports', label: 'Generate Reports' },
        ],
      },
    ],
  },
  {
    key: 'users',
    name: 'Team & Resource Capacity',
    icon: 'Users',
    subjects_count: 2,
    permissions_count: 6,
    subjects: [
      {
        name: 'Users Directory',
        permissions: [
          { id: '35', name: 'users.view', description: 'View users directory and capacity metrics', label: 'View Users' },
          { id: '36', name: 'users.create', description: 'Create new user accounts', label: 'Create Users' },
          { id: '37', name: 'users.edit', description: 'Modify user profiles and capacity', label: 'Edit Users' },
          { id: '38', name: 'users.delete', description: 'Deactivate or soft-delete user accounts', label: 'Delete Users' },
        ],
      },
      {
        name: 'Roles & Permissions',
        permissions: [
          { id: '39', name: 'roles.view', description: 'View roles and permission matrices', label: 'View Roles' },
          { id: '40', name: 'roles.manage', description: 'Create, edit, or delete custom roles', label: 'Manage Roles' },
        ],
      },
    ],
  },
  {
    key: 'automation',
    name: 'Automation & Rules Engine',
    icon: 'Zap',
    subjects_count: 1,
    permissions_count: 3,
    subjects: [
      {
        name: 'Automation Rules & Triggers',
        permissions: [
          { id: '41', name: 'automation.view', description: 'View automation rules and triggers', label: 'View Automations' },
          { id: '42', name: 'automation.manage', description: 'Create and edit automation recipes', label: 'Manage Automations' },
          { id: '43', name: 'automation.execute', description: 'Manually execute automation workflows', label: 'Execute Workflows' },
        ],
      },
    ],
  },
  {
    key: 'compliance',
    name: 'Compliance & Security',
    icon: 'ShieldCheck',
    subjects_count: 3,
    permissions_count: 7,
    subjects: [
      {
        name: 'Audit Trail & Verification',
        permissions: [
          { id: '44', name: 'audit.view', description: 'Inspect project audit trails and security logs', label: 'View Audit Logs' },
          { id: '45', name: 'audit.verify', description: 'Verify cryptographic audit chain integrity', label: 'Verify Audit Chain' },
        ],
      },
      {
        name: 'GDPR & DSAR',
        permissions: [
          { id: '46', name: 'compliance.view', description: 'View compliance dashboard and DSAR requests', label: 'View Compliance' },
          { id: '47', name: 'compliance.manage', description: 'Manage GDPR erasure and export requests', label: 'Manage Compliance' },
          { id: '48', name: 'compliance.dsar', description: 'Submit and process DSAR exports', label: 'Process DSAR Exports' },
        ],
      },
      {
        name: 'Legal Holds',
        permissions: [
          { id: '49', name: 'legal_holds.view', description: 'View active legal holds', label: 'View Legal Holds' },
          { id: '50', name: 'legal_holds.manage', description: 'Create and release legal holds', label: 'Manage Legal Holds' },
          { id: '51', name: 'legal_holds.export', description: 'Export e-discovery archives', label: 'Export E-Discovery' },
        ],
      },
    ],
  },
  {
    key: 'integrations',
    name: 'Integrations & Developer APIs',
    icon: 'Plug',
    subjects_count: 3,
    permissions_count: 6,
    subjects: [
      {
        name: 'API Keys & Webhooks',
        permissions: [
          { id: '52', name: 'api_keys.manage', description: 'Create and revoke API keys', label: 'Manage API Keys' },
          { id: '53', name: 'oauth_apps.manage', description: 'Manage OAuth developer applications', label: 'Manage OAuth Apps' },
          { id: '54', name: 'webhooks.manage', description: 'Configure and test outbound webhooks', label: 'Manage Webhooks' },
        ],
      },
      {
        name: 'Connected Apps & Imports',
        permissions: [
          { id: '55', name: 'integrations.install', description: 'Install and manage third-party integrations', label: 'Install Integrations' },
          { id: '56', name: 'imports.execute', description: 'Execute competitor project data imports', label: 'Execute Data Imports' },
        ],
      },
      {
        name: 'Enterprise SSO',
        permissions: [
          { id: '57', name: 'sso.manage', description: 'Configure SAML/OIDC SSO and SCIM provisioning', label: 'Manage Enterprise SSO' },
        ],
      },
    ],
  },
  {
    key: 'dashboards',
    name: 'Dashboards & Analytics',
    icon: 'LayoutGrid',
    subjects_count: 1,
    permissions_count: 1,
    subjects: [
      {
        name: 'Executive Dashboards & Reports',
        permissions: [
          { id: '58', name: 'dashboards.manage', description: 'Create and customize personal and shared dashboards', label: 'Manage Dashboards' },
        ],
      },
    ],
  },
];

export const CreateRoleView: React.FC = () => {
  const { setActiveView } = useProjectStore();

  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [modules, setModules] = useState<ModuleItem[]>(DEFAULT_DELIVEROPS_MODULES);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    projects: true,
    tasks: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch hierarchical permissions from backend API
  useEffect(() => {
    apiClient
      .getPermissions()
      .then((res: any) => {
        if (res.modules && res.modules.length > 0) {
          setModules(res.modules);
        }
      })
      .catch(() => {
        // Fallback already pre-loaded
      });
  }, []);

  // Compute total permissions count across all modules
  const allAvailablePermissions = useMemo(() => {
    const list: string[] = [];
    modules.forEach((mod) => {
      mod.subjects.forEach((subj) => {
        subj.permissions.forEach((p) => {
          if (!list.includes(p.name)) list.push(p.name);
        });
      });
    });
    return list;
  }, [modules]);

  const totalCount = allAvailablePermissions.length;
  const isAllSelected = totalCount > 0 && selectedPermissions.length === totalCount;

  // Toggle Single Permission
  const handleTogglePermission = (name: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  // Toggle Global Select All
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions([...allAvailablePermissions]);
    }
  };

  // Toggle Module Select All
  const handleToggleModule = (mod: ModuleItem) => {
    const modPerms: string[] = [];
    mod.subjects.forEach((s) => s.permissions.forEach((p) => modPerms.push(p.name)));

    const isModuleFullySelected = modPerms.every((p) => selectedPermissions.includes(p));

    if (isModuleFullySelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !modPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...modPerms])));
    }
  };

  // Toggle Subject Select All
  const handleToggleSubject = (subject: SubjectItem) => {
    const subjPerms = subject.permissions.map((p) => p.name);
    const isSubjectFullySelected = subjPerms.every((p) => selectedPermissions.includes(p));

    if (isSubjectFullySelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !subjPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...subjPerms])));
    }
  };

  // Toggle Accordion Expansion
  const toggleExpand = (modKey: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [modKey]: !prev[modKey],
    }));
  };

  // Helper icon renderer
  const renderModuleIcon = (icon: string) => {
    switch (icon) {
      case 'FolderKanban':
        return <FolderKanban className="w-4 h-4 text-sky-600" />;
      case 'ListTodo':
        return <ListTodo className="w-4 h-4 text-emerald-600" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'DollarSign':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'Users':
        return <Users className="w-4 h-4 text-indigo-600" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'Plug':
        return <Plug className="w-4 h-4 text-blue-600" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-slate-600" />;
    }
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast('Please enter a role name.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const slugName = roleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
      await apiClient.createRole({
        name: slugName,
        displayName: roleName.trim(),
        description: description.trim(),
        permissions: selectedPermissions,
      });

      showToast(`Role "${roleName}" created successfully!`);
      setTimeout(() => {
        setActiveView('roles');
      }, 1000);
    } catch (err: any) {
      showToast(err.message || 'Failed to create role.', 'error');
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] text-slate-800 font-sans min-h-screen pb-20">
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

      {/* Breadcrumb Navigation Matching Screenshot 4 */}
      <div className="px-6 py-3.5 flex items-center justify-between border-b border-slate-200/80 bg-white">
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
          <button
            type="button"
            onClick={() => setActiveView('roles')}
            className="hover:text-slate-800 transition-colors"
          >
            Roles
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-800">
            Create Role
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 max-w-[1200px] w-full mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
          Create Role
        </h1>

        <form onSubmit={handleSaveRole} className="space-y-6">
          {/* Card 1: Role Details Matching Screenshot 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs border border-blue-100">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">Role Name</h2>
                <p className="text-[11px] text-slate-400">Enter the primary details for this role</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Role Name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full text-xs sm:text-[13px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder="Enter Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs sm:text-[13px] px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1e254b]/15 focus:border-[#1e254b] transition-all resize-none"
                  />
                  {/* Language / Translation Icons matching screenshot */}
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5 text-slate-400">
                    <button
                      type="button"
                      className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="Add translation"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                      title="Select language"
                    >
                      <Globe className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Permissions Matrix Matching Screenshot 4 */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs border border-amber-100">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-sm font-bold text-slate-900 leading-tight">Permissions</h2>
                    {/* Live Counter Badge Matching Screenshot (0 / 157) */}
                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/60">
                      {selectedPermissions.length} / {totalCount}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Manage access across modules</p>
                </div>
              </div>

              {/* Global Select All */}
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="rounded text-[#1e254b] focus:ring-[#1e254b] border-slate-300 w-4 h-4"
                />
                <span>Select All</span>
              </label>
            </div>

            {/* Modules Accordion List */}
            <div className="space-y-3 pt-2">
              {modules.map((mod) => {
                const isExpanded = !!expandedModules[mod.key];
                const modPerms: string[] = [];
                mod.subjects.forEach((s) => s.permissions.forEach((p) => modPerms.push(p.name)));
                const isModSelected =
                  modPerms.length > 0 && modPerms.every((p) => selectedPermissions.includes(p));
                const isModPartiallySelected =
                  !isModSelected && modPerms.some((p) => selectedPermissions.includes(p));

                return (
                  <div
                    key={mod.key}
                    className="border border-slate-200/90 rounded-xl overflow-hidden bg-white shadow-xs transition-all"
                  >
                    {/* Module Accordion Header */}
                    <div className="px-4 py-3 flex items-center justify-between bg-slate-50/70 hover:bg-slate-100/60 transition-colors">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleExpand(mod.key)}
                      >
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                          {renderModuleIcon(mod.icon)}
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800">{mod.name}</span>
                          <span className="ml-2 text-[11px] text-slate-400 font-normal">
                            {mod.subjects_count} Subjects
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isModSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isModPartiallySelected;
                            }}
                            onChange={() => handleToggleModule(mod)}
                            className="rounded text-[#1e254b] focus:ring-[#1e254b] border-slate-300 w-3.5 h-3.5"
                          />
                          <span>Select All</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => toggleExpand(mod.key)}
                          className="p-1 rounded text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Subjects & Granular Permissions */}
                    {isExpanded && (
                      <div className="p-4 bg-white border-t border-slate-100 space-y-4">
                        {mod.subjects.map((subject) => {
                          const subjPerms = subject.permissions.map((p) => p.name);
                          const isSubjSelected =
                            subjPerms.length > 0 && subjPerms.every((p) => selectedPermissions.includes(p));
                          const isSubjPartiallySelected =
                            !isSubjSelected && subjPerms.some((p) => selectedPermissions.includes(p));

                          return (
                            <div
                              key={subject.name}
                              className="p-3.5 rounded-xl bg-slate-50/50 border border-slate-100 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-700">{subject.name}</span>
                                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 font-medium cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSubjSelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = isSubjPartiallySelected;
                                    }}
                                    onChange={() => handleToggleSubject(subject)}
                                    className="rounded text-[#1e254b] focus:ring-[#1e254b] border-slate-300 w-3 h-3"
                                  />
                                  <span>Select All</span>
                                </label>
                              </div>

                              {/* Checkbox Items Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                {subject.permissions.map((perm) => {
                                  const isChecked = selectedPermissions.includes(perm.name);
                                  return (
                                    <label
                                      key={perm.name}
                                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all select-none ${
                                        isChecked
                                          ? 'bg-slate-100/90 border-slate-300 text-slate-900 font-semibold'
                                          : 'bg-white border-slate-200/70 text-slate-600 hover:border-slate-300'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleTogglePermission(perm.name)}
                                        className="mt-0.5 rounded text-[#1e254b] focus:ring-[#1e254b] border-slate-300 w-3.5 h-3.5"
                                      />
                                      <div className="leading-snug">
                                        <div>{perm.label}</div>
                                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Action Bar Matching Screenshot 4 */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <button
              type="button"
              onClick={() => setActiveView('roles')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-[#1e254b] hover:bg-[#161c3b] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-[#1e254b]/20 transition-all disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Branded Footer Matching Screenshot */}
        <div className="text-center text-[11px] text-slate-400 pt-6 pb-2">
          © 2026. All rights reserved by Bitwise-solutions.
        </div>
      </div>
    </div>
  );
};
