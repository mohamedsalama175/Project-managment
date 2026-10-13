import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Mail,
  Lock,
  Copy,
  Check,
  LogOut,
  LogIn,
  X,
  User,
  CheckCircle2,
  AlertOctagon,
  Sparkles,
  Building,
  RefreshCw,
  QrCode,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  ExternalLink,
  Laptop,
  HelpCircle,
  FileText,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { apiClient, ApiOrganizationMember } from '../../api/client';
import { ClayButton } from '../common/ClayButton';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { SessionManager } from './SessionManager';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    isAuthenticated,
    currentOrganization,
    organizations,
    login,
    challengeMfa,
    cancelMfa,
    signup,
    logout,
    logoutAll,
    switchOrganization,
    refreshUser,
    isMfaRequired,
    isLoading,
    error,
    errorCode,
    clearError,
  } = useAuthStore();

  // Mode for guest users: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email' | 'invite'
  const [authMode, setAuthMode] = useState<
    'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email' | 'invite'
  >('login');

  // Tab for authenticated users: 'profile' | 'organizations' | 'security' | 'sessions'
  const [activeTab, setActiveTab] = useState<'profile' | 'organizations' | 'security' | 'sessions'>('profile');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // MFA Challenge state
  const [mfaCode, setMfaCode] = useState('');
  const [isUsingBackupCode, setIsUsingBackupCode] = useState(false);

  // Signup form state
  const [regCompany, setRegCompany] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regIndustry, setRegIndustry] = useState('Technology & Engineering');
  const [regRegion, setRegRegion] = useState('MENA');
  const [regPassword, setRegPassword] = useState('');
  const [regPasswordConfirm, setRegPasswordConfirm] = useState('');
  const [regTermsAccepted, setRegTermsAccepted] = useState(false);

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Email verification resend state
  const [resendEmail, setResendEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Invite acceptance state
  const [inviteToken, setInviteToken] = useState('');

  // MFA Management in Security Tab
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qrCodeUri: string } | null>(null);
  const [confirmMfaCode, setConfirmMfaCode] = useState('');
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);
  const [recoveryCodesStatus, setRecoveryCodesStatus] = useState<{ count: number; max: number } | null>(null);
  const [disableMfaPassword, setDisableMfaPassword] = useState('');
  const [isSettingUpMfa, setIsSettingUpMfa] = useState(false);
  const [isDisablingMfa, setIsDisablingMfa] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Change Password state in Security Tab
  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Organization Management state
  const [newOrgName, setNewOrgName] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);
  const [orgMembers, setOrgMembers] = useState<ApiOrganizationMember[]>([]);
  const [selectedNewOwnerId, setSelectedNewOwnerId] = useState('');
  const [isTransferringOwnership, setIsTransferringOwnership] = useState(false);

  // SSO Toast notice
  const [ssoNotice, setSsoNotice] = useState<string | null>(null);

  // Check URL query parameters on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const resetParam = params.get('reset');
      const verifyParam = params.get('verify');
      const emailParam = params.get('email');

      if (token) {
        setInviteToken(token);
        setAuthMode('invite');
      } else if (resetParam || window.location.pathname === '/reset-password') {
        if (token) setResetToken(token);
        if (emailParam) setResetEmail(emailParam);
        setAuthMode('reset-password');
      } else if (verifyParam || window.location.pathname === '/verify-email') {
        setAuthMode('verify-email');
      }
    }
  }, []);

  // Cooldown timer for resend verification
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Fetch security info & members when relevant tabs open
  useEffect(() => {
    if (isAuthenticated && activeTab === 'security') {
      apiClient
        .getMfaRecoveryCodesStatus()
        .then((res) => setRecoveryCodesStatus({ count: res.count, max: res.max }))
        .catch(() => {});
    }

    if (isAuthenticated && activeTab === 'organizations') {
      apiClient
        .getMembers()
        .then((res) => setOrgMembers(res.members))
        .catch(() => {});
    }
  }, [isAuthenticated, activeTab]);

  if (!isOpen) return null;

  // --- Handlers ---

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await login(email, password, remember);
    if (res.success) {
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  const handleMfaChallengeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await challengeMfa(mfaCode);
    if (res.success) {
      setMfaCode('');
      onClose();
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (regPassword !== regPasswordConfirm) {
      useAuthStore.setState({ error: 'Passwords do not match.' });
      return;
    }

    if (!regTermsAccepted) {
      useAuthStore.setState({ error: 'You must accept the terms of service to create an account.' });
      return;
    }

    const res = await signup({
      name: regName,
      email: regEmail,
      company_name: regCompany,
      industry: regIndustry,
      region: regRegion,
      password: regPassword,
      password_confirmation: regPasswordConfirm,
      terms_accepted: true,
    });

    if (res.success) {
      onClose();
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await apiClient.forgotPassword(forgotEmail);
      setForgotSuccess(true);
    } catch {
      // Always treat as success to avoid user enumeration
      setForgotSuccess(true);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (resetPassword !== resetPasswordConfirm) {
      useAuthStore.setState({ error: 'Passwords do not match.' });
      return;
    }

    try {
      await apiClient.resetPassword({
        token: resetToken,
        email: resetEmail,
        password: resetPassword,
        password_confirmation: resetPasswordConfirm,
      });
      setResetSuccess(true);
      setTimeout(() => {
        setAuthMode('login');
        setResetSuccess(false);
      }, 2500);
    } catch (err: any) {
      useAuthStore.setState({ error: err.message || 'Failed to reset password.' });
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiClient.resendVerification(resendEmail || email || undefined);
      setResendSuccess(true);
      setResendCooldown(60);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      useAuthStore.setState({ error: err.message || 'Failed to resend verification link.' });
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      const res = await apiClient.acceptInvitation(inviteToken);
      await refreshUser();
      setSecuritySuccess(res.message);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      useAuthStore.setState({ error: err.message || 'Failed to accept invitation.' });
    }
  };

  const handleStartMfaSetup = async () => {
    setSecurityError(null);
    setSecuritySuccess(null);
    try {
      const data = await apiClient.setupMfa();
      setMfaSetupData(data);
      setIsSettingUpMfa(true);
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to initialize MFA setup.');
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    try {
      const res = await apiClient.confirmMfa(confirmMfaCode);
      setNewRecoveryCodes(res.recoveryCodes);
      setIsSettingUpMfa(false);
      setConfirmMfaCode('');
      await refreshUser();
      setSecuritySuccess('Two-factor authentication enabled successfully! Store your 10 backup codes.');
    } catch (err: any) {
      setSecurityError(err.message || 'Invalid 6-digit confirmation code.');
    }
  };

  const handleDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    try {
      await apiClient.disableMfa(disableMfaPassword);
      setIsDisablingMfa(false);
      setDisableMfaPassword('');
      await refreshUser();
      setSecuritySuccess('Two-factor authentication has been disabled.');
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to disable MFA. Password incorrect.');
    }
  };

  const handleRegenerateRecoveryCodes = async () => {
    const pwd = prompt('Enter your current account password to regenerate backup codes:');
    if (!pwd) return;
    setSecurityError(null);
    try {
      const res = await apiClient.regenerateMfaRecoveryCodes(pwd);
      setNewRecoveryCodes(res.recoveryCodes);
      setSecuritySuccess('Backup codes regenerated successfully! Store these 10 new codes safely.');
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to regenerate backup codes. Password may be incorrect.');
    }
  };

  const handleDownloadBackupCodes = () => {
    if (!newRecoveryCodes) return;
    const content = `DeliverOps Single-Use MFA Backup Codes\nGenerated: ${new Date().toISOString()}\nAccount: ${user?.email}\n\n` +
      newRecoveryCodes.map((c, idx) => `${idx + 1}. ${c}`).join('\n') +
      `\n\nKeep these codes safe. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deliverops-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyBackupCodes = () => {
    if (!newRecoveryCodes) return;
    navigator.clipboard.writeText(newRecoveryCodes.join('\n'));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setSecurityError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.changePassword({
        current_password: currPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirm,
      });
      setCurrPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setSecuritySuccess('Password updated successfully. Other active sessions revoked.');
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    try {
      const res = await apiClient.createOrganization({ name: newOrgName });
      await refreshUser();
      setNewOrgName('');
      setIsCreatingOrg(false);
      setSecuritySuccess(`Organization "${res.organization.name}" created and activated!`);
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to create organization.');
    }
  };

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNewOwnerId) return;
    if (!window.confirm('Transferring primary ownership is irreversible. Do you wish to proceed?')) {
      return;
    }

    setIsTransferringOwnership(true);
    setSecurityError(null);
    try {
      const res = await apiClient.transferOwnership(selectedNewOwnerId);
      await refreshUser();
      setSelectedNewOwnerId('');
      setSecuritySuccess(res.message);
    } catch (err: any) {
      setSecurityError(err.message || 'Failed to transfer ownership.');
    } finally {
      setIsTransferringOwnership(false);
    }
  };

  const handleTriggerSSO = (provider: string) => {
    setSsoNotice(`Enterprise ${provider} Single Sign-On (SAML 2.0 / OIDC) is scheduled for Phase 9 activation.`);
    setTimeout(() => setSsoNotice(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Header Bar */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
                {isAuthenticated
                  ? 'Account & Workspace Governance'
                  : isMfaRequired
                  ? 'Two-Factor Authentication'
                  : authMode === 'signup'
                  ? 'Create DeliverOps Workspace'
                  : authMode === 'forgot-password'
                  ? 'Password Recovery'
                  : authMode === 'reset-password'
                  ? 'Set New Password'
                  : authMode === 'verify-email'
                  ? 'Verify Your Email'
                  : authMode === 'invite'
                  ? 'Accept Workspace Invitation'
                  : 'DeliverOps Authentication'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAuthenticated
                  ? `Authenticated as ${user?.email}`
                  : isMfaRequired
                  ? 'Verification code required to access workspace'
                  : 'Enterprise delivery governance & scheduling platform'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              clearError();
              cancelMfa();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block">Security Notice</span>
              {error}
              {errorCode === 'AUTH_EMAIL_UNVERIFIED' && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('verify-email');
                      clearError();
                    }}
                    className="font-bold underline text-rose-800 dark:text-rose-200 hover:opacity-80"
                  >
                    Click here to resend verification link
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SSO Notice Toast */}
        {ssoNotice && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />
            <span>{ssoNotice}</span>
          </div>
        )}

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isAuthenticated ? (
            /* ================= GUEST VIEWS ================= */
            isMfaRequired ? (
              /* --- MFA CHALLENGE MODAL --- */
              <form onSubmit={handleMfaChallengeSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Two-Factor Authentication Active
                  </span>
                  <p>
                    {isUsingBackupCode
                      ? 'Enter one of your 10 single-use backup recovery codes.'
                      : 'Open your Authenticator app (Google Authenticator, 1Password, Authy) and enter the current 6-digit code.'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    {isUsingBackupCode ? 'Backup Recovery Code (e.g. XXXXX-XXXXX)' : '6-Digit TOTP Code'}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={isUsingBackupCode ? 15 : 6}
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.trim())}
                      placeholder={isUsingBackupCode ? 'ABCDE-FGHIJ' : '123456'}
                      className="w-full pl-9 pr-4 py-2.5 font-mono text-center tracking-widest text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUsingBackupCode(!isUsingBackupCode);
                      setMfaCode('');
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    {isUsingBackupCode ? 'Use 6-digit authenticator code instead' : 'Use backup recovery code instead'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelMfa}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Cancel
                  </button>
                </div>

                <ClayButton
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-full"
                  disabled={isLoading || !mfaCode}
                >
                  {isLoading ? 'Verifying Code...' : 'Authenticate & Enter Workspace'}
                </ClayButton>
              </form>
            ) : (
              /* --- STANDARD GUEST AUTH FLOWS --- */
              <div className="space-y-4">
                {/* Navigation Pill Switcher */}
                <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); clearError(); }}
                    className={`flex-1 py-1.5 rounded-xl transition-all ${
                      authMode === 'login'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); clearError(); }}
                    className={`flex-1 py-1.5 rounded-xl transition-all ${
                      authMode === 'signup'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    New Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('invite'); clearError(); }}
                    className={`flex-1 py-1.5 rounded-xl transition-all ${
                      authMode === 'invite'
                        ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Accept Invite
                  </button>
                </div>

                {/* 1. SIGN IN FORM */}
                {authMode === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Work Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Account Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotEmail(email);
                            setAuthMode('forgot-password');
                            clearError();
                          }}
                          className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>Remember this device (30 days)</span>
                      </label>
                    </div>

                    <ClayButton
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Authenticating...' : 'Sign In to Workspace'}
                    </ClayButton>

                    {/* SSO Placeholders (Phase 9) */}
                    <div className="pt-2">
                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                          Enterprise SSO
                        </span>
                        <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => handleTriggerSSO('Google Workspace')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1 transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Google</span>
                          <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-500">
                            Phase 9
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerSSO('Microsoft Entra ID')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1 transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Microsoft</span>
                          <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-500">
                            Phase 9
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTriggerSSO('Okta SAML')}
                          className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex flex-col items-center gap-1 transition-all group"
                        >
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Okta</span>
                          <span className="text-[9px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-emerald-500">
                            Phase 9
                          </span>
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* 2. SIGNUP FORM */}
                {authMode === 'signup' && (
                  <form onSubmit={handleSignupSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Company / Workspace Name
                        </label>
                        <div className="relative">
                          <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={regCompany}
                            onChange={(e) => setRegCompany(e.target.value)}
                            placeholder="Acme Aerospace"
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Administrator Full Name
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                          <input
                            type="text"
                            required
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            placeholder="Sara Al-Otaibi"
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Industry Sector
                        </label>
                        <select
                          value={regIndustry}
                          onChange={(e) => setRegIndustry(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="Technology & Engineering">Technology & Engineering</option>
                          <option value="Construction & Infrastructure">Construction & Infrastructure</option>
                          <option value="Defense & Aerospace">Defense & Aerospace</option>
                          <option value="Energy & Utilities">Energy & Utilities</option>
                          <option value="Consulting & Delivery">Consulting & Delivery</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                          Operating Region
                        </label>
                        <select
                          value={regRegion}
                          onChange={(e) => setRegRegion(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="MENA">MENA (Saudi Arabia / UAE / Regional)</option>
                          <option value="Europe">Europe (GDPR Compliant)</option>
                          <option value="North America">North America (US / Canada)</option>
                          <option value="Global">Global / Distributed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Corporate Work Email
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="sara@acme.com"
                          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Master Password (min 12 chars)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      {/* Password Strength Meter */}
                      <PasswordStrengthMeter password={regPassword} />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Confirm Master Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          type="password"
                          required
                          value={regPasswordConfirm}
                          onChange={(e) => setRegPasswordConfirm(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-start gap-2 pt-1 text-xs">
                      <input
                        type="checkbox"
                        id="terms"
                        required
                        checked={regTermsAccepted}
                        onChange={(e) => setRegTermsAccepted(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor="terms" className="text-slate-600 dark:text-slate-400 leading-tight">
                        I agree to the DeliverOps Master Services Agreement, Data Privacy Policy, and Acceptable Use Policy.
                      </label>
                    </div>

                    <ClayButton
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full mt-2"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating Tenant...' : 'Initialize Workspace & Account'}
                    </ClayButton>
                  </form>
                )}

                {/* 3. FORGOT PASSWORD */}
                {authMode === 'forgot-password' && (
                  <div className="space-y-4">
                    {forgotSuccess ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-2">
                        <div className="font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Recovery Instructions Sent
                        </div>
                        <p>
                          If an account is associated with <span className="font-mono font-bold">{forgotEmail}</span>, a secure password reset link has been dispatched with a 60-minute TTL.
                        </p>
                        <ClayButton
                          variant="default"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => setAuthMode('login')}
                        >
                          Return to Sign In
                        </ClayButton>
                      </div>
                    ) : (
                      <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Reset Account Password
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Enter your registered email address. We will send a secure single-use token to reset your password.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Registered Email Address
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                            <input
                              type="email"
                              required
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              placeholder="name@company.com"
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setAuthMode('login')}
                            className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            Back to Sign In
                          </button>
                          <ClayButton
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={isLoading || !forgotEmail}
                          >
                            {isLoading ? 'Dispatching...' : 'Send Reset Link'}
                          </ClayButton>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* 4. RESET PASSWORD */}
                {authMode === 'reset-password' && (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                    {resetSuccess ? (
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                        <span className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          Password Updated Successfully
                        </span>
                        <p>All active sessions have been invalidated. Redirecting to sign in...</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            Configure New Password
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Updating your password will revoke all existing sessions across all devices for your security.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Reset Token
                          </label>
                          <input
                            type="text"
                            required
                            value={resetToken}
                            onChange={(e) => setResetToken(e.target.value)}
                            placeholder="Paste 64-char reset token"
                            className="w-full font-mono text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Account Email
                          </label>
                          <input
                            type="email"
                            required
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                          <PasswordStrengthMeter password={resetPassword} />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                            Confirm New Password
                          </label>
                          <input
                            type="password"
                            required
                            value={resetPasswordConfirm}
                            onChange={(e) => setResetPasswordConfirm(e.target.value)}
                            placeholder="••••••••••••"
                            className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <ClayButton
                          type="submit"
                          variant="primary"
                          size="md"
                          className="w-full"
                          disabled={isLoading}
                        >
                          {isLoading ? 'Updating Password...' : 'Save New Password'}
                        </ClayButton>
                      </>
                    )}
                  </form>
                )}

                {/* 5. VERIFY EMAIL VIEW */}
                {authMode === 'verify-email' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-2">
                      <div className="font-bold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-amber-500" />
                        Verification Required
                      </div>
                      <p>
                        Your account requires email verification within the 3-day grace period. Please check your inbox for the signed verification link.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Account Email Address
                      </label>
                      <input
                        type="email"
                        value={resendEmail || email}
                        onChange={(e) => setResendEmail(e.target.value)}
                        placeholder="name@company.com"
                        className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    {resendSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs">
                        Fresh verification link dispatched! Please check your spam folder if not received.
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={() => setAuthMode('login')}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        Back to Sign In
                      </button>
                      <ClayButton
                        type="button"
                        variant="primary"
                        size="md"
                        onClick={handleResendVerification}
                        disabled={resendCooldown > 0}
                      >
                        {resendCooldown > 0
                          ? `Resend in ${resendCooldown}s`
                          : 'Resend Verification Email'}
                      </ClayButton>
                    </div>
                  </div>
                )}

                {/* 6. INVITE ACCEPTANCE FORM */}
                {authMode === 'invite' && (
                  <form onSubmit={handleAcceptInvite} className="space-y-4">
                    <div className="text-center space-y-1">
                      <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Join an Existing Workspace
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Enter the invitation token sent to your email by your workspace administrator.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                        Invitation Token
                      </label>
                      <input
                        type="text"
                        required
                        value={inviteToken}
                        onChange={(e) => setInviteToken(e.target.value)}
                        placeholder="Paste invitation token here..."
                        className="w-full font-mono px-3 py-2.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <ClayButton
                      type="submit"
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Verifying...' : 'Accept Invitation & Enter'}
                    </ClayButton>
                  </form>
                )}
              </div>
            )
          ) : (
            /* ================= AUTHENTICATED USER VIEWS ================= */
            <div className="space-y-5">
              {/* Profile Card Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white font-extrabold flex items-center justify-center text-base shadow-md shadow-emerald-500/20">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      {user?.name}
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {user?.primaryRole || 'Member'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">{user?.email}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Tenant
                  </span>
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
                    {currentOrganization?.name || 'Default Workspace'}
                  </span>
                </div>
              </div>

              {/* Navigation Sub-Tabs */}
              <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-900 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setActiveTab('profile'); setSecuritySuccess(null); setSecurityError(null); }}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${
                    activeTab === 'profile'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('sessions'); setSecuritySuccess(null); setSecurityError(null); }}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${
                    activeTab === 'sessions'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Sessions
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('security'); setSecuritySuccess(null); setSecurityError(null); }}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${
                    activeTab === 'security'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Security & MFA
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab('organizations'); setSecuritySuccess(null); setSecurityError(null); }}
                  className={`flex-1 py-1.5 rounded-xl transition-all ${
                    activeTab === 'organizations'
                      ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Workspaces
                </button>
              </div>

              {/* Status / Success Messages */}
              {securitySuccess && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{securitySuccess}</span>
                </div>
              )}
              {securityError && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{securityError}</span>
                </div>
              )}

              {/* Tab 1: Account Profile */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Job Title</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {user?.jobTitle || 'Team Member'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {user?.department || 'Operations'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Capacity</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {user?.weeklyCapacityHours || 40} hrs / week
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">
                        {user?.status || 'Active'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <ClayButton
                      variant="danger"
                      size="sm"
                      onClick={async () => {
                        await logout();
                        onClose();
                      }}
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1.5" />
                      Sign Out
                    </ClayButton>
                    <ClayButton
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        await logoutAll();
                        onClose();
                      }}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                      Sign Out Everywhere
                    </ClayButton>
                  </div>
                </div>
              )}

              {/* Tab 2: Active Device Sessions */}
              {activeTab === 'sessions' && (
                <SessionManager />
              )}

              {/* Tab 3: Security & MFA */}
              {activeTab === 'security' && (
                <div className="space-y-5">
                  {/* Password Change Sub-section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-500" />
                      Update Password
                    </h4>
                    <form onSubmit={handleChangePasswordSubmit} className="space-y-2.5">
                      <div>
                        <input
                          type="password"
                          required
                          value={currPassword}
                          onChange={(e) => setCurrPassword(e.target.value)}
                          placeholder="Current password"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password (min 12 chars)"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <PasswordStrengthMeter password={newPassword} />
                      </div>
                      <div>
                        <input
                          type="password"
                          required
                          value={newPasswordConfirm}
                          onChange={(e) => setNewPasswordConfirm(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <ClayButton
                        type="submit"
                        variant="default"
                        size="sm"
                        className="w-full"
                        disabled={isChangingPassword || !currPassword || !newPassword}
                      >
                        {isChangingPassword ? 'Saving...' : 'Change Password'}
                      </ClayButton>
                    </form>
                  </div>

                  {/* 2FA Section */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-500" />
                          Two-Factor Authentication (TOTP)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          RFC 6238 time-based authenticator codes (Google Authenticator, Authy, 1Password).
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          user?.mfaEnabled
                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>

                    {!user?.mfaEnabled ? (
                      isSettingUpMfa && mfaSetupData ? (
                        <form onSubmit={handleConfirmMfa} className="space-y-3 pt-2">
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center space-y-2">
                            <span className="text-[11px] font-bold text-slate-500">Scan QR in Authenticator App:</span>
                            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(mfaSetupData.qrCodeUri)}`}
                                alt="MFA QR Code"
                                className="w-32 h-32"
                              />
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded select-all">
                              Manual Secret: {mfaSetupData.secret}
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                              Enter 6-Digit Code from App to Confirm
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={6}
                              value={confirmMfaCode}
                              onChange={(e) => setConfirmMfaCode(e.target.value.trim())}
                              placeholder="123456"
                              className="w-full font-mono text-center tracking-widest text-sm py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="flex gap-2">
                            <ClayButton
                              type="button"
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => setIsSettingUpMfa(false)}
                            >
                              Cancel
                            </ClayButton>
                            <ClayButton
                              type="submit"
                              variant="primary"
                              size="sm"
                              className="flex-1"
                              disabled={confirmMfaCode.length !== 6}
                            >
                              Confirm & Enable
                            </ClayButton>
                          </div>
                        </form>
                      ) : (
                        <ClayButton
                          variant="primary"
                          size="sm"
                          onClick={handleStartMfaSetup}
                          className="w-full mt-2"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1.5" />
                          Set Up Two-Factor Authentication
                        </ClayButton>
                      )
                    ) : (
                      <div className="space-y-3 pt-2">
                        {isDisablingMfa ? (
                          <form onSubmit={handleDisableMfa} className="space-y-2">
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                              Confirm Password to Disable MFA
                            </label>
                            <input
                              type="password"
                              required
                              value={disableMfaPassword}
                              onChange={(e) => setDisableMfaPassword(e.target.value)}
                              placeholder="Your password"
                              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                            />
                            <div className="flex gap-2 pt-1">
                              <ClayButton
                                type="button"
                                variant="default"
                                size="sm"
                                className="flex-1"
                                onClick={() => setIsDisablingMfa(false)}
                              >
                                Cancel
                              </ClayButton>
                              <ClayButton
                                type="submit"
                                variant="danger"
                                size="sm"
                                className="flex-1"
                              >
                                Confirm Disable
                              </ClayButton>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-slate-500">
                              Remaining Backup Codes:{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {recoveryCodesStatus?.count ?? 10} / {recoveryCodesStatus?.max ?? 10}
                              </strong>
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleRegenerateRecoveryCodes}
                                className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                              >
                                Regenerate Codes
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsDisablingMfa(true)}
                                className="text-rose-600 dark:text-rose-400 hover:underline font-semibold"
                              >
                                Disable 2FA
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Display Newly Issued 10 Backup Codes */}
                    {newRecoveryCodes && (
                      <div className="mt-3 p-4 rounded-xl bg-slate-900 text-slate-100 space-y-3 text-xs border border-slate-800">
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                            <ShieldCheck className="w-4 h-4" />
                            10 Single-Use Backup Recovery Codes
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          Save these backup codes securely. If you lose access to your authenticator device, each code can be used exactly once to log in.
                        </p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-center text-xs bg-slate-950 p-3 rounded-lg border border-slate-800 select-all">
                          {newRecoveryCodes.map((code, idx) => (
                            <div key={idx} className="p-1 rounded bg-slate-900 text-slate-200">
                              {code}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleCopyBackupCodes}
                            className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedCodes ? 'Copied to Clipboard' : 'Copy All Codes'}
                          </button>
                          <button
                            type="button"
                            onClick={handleDownloadBackupCodes}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors text-white"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download (.txt)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Workspaces & Governance */}
              {activeTab === 'organizations' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                      Switch Active Organization Workspace
                    </label>
                    <select
                      value={currentOrganization?.id || ''}
                      onChange={(e) => switchOrganization(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                    >
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name} ({org.plan.toUpperCase()} • {org.region})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Create New Org Dialog */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isCreatingOrg ? (
                      <ClayButton
                        variant="default"
                        size="sm"
                        onClick={() => setIsCreatingOrg(true)}
                        className="w-full"
                      >
                        <Building className="w-3.5 h-3.5 mr-1" />
                        Create New Organization Workspace
                      </ClayButton>
                    ) : (
                      <form onSubmit={handleCreateOrganization} className="space-y-2">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                          Workspace Name
                        </label>
                        <input
                          type="text"
                          required
                          value={newOrgName}
                          onChange={(e) => setNewOrgName(e.target.value)}
                          placeholder="e.g. Orion Defense Systems"
                          className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex gap-2">
                          <ClayButton
                            type="button"
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => setIsCreatingOrg(false)}
                          >
                            Cancel
                          </ClayButton>
                          <ClayButton
                            type="submit"
                            variant="primary"
                            size="sm"
                            className="flex-1"
                          >
                            Create & Switch
                          </ClayButton>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* Transfer Ownership Section */}
                  {currentOrganization?.isOwner && orgMembers.length > 1 && (
                    <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 space-y-2 text-xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                        Transfer Workspace Ownership
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pessimistic atomic ownership transfer. Exactly one active member can hold primary ownership.
                      </p>
                      <form onSubmit={handleTransferOwnership} className="flex gap-2 items-center">
                        <select
                          value={selectedNewOwnerId}
                          onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none"
                        >
                          <option value="">Select candidate member...</option>
                          {orgMembers
                            .filter((m) => m.id !== user?.id)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name} ({m.email})
                              </option>
                            ))}
                        </select>
                        <ClayButton
                          type="submit"
                          variant="danger"
                          size="sm"
                          disabled={!selectedNewOwnerId || isTransferringOwnership}
                        >
                          {isTransferringOwnership ? 'Transferring...' : 'Transfer'}
                        </ClayButton>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
