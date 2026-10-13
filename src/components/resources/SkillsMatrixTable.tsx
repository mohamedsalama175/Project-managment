import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  Plus,
  Filter,
  Star,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit2,
  Sparkles,
  User,
  Power,
  X,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { UserSkillProfileModal } from './UserSkillProfileModal';
import { resourcesApi, Skill, UserSkillItem } from '../../api/resources';
import { useProjectStore } from '../../stores/useProjectStore';

export const SkillsMatrixTable: React.FC = () => {
  const { teamMembers } = useProjectStore();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Match Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [minProficiency, setMinProficiency] = useState<number>(1);
  const [matchMode, setMatchMode] = useState<'all' | 'any'>('any');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Modals state
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Engineering');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  // Edit user profile modal state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserName, setEditingUserName] = useState<string>('');

  const fetchSkills = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await resourcesApi.getSkills();
      setSkills(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load skills catalog.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setIsSearching(true);
    setError(null);
    try {
      const terms = searchQuery.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await resourcesApi.searchSkills(terms, minProficiency, matchMode);
      setSearchResults(res.data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to search skills.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setIsCreatingSkill(true);
    setError(null);
    try {
      await resourcesApi.createSkill({
        name: newSkillName.trim(),
        category: newSkillCategory.trim(),
      });
      setSuccess(`Skill "${newSkillName}" created.`);
      setNewSkillName('');
      setIsAddSkillOpen(false);
      fetchSkills();
    } catch (err: any) {
      setError(err?.message || 'Failed to create skill.');
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const handleToggleSkillActive = async (skill: Skill) => {
    try {
      if (skill.is_active) {
        // Soft-disable
        await resourcesApi.deleteSkill(skill.id);
        setSuccess(`Skill "${skill.name}" retired/disabled.`);
      } else {
        await resourcesApi.updateSkill(skill.id, { is_active: true });
        setSuccess(`Skill "${skill.name}" reactivated.`);
      }
      fetchSkills();
    } catch (err: any) {
      setError(err?.message || 'Failed to update skill status.');
    }
  };

  const openUserSkillModal = (userId: string, name: string) => {
    setEditingUserId(userId);
    setEditingUserName(name);
  };

  return (
    <div className="space-y-5">
      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Query Form */}
          <form onSubmit={handleSearch} className="flex-1 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search skills (e.g. PLC, SCADA, Python)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="px-2 text-[11px] text-slate-400">Match:</span>
              <button
                type="button"
                onClick={() => setMatchMode('any')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  matchMode === 'any'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ANY
              </button>
              <button
                type="button"
                onClick={() => setMatchMode('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  matchMode === 'all'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                ALL
              </button>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300">
              <Star className="w-3.5 h-3.5 text-amber-500" />
              <span>Min Lvl:</span>
              <select
                value={minProficiency}
                onChange={(e) => setMinProficiency(Number(e.target.value))}
                className="bg-transparent font-bold text-emerald-600 dark:text-emerald-400 outline-none"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}+
                  </option>
                ))}
              </select>
            </div>

            <ClayButton
              type="submit"
              size="sm"
              variant="default"
              disabled={isSearching}
              icon={isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            >
              Filter
            </ClayButton>
          </form>

          {/* Add Skill Button */}
          <ClayButton
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddSkillOpen(true)}
          >
            New Skill
          </ClayButton>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filtered Match Results Banner */}
      {searchResults !== null && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span>
              Search matched {searchResults.length} team member(s) meeting criteria ({matchMode.toUpperCase()} mode, Level {minProficiency}+).
            </span>
          </div>
          <button
            onClick={() => setSearchResults(null)}
            className="text-[11px] underline hover:text-emerald-800"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Skills Matrix Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <Loader2 className="w-7 h-7 text-emerald-500 animate-spin mb-2" />
          <p className="text-xs text-slate-500 font-medium">Loading organization skills catalog...</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                <th className="p-3.5 font-bold text-slate-700 dark:text-slate-200 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-800 z-10 shadow-xs">
                  Team Member
                </th>
                {skills.map((skill) => (
                  <th
                    key={skill.id}
                    className="p-3.5 font-bold text-slate-700 dark:text-slate-200 min-w-[140px] whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span>{skill.name}</span>
                          {!skill.is_active && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Retired
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-normal text-slate-400 capitalize">
                          {skill.category}
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleSkillActive(skill)}
                        title={skill.is_active ? 'Retire Skill' : 'Reactivate Skill'}
                        className={`p-1 rounded-md text-[10px] transition-colors ${
                          skill.is_active
                            ? 'text-slate-400 hover:text-amber-500'
                            : 'text-amber-500 hover:text-emerald-500'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(teamMembers || []).map((member) => {
                // If searchResults is active, check if user is matched
                const isMatched =
                  searchResults === null ||
                  searchResults.some((r) => r.user_id === member.id);

                if (searchResults !== null && !isMatched) return null;

                return (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* User Identity Column */}
                    <td className="p-3.5 sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800 shadow-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {member.jobTitle || member.department}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => openUserSkillModal(member.id, member.name)}
                          className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit user skills"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {/* Skill Cells */}
                    {skills.map((skill) => {
                      // Check matched skill or skill name in member.skills
                      const hasSkill = (member.skills || []).some(
                        (s) => s.toLowerCase() === skill.name.toLowerCase()
                      );

                      return (
                        <td
                          key={skill.id}
                          onClick={() => openUserSkillModal(member.id, member.name)}
                          className="p-3.5 text-center cursor-pointer hover:bg-emerald-500/5 transition-colors"
                        >
                          {hasSkill ? (
                            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                              <span>Verified</span>
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 font-mono text-xs">
                              —
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add New Skill Modal */}
      {isAddSkillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <Award className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Register New Skill
                </h3>
              </div>
              <button
                onClick={() => setIsAddSkillOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSkill} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Siemens S7 PLC, AWS DevOps, React"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Category
                </label>
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Automation">Automation & Robotics</option>
                  <option value="Product">Product & Design</option>
                  <option value="Quality">Quality & Inspection</option>
                  <option value="Management">Project & Operations</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddSkillOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800"
                >
                  Cancel
                </button>
                <ClayButton type="submit" variant="primary" disabled={isCreatingSkill}>
                  {isCreatingSkill ? 'Creating...' : 'Create Skill'}
                </ClayButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Skill Modal */}
      {editingUserId && (
        <UserSkillProfileModal
          isOpen={true}
          onClose={() => setEditingUserId(null)}
          userId={editingUserId}
          userName={editingUserName}
          availableSkills={skills}
          onSuccess={() => {
            setSuccess(`Updated skills profile for ${editingUserName}.`);
            fetchSkills();
          }}
        />
      )}
    </div>
  );
};
