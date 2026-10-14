import React, { useState, useEffect } from 'react';
import {
  User,
  Building,
  Users,
  Settings,
  Sparkles,
  Layers,
  ArrowRight,
  Check,
  CheckCircle2,
  Calendar,
  Compass,
  AlertTriangle,
  FolderKanban,
  FileSpreadsheet,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { ClayButton } from '../common/ClayButton';
import { ClayInput } from '../common/ClayInput';
import { apiClient, ApiOnboardingProgress } from '../../api/client';
import { useAuthStore } from '../../stores/useAuthStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { startInteractiveTour } from '../../utils/driverTour';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProgress?: ApiOnboardingProgress | null;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  initialProgress,
}) => {
  const { user, currentOrganization, refreshUser } = useAuthStore();
  const { theme, setTheme, createProject } = useProjectStore();

  const [progress, setProgress] = useState<ApiOnboardingProgress | null>(initialProgress || null);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Profile Form
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileJobTitle, setProfileJobTitle] = useState(user?.jobTitle || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');

  // Step 2: Workspace Setup
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>(theme || 'light');
  const [calendarPreset, setCalendarPreset] = useState<'mena' | 'western'>('mena');
  const [durationMode, setDurationMode] = useState<'working_days' | 'calendar_days'>('working_days');

  // Step 3: Team Invitations
  const [inviteEmails, setInviteEmails] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('contributor');

  // Step 4: Organization Details
  const [orgName, setOrgName] = useState(currentOrganization?.name || '');
  const [orgIndustry, setOrgIndustry] = useState(currentOrganization?.industry || 'Technology');
  const [orgRegion, setOrgRegion] = useState(currentOrganization?.region || 'MENA');

  // Step 5: First Project Setup
  const [projectName, setProjectName] = useState('Core Operational Launch');
  const [projectCode, setProjectCode] = useState('CORE');
  const [templateSelection, setTemplateSelection] = useState<string>('agile-software-development');

  // Step 6: Sample Data Opt-in
  const [sampleDataOptIn, setSampleDataOptIn] = useState<boolean>(true);

  // Sync state when opened
  useEffect(() => {
    if (isOpen) {
      loadProgress();
    }
  }, [isOpen]);

  const loadProgress = async () => {
    try {
      const res = await apiClient.getOnboardingProgress();
      if (res.data) {
        setProgress(res.data);
        setCurrentStep(res.data.current_step || 1);
      }
    } catch {
      // Fallback
      setCurrentStep(1);
    }
  };

  const isOwner = !progress || progress.flow_type === 'owner';
  const totalSteps = isOwner ? 7 : 3;

  const handleNextStep = async (skip = false) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let updatedProgress: ApiOnboardingProgress;

      if (skip) {
        const res = await apiClient.skipOnboardingStep(currentStep);
        updatedProgress = res.data;
      } else {
        // Collect payload based on current step
        let payload: any = {};

        if (isOwner) {
          switch (currentStep) {
            case 1:
              payload = {
                name: profileName.trim(),
                job_title: profileJobTitle.trim() || undefined,
                phone: profilePhone.trim() || undefined,
              };
              break;
            case 2:
              payload = {
                theme: selectedTheme,
                calendar_preset: calendarPreset,
                duration_mode: durationMode,
              };
              setTheme(selectedTheme);
              break;
            case 3:
              const emails = inviteEmails
                .split(',')
                .map((e) => e.trim())
                .filter(Boolean);
              payload = { emails, role: inviteRole };
              break;
            case 4:
              payload = {
                organization_name: orgName.trim(),
                industry: orgIndustry,
                region: orgRegion,
              };
              break;
            case 5:
              payload = {
                project_name: projectName.trim(),
                project_code: projectCode.trim().toUpperCase(),
                template_slug: templateSelection !== 'blank' ? templateSelection : undefined,
              };
              break;
            case 6:
              payload = {
                opt_in: sampleDataOptIn,
              };
              break;
            case 7:
              payload = {
                start_tour: true,
              };
              break;
          }
        } else {
          // Member flow
          switch (currentStep) {
            case 1:
              payload = {
                name: profileName.trim(),
                job_title: profileJobTitle.trim() || undefined,
                phone: profilePhone.trim() || undefined,
              };
              break;
            case 2:
              payload = {
                theme: selectedTheme,
              };
              setTheme(selectedTheme);
              break;
            case 3:
              payload = {
                ready: true,
              };
              break;
          }
        }

        const res = await apiClient.saveOnboardingStep(currentStep, payload);
        updatedProgress = res.data;
      }

      setProgress(updatedProgress);

      if (updatedProgress.is_completed) {
        await refreshUser();
        onClose();
        if (currentStep === totalSteps) {
          // Launch driver tour
          setTimeout(() => {
            startInteractiveTour();
          }, 300);
        }
      } else {
        setCurrentStep(updatedProgress.current_step);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save onboarding step');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCurrentStepSkippable = () => {
    if (isOwner) {
      // Step 1 and Step 4 are mandatory
      return currentStep !== 1 && currentStep !== 4 && currentStep !== 7;
    }
    return currentStep !== 1 && currentStep !== 3;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isOwner ? 'Workspace Setup & Onboarding' : 'Welcome to DeliverOps'}
      description={`Step ${currentStep} of ${totalSteps}: Follow the interactive setup to tailor your delivery platform.`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Step Progress Dots Bar */}
        <div className="flex items-center justify-between gap-1 px-1 select-none">
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep || (progress?.completed_steps || []).includes(stepNum);
            const isCurrent = stepNum === currentStep;

            return (
              <React.Fragment key={stepNum}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isCurrent
                        ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 ring-4 ring-emerald-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : stepNum}
                  </div>
                </div>
                {stepNum < totalSteps && (
                  <div
                    className={`flex-1 h-0.5 rounded-full transition-colors ${
                      stepNum < currentStep
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Dynamic Content */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 min-h-[260px] flex flex-col justify-center">
          {/* STEP 1: Profile (Mandatory) */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <User className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Complete Your Personal Profile</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your profile details identify you across work breakdown assignments, audit history, and risk registries.
              </p>

              <ClayInput
                label="Full Name *"
                placeholder="e.g. Alex Morgan"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
              />

              <ClayInput
                label="Job Title / Role"
                placeholder="e.g. Director of Engineering / Program Manager"
                value={profileJobTitle}
                onChange={(e) => setProfileJobTitle(e.target.value)}
              />

              <ClayInput
                label="Contact Phone"
                placeholder="e.g. +1 555-0199"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
              />
            </div>
          )}

          {/* STEP 2: Workspace Setup (Skippable) */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <Settings className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Workspace & Calendar Configuration</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure calendar working rules and your preferred appearance theme.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['light', 'dark', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTheme(t)}
                      className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                        selectedTheme === t
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {t} Mode
                    </button>
                  ))}
                </div>
              </div>

              {isOwner && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Working Calendar Standard
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCalendarPreset('mena')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        calendarPreset === 'mena'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div>MENA Region</div>
                      <div className="text-[10px] font-normal text-slate-400">Friday & Saturday Weekends</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCalendarPreset('western')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        calendarPreset === 'western'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div>Western / Global</div>
                      <div className="text-[10px] font-normal text-slate-400">Saturday & Sunday Weekends</div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3 (Owner): Team Invitations (Skippable) */}
          {isOwner && currentStep === 3 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <Users className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Invite Initial Teammates</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add team member emails (comma-separated). Invitations with secure tokens will be dispatched automatically.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Teammate Emails (comma separated)
                </label>
                <textarea
                  rows={2}
                  placeholder="engineer@company.com, designer@company.com, pm@company.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Default Role Assignment
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                >
                  <option value="contributor">Contributor (Task Updates & Logs)</option>
                  <option value="project_manager">Project Manager (Full Schedule Authority)</option>
                  <option value="admin">Administrator (Org & Member Management)</option>
                  <option value="viewer">Viewer (Read-Only Access)</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 4 (Owner): Organization Details (Mandatory) */}
          {isOwner && currentStep === 4 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <Building className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Confirm Organization Profile</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your organization defines the strictly isolated data tenancy container for all projects and resources.
              </p>

              <ClayInput
                label="Organization / Company Name *"
                placeholder="e.g. Acme Deliveries LLC"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Industry Sector
                  </label>
                  <select
                    value={orgIndustry}
                    onChange={(e) => setOrgIndustry(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="Technology">Technology & Software</option>
                    <option value="Healthcare">Healthcare & Bio</option>
                    <option value="Finance">Financial Services</option>
                    <option value="Construction">Construction & Engineering</option>
                    <option value="Retail">Retail & E-commerce</option>
                    <option value="Consulting">Professional Consulting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Operating Region
                  </label>
                  <select
                    value={orgRegion}
                    onChange={(e) => setOrgRegion(e.target.value)}
                    className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                  >
                    <option value="MENA">Middle East & North Africa (MENA)</option>
                    <option value="North America">North America (US / CA)</option>
                    <option value="Europe">Europe (EU / UK)</option>
                    <option value="APAC">Asia-Pacific (APAC)</option>
                    <option value="Global">Global Distributed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 (Owner): First Project Setup (Skippable) */}
          {isOwner && currentStep === 5 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <FolderKanban className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Set Up Your First Delivery Project</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Initialize with a turnkey system template or start with a custom project scope.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ClayInput
                  label="Project Title *"
                  placeholder="e.g., Enterprise Platform Migration"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <ClayInput
                  label="Project WBS Code"
                  placeholder="e.g., CORE"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                  Choose Starter Structure
                </label>
                <select
                  value={templateSelection}
                  onChange={(e) => setTemplateSelection(e.target.value)}
                  className="w-full text-xs font-semibold p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                >
                  <option value="agile-software-development">Template: Agile Software Development Sprint</option>
                  <option value="cloud-infrastructure-migration">Template: Cloud Infrastructure Migration</option>
                  <option value="digital-marketing-campaign">Template: Omnichannel Digital Marketing Campaign</option>
                  <option value="enterprise-client-onboarding">Template: Enterprise Client Onboarding</option>
                  <option value="product-go-to-market-launch">Template: Product Go-To-Market Launch</option>
                  <option value="corporate-facilities-fitout">Template: Corporate Facilities Fitout</option>
                  <option value="blank">Blank Project Scope</option>
                </select>
              </div>
            </div>
          )}

          {/* STEP 6 (Owner): Sample Data Opt-in (Skippable) */}
          {isOwner && currentStep === 6 && (
            <div className="space-y-3.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-extrabold">Evaluation Sample Data Opt-in</h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                To test realistic CPM timelines, resource workload matrices, and risk registers immediately, you can load our sample project.
              </p>

              <div
                onClick={() => setSampleDataOptIn(!sampleDataOptIn)}
                className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                  sampleDataOptIn
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 border ${
                    sampleDataOptIn
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {sampleDataOptIn && <Check className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100">
                    Include Sample Delivery Project (Recommended for Evaluation)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Loads 10 scheduled tasks, 2 active delivery risks, and dependency relationships. You can purge this at any time with a single click.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 7 (Owner) / STEP 3 (Member): Launch & Tour */}
          {((isOwner && currentStep === 7) || (!isOwner && currentStep === 3)) && (
            <div className="text-center py-4 space-y-3 animate-in fade-in duration-150">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <Compass className="w-6 h-6" />
              </div>
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                Workspace Initialized & Ready!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Your workspace is completely isolated, calibrated, and ready for high-fidelity project execution.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div>
            {isCurrentStepSkippable() && (
              <ClayButton
                size="sm"
                variant="default"
                onClick={() => handleNextStep(true)}
                disabled={isSubmitting}
              >
                Skip This Step
              </ClayButton>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ClayButton
              size="sm"
              variant="primary"
              onClick={() => handleNextStep(false)}
              disabled={isSubmitting}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              {isSubmitting
                ? 'Saving...'
                : currentStep === totalSteps
                ? 'Complete Setup & Launch Tour'
                : 'Save & Continue'}
            </ClayButton>
          </div>
        </div>
      </div>
    </Modal>
  );
};
