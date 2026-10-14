import React, { useState, useEffect } from 'react';
import {
  X,
  Award,
  Star,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Sparkles,
  Check,
} from 'lucide-react';
import { ClayButton } from '../common/ClayButton';
import { resourcesApi, Skill, UserSkillItem } from '../../api/resources';

interface UserSkillProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  availableSkills: Skill[];
  initialSkills?: UserSkillItem[];
  onSuccess: () => void;
}

export const UserSkillProfileModal: React.FC<UserSkillProfileModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  availableSkills,
  initialSkills = [],
  onSuccess,
}) => {
  const [skillsList, setSkillsList] = useState<UserSkillItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [newProficiency, setNewProficiency] = useState<number>(3);
  const [newExp, setNewExp] = useState<number>(2.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSkillsList([...initialSkills]);
      setError(null);
      if (availableSkills.length > 0) {
        setSelectedSkillId(availableSkills[0].id);
      }
    }
  }, [isOpen, initialSkills, availableSkills]);

  if (!isOpen) return null;

  const handleAddSkill = () => {
    if (!selectedSkillId) return;

    if (skillsList.some((s) => s.skill_id === selectedSkillId)) {
      setError('Skill is already assigned. You can adjust its proficiency level directly below.');
      return;
    }

    const skillObj = availableSkills.find((s) => s.id === selectedSkillId);
    if (!skillObj) return;

    setSkillsList([
      ...skillsList,
      {
        skill_id: selectedSkillId,
        skill_name: skillObj.name,
        category: skillObj.category,
        proficiency: newProficiency,
        years_experience: newExp,
      },
    ]);
    setError(null);
  };

  const handleRemoveSkill = (skillId: string) => {
    setSkillsList(skillsList.filter((s) => s.skill_id !== skillId));
  };

  const handleUpdateProficiency = (skillId: string, level: number) => {
    setSkillsList(
      skillsList.map((s) => (s.skill_id === skillId ? { ...s, proficiency: level } : s))
    );
  };

  const handleUpdateExperience = (skillId: string, exp: number) => {
    setSkillsList(
      skillsList.map((s) => (s.skill_id === skillId ? { ...s, years_experience: exp } : s))
    );
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await resourcesApi.bulkAssignSkills(
        userId,
        skillsList.map((s) => ({
          skill_id: s.skill_id,
          proficiency: s.proficiency,
          years_experience: s.years_experience,
        }))
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save skills profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-6 sm:p-7 overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Skills Profile: {userName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage certified proficiencies and years of domain expertise
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Add Skill Bar */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Add Verified Competency
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              disabled={availableSkills.length === 0}
              className="col-span-1 sm:col-span-3 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white font-medium min-h-[42px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {availableSkills.length === 0 ? (
                <option value="">No competencies available in catalog</option>
              ) : (
                <>
                  <option value="">Select a competency to verify...</option>
                  {availableSkills.map((sk) => (
                    <option key={sk.id} value={sk.id} disabled={!sk.is_active}>
                      {sk.name} ({sk.category}) {!sk.is_active ? '— [Retired]' : ''}
                    </option>
                  ))}
                </>
              )}
            </select>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Proficiency (1-5)</label>
              <select
                value={newProficiency}
                onChange={(e) => setNewProficiency(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white font-medium"
              >
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    Level {lvl} ({lvl === 1 ? 'Novice' : lvl === 3 ? 'Proficient' : lvl === 5 ? 'Master' : 'Competent'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-1">Years Exp</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={newExp}
                onChange={(e) => setNewExp(parseFloat(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white font-medium"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!selectedSkillId || availableSkills.length === 0}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Skill
              </button>
            </div>
          </div>
        </div>

        {/* Assigned Skills List */}
        <div className="mt-4 max-h-60 overflow-y-auto space-y-2 pr-1">
          {skillsList.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 italic">
              No skills logged for this team member yet.
            </p>
          ) : (
            skillsList.map((item) => (
              <div
                key={item.skill_id}
                className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-bold text-slate-800 dark:text-white truncate">
                    {item.skill_name || 'Skill'}
                  </div>
                  <div className="text-[11px] text-slate-400 capitalize">
                    {item.category || 'General'} · {item.years_experience} yrs experience
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Star Rating Buttons */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleUpdateProficiency(item.skill_id, star)}
                        className="p-0.5"
                      >
                        <Star
                          className={`w-3.5 h-3.5 transition-colors ${
                            star <= item.proficiency
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(item.skill_id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <ClayButton
            variant="primary"
            disabled={isSubmitting}
            onClick={handleSave}
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          >
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </ClayButton>
        </div>
      </div>
    </div>
  );
};
