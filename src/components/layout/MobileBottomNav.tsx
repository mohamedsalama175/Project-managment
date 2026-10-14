import React from 'react';
import {
  FolderKanban,
  Settings,
  LayoutGrid,
  Users,
  DollarSign,
  ShieldAlert,
  FileText,
} from 'lucide-react';
import { useProjectStore } from '../../stores/useProjectStore';
import { ActiveView } from '../../types';

interface MobileBottomNavProps {
  onOpenRisks?: () => void;
  onOpenReport?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  onOpenRisks,
  onOpenReport,
}) => {
  const { activeView, setActiveView } = useProjectStore();

  const navItems: { view: ActiveView; label: string; icon: React.ReactNode }[] = [
    {
      view: 'planner',
      label: 'Planner',
      icon: <FolderKanban className="w-5 h-5" />,
    },
    {
      view: 'team',
      label: 'Team Hub',
      icon: <Users className="w-5 h-5" />,
    },
    {
      view: 'financials',
      label: 'Finance',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      view: 'dashboard',
      label: 'Projects',
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      view: 'config',
      label: 'Config',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800 px-3 py-2 flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        const isActive = activeView === item.view;
        return (
          <button
            key={item.view}
            type="button"
            onClick={() => setActiveView(item.view)}
            className={`flex flex-col items-center gap-1 py-1 px-3 rounded-2xl transition-all ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold scale-105'
                : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-semibold'
            }`}
          >
            {item.icon}
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}

      {/* Quick Access to RIB / Blocker Modal */}
      {onOpenRisks && (
        <button
          type="button"
          onClick={onOpenRisks}
          className="flex flex-col items-center gap-1 py-1 px-3 text-rose-500 font-bold hover:scale-105 transition-transform"
        >
          <ShieldAlert className="w-5 h-5" />
          <span className="text-[10px]">RIB / Risk</span>
        </button>
      )}
    </nav>
  );
};
