import React, { useState, useEffect } from 'react';
import {
  Building,
  Users,
  Mail,
  Shield,
  Trash2,
  Check,
  X,
  AlertCircle,
  Copy,
  RefreshCw,
  Clock,
  Sparkles,
  Calendar,
  Globe,
  Briefcase,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import {
  apiClient,
  ApiOrganization,
  ApiOrganizationMember,
  ApiOrganizationInvitation,
} from '../../api/client';
import { ClayButton } from '../common/ClayButton';

interface OrgSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'general' | 'members' | 'invitations';
}

export const OrgSettingsModal: React.FC<OrgSettingsModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'general',
}) => {
  const { currentOrganization, refreshUser, user: authUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'invitations'>(defaultTab);

  // General Settings State
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('MENA');
  const [billingEmail, setBillingEmail] = useState('');
  const [defaultCalendar, setDefaultCalendar] = useState('standard_5d_40h');
  const [logoPath, setLogoPath] = useState('');
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);

  // Members State
  const [members, setMembers] = useState<ApiOrganizationMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);

  // Invitations State
  const [invitations, setInvitations] = useState<ApiOrganizationInvitation[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'billing' | 'admin' | 'owner'>('member');
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Status Alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab, isOpen]);

  useEffect(() => {
    if (currentOrganization) {
      setName(currentOrganization.name || '');
      setIndustry(currentOrganization.industry || '');
      setRegion(currentOrganization.region || 'MENA');
      setBillingEmail(currentOrganization.billingEmail || '');
      setLogoPath(currentOrganization.logoPath || '');
      const settings = currentOrganization.settings as any;
      if (settings?.default_calendar) {
        setDefaultCalendar(settings.default_calendar);
      }
    }
  }, [currentOrganization]);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      if (activeTab === 'members') {
        loadMembers();
      } else if (activeTab === 'invitations') {
        loadInvitations();
      }
    }
  }, [isOpen, activeTab]);

  const loadMembers = async () => {
    setIsLoadingMembers(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.getMembers();
      setMembers(res.members || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch organization members.');
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadInvitations = async () => {
    setIsLoadingInvites(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.getInvitations();
      setInvitations(res.invitations || []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch pending invitations.');
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.updateCurrentOrganization({
        name,
        industry: industry || undefined,
        region,
        billing_email: billingEmail || undefined,
        logo: logoPath || undefined,
        default_calendar: defaultCalendar,
      });
      await refreshUser();
      setSuccessMsg('Organization settings saved successfully.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update organization settings.');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setMemberActionLoading(targetUserId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.updateMemberRole(targetUserId, newRole);
      setSuccessMsg('Member role updated successfully.');
      await loadMembers();
      await refreshUser();
    } catch (err: any) {
      if (err?.code === 'ORG_CANNOT_REMOVE_OWNER') {
        setErrorMsg('Cannot remove the owner role from the last organization owner.');
      } else {
        setErrorMsg(err?.message || 'Failed to update member role.');
      }
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleRemoveMember = async (targetUserId: string, memberName: string) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this organization?`)) {
      return;
    }
    setMemberActionLoading(targetUserId);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await apiClient.removeMember(targetUserId);
      setSuccessMsg(`Member ${memberName} removed successfully.`);
      await loadMembers();
      await refreshUser();
    } catch (err: any) {
      if (err?.code === 'ORG_CANNOT_REMOVE_OWNER') {
        setErrorMsg('Cannot remove the last organization owner. Transfer ownership first.');
      } else {
        setErrorMsg(err?.message || 'Failed to remove member.');
      }
    } finally {
      setMemberActionLoading(null);
    }
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const emailList = bulkEmails
      .split(/[\n,; ]+/)
      .map((em) => em.trim().toLowerCase())
      .filter((em) => em.length > 0 && em.includes('@'));

    if (emailList.length === 0) {
      setErrorMsg('Please enter at least one valid email address.');
      return;
    }

    if (emailList.length > 50) {
      setErrorMsg('Daily invitation limit is 50 invites per organization.');
      return;
    }

    setIsSendingInvites(true);
    let successCount = 0;
    const errors: string[] = [];

    for (const email of emailList) {
      try {
        if (currentOrganization?.id) {
          await apiClient.inviteByOrgId(currentOrganization.id, email, inviteRole);
        } else {
          await apiClient.inviteMember(email, inviteRole);
        }
        successCount++;
      } catch (err: any) {
        if (err?.code === 'ORG_PLAN_LIMIT_EXCEEDED') {
          errors.push(`${email}: Organization plan limit exceeded. Upgrade to add more users.`);
          break;
        } else if (err?.code === 'INVITE_ALREADY_MEMBER') {
          errors.push(`${email}: User is already an active member.`);
        } else {
          errors.push(`${email}: ${err?.message || 'Failed to send invite'}`);
        }
      }
    }

    setIsSendingInvites(false);
    if (successCount > 0) {
      setSuccessMsg(`Successfully sent ${successCount} invitation(s).`);
      setBulkEmails('');
      await loadInvitations();
    }
    if (errors.length > 0) {
      setErrorMsg(errors.join(' | '));
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setErrorMsg(null);
    try {
      await apiClient.revokeInvitation(invitationId);
      setSuccessMsg('Invitation revoked successfully.');
      await loadInvitations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to revoke invitation.');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    setErrorMsg(null);
    try {
      await apiClient.resendInvitation(invitationId);
      setSuccessMsg('Invitation resent with renewed 7-day expiration.');
      await loadInvitations();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to resend invitation.');
    }
  };

  const copyInviteLink = (token?: string) => {
    if (!token) return;
    const url = `${window.location.origin}/invite/accept?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  if (!isOpen) return null;

  const plan = currentOrganization?.plan || 'free';
  const ownerCount = members.filter((m) => m.isOwner || m.role === 'owner').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="clay-card w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  {currentOrganization?.name || 'Organization Settings'}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                    plan === 'enterprise'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                      : plan === 'pro'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {plan} tier
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                Tenant Slug: <span className="text-slate-700 dark:text-slate-300 font-bold">{currentOrganization?.slug || 'workspace'}</span> • ID: {currentOrganization?.id?.slice(0, 10)}...
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200/60 dark:border-slate-800 px-6 gap-2 bg-slate-100/50 dark:bg-slate-900/20 pt-2">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'general'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Building className="w-4 h-4" />
            General Settings
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'members'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Members ({members.length || '...'})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 ${
              activeTab === 'invitations'
                ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            Invitations ({invitations.length || '0'})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-6 max-w-2xl">
              <div className="clay-card !p-4 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tier Guardrails & Limits
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {plan === 'free'
                      ? 'Free Tier: Enforces max 3 projects and 5 organization users. Error code ORG_PLAN_LIMIT_EXCEEDED.'
                      : plan === 'pro'
                      ? 'Pro Tier: Unlimited projects and unlimited users with priority scheduling.'
                      : 'Enterprise Tier: Unlimited scale, Custom SAML/SSO enforcement, and 99.99% SLA.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100"
                    placeholder="Acme Delivery Corp"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100"
                    placeholder="billing@acme.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5" /> Industry
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100 bg-transparent"
                  >
                    <option value="">Select industry...</option>
                    <option value="Technology">Technology & Software</option>
                    <option value="Construction">Construction & Civil Engineering</option>
                    <option value="Energy">Energy, Oil & Gas</option>
                    <option value="Healthcare">Healthcare & Life Sciences</option>
                    <option value="Manufacturing">Manufacturing & Logistics</option>
                    <option value="Finance">Financial Services</option>
                    <option value="Consulting">Professional Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" /> Operating Region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100 bg-transparent"
                  >
                    <option value="MENA">MENA (Middle East & North Africa)</option>
                    <option value="EMEA">EMEA (Europe, Middle East & Africa)</option>
                    <option value="NA">NA (North America)</option>
                    <option value="APAC">APAC (Asia-Pacific)</option>
                    <option value="LATAM">LATAM (Latin America)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> Default Working Calendar
                  </label>
                  <select
                    value={defaultCalendar}
                    onChange={(e) => setDefaultCalendar(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100 bg-transparent"
                  >
                    <option value="standard_5d_40h">Standard 5-Day (Mon-Fri, 40h/wk)</option>
                    <option value="mena_5d_40h">MENA 5-Day (Sun-Thu, 40h/wk)</option>
                    <option value="commercial_6d_48h">Commercial 6-Day (Mon-Sat, 48h/wk)</option>
                    <option value="shift_7d_continuous">24/7 Continuous Shift Schedule</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Logo URL / Path
                  </label>
                  <input
                    type="text"
                    value={logoPath}
                    onChange={(e) => setLogoPath(e.target.value)}
                    className="clay-input w-full px-3.5 py-2 text-sm rounded-xl text-slate-800 dark:text-slate-100"
                    placeholder="https://cdn.acme.com/logo.png"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800 flex justify-end gap-3">
                <ClayButton
                  type="submit"
                  variant="primary"
                  disabled={isSavingGeneral}
                  icon={isSavingGeneral ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                >
                  {isSavingGeneral ? 'Saving Settings...' : 'Save Organization Settings'}
                </ClayButton>
              </div>
            </form>
          )}

          {/* TAB 2: MEMBERS DIRECTORY */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Organization Members & Role Governance
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Manage tenant-level roles: <span className="font-semibold">Owner</span>, <span className="font-semibold">Admin</span>, <span className="font-semibold">Billing</span>, <span className="font-semibold">Member</span>. Last owner is strictly protected.
                  </p>
                </div>
                <ClayButton
                  variant="default"
                  size="sm"
                  onClick={loadMembers}
                  icon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingMembers ? 'animate-spin' : ''}`} />}
                >
                  Refresh
                </ClayButton>
              </div>

              {isLoadingMembers ? (
                <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
                  <span>Loading members directory...</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="p-3.5">Member</th>
                        <th className="p-3.5">Job / Department</th>
                        <th className="p-3.5">Joined</th>
                        <th className="p-3.5">Tenant Role</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                      {members.map((member) => {
                        const isThisUserOwner = member.isOwner || member.role === 'owner';
                        const isLastOwner = isThisUserOwner && ownerCount <= 1;
                        const isSelf = member.id === authUser?.id;

                        return (
                          <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm"
                                  style={{ backgroundColor: (member as any).color || '#10b981' }}
                                >
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="truncate">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    {member.name}
                                    {isSelf && (
                                      <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded font-normal">
                                        You
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-400">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5 text-slate-600 dark:text-slate-300">
                              <div>{member.jobTitle || 'Team Member'}</div>
                              <div className="text-[10px] text-slate-400">{member.department || 'Operations'}</div>
                            </td>
                            <td className="p-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                              {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <select
                                  disabled={isLastOwner || memberActionLoading === member.id}
                                  value={isThisUserOwner ? 'owner' : member.role || 'member'}
                                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                                  className={`clay-input !py-1 !px-2 rounded-lg text-xs font-semibold ${
                                    isLastOwner ? 'opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-800' : ''
                                  }`}
                                  title={isLastOwner ? 'Cannot demote the last organization owner' : 'Change member role'}
                                >
                                  <option value="owner">Owner</option>
                                  <option value="admin">Admin</option>
                                  <option value="billing">Billing</option>
                                  <option value="member">Member</option>
                                </select>
                                {isLastOwner && (
                                  <span
                                    title="Last owner protection active"
                                    className="text-amber-500 cursor-help"
                                  >
                                    <Shield className="w-3.5 h-3.5" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                disabled={isLastOwner || memberActionLoading === member.id}
                                onClick={() => handleRemoveMember(member.id, member.name)}
                                className={`p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors ${
                                  isLastOwner ? 'opacity-30 cursor-not-allowed' : ''
                                }`}
                                title={isLastOwner ? 'Cannot remove the last organization owner' : 'Remove member'}
                              >
                                {memberActionLoading === member.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVITATIONS & BULK INVITE */}
          {activeTab === 'invitations' && (
            <div className="space-y-6">
              {/* Bulk Invite Box */}
              <form onSubmit={handleBulkInvite} className="clay-card !p-5 rounded-2xl space-y-4 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Invite Team Members (Bulk Supported)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Rate limit: 50 invites / day per organization
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Email Addresses (Enter comma-separated or one per line)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={bulkEmails}
                    onChange={(e) => setBulkEmails(e.target.value)}
                    placeholder="alex@example.com, sarah@example.com, dev@company.com"
                    className="clay-input w-full p-3 text-xs rounded-xl text-slate-800 dark:text-slate-100 font-mono resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Assigned Role:
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as any)}
                      className="clay-input !py-1.5 !px-3 rounded-xl text-xs font-semibold"
                    >
                      <option value="member">Member (Contributor)</option>
                      <option value="billing">Billing (Viewer)</option>
                      <option value="admin">Admin (Manager)</option>
                      <option value="owner">Co-Owner</option>
                    </select>
                  </div>

                  <ClayButton
                    type="submit"
                    variant="primary"
                    disabled={isSendingInvites}
                    icon={isSendingInvites ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                  >
                    {isSendingInvites ? 'Sending Invitations...' : 'Send Invitations'}
                  </ClayButton>
                </div>
              </form>

              {/* Active Pending Invitations Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pending Invitations (Valid for 7 days)
                  </h4>
                  <ClayButton
                    variant="default"
                    size="sm"
                    onClick={loadInvitations}
                    icon={<RefreshCw className={`w-3 h-3 ${isLoadingInvites ? 'animate-spin' : ''}`} />}
                  >
                    Refresh
                  </ClayButton>
                </div>

                {isLoadingInvites ? (
                  <div className="p-8 text-center text-slate-400">Loading invitations...</div>
                ) : invitations.length === 0 ? (
                  <div className="p-8 text-center clay-card rounded-2xl text-slate-400 text-xs">
                    No pending invitations. Enter emails above to invite team members.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">
                        <tr>
                          <th className="p-3">Email</th>
                          <th className="p-3">Role</th>
                          <th className="p-3">Invited By</th>
                          <th className="p-3">Expires At</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                        {invitations.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {inv.email}
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                {inv.role}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500">
                              {inv.invitedBy?.name || 'Admin'}
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">
                              {inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : '7 days'}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {inv.token && (
                                  <button
                                    onClick={() => copyInviteLink(inv.token)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                                    title="Copy signed invitation link"
                                  >
                                    {copiedToken === inv.token ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleResendInvitation(inv.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
                                  title="Resend invitation"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                  title="Revoke invitation"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
