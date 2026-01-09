import React from 'react';

export type TabValue = 'generator' | 'curator' | 'benchmark' | 'docs';

export interface TabNavigationProps {
  activeTab: TabValue;
  onTabSwitch: (tab: TabValue) => void;
  unsavedCount: number;
}

export function TabNavigation({ activeTab, onTabSwitch, unsavedCount }: TabNavigationProps) {
  const getTabClassName = (tab: TabValue) => {
    const baseClass = 'px-6 py-3 rounded-lg font-medium transition-all duration-200';
    const activeClass = 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md';
    const inactiveClass =
      'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50';

    return `${baseClass} ${activeTab === tab ? activeClass : inactiveClass}`;
  };

  return (
    <div className="mt-6 flex gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-white/30 dark:border-slate-700/30 shadow-sm w-fit">
      <button onClick={() => onTabSwitch('generator')} className={getTabClassName('generator')}>
        1. Template Generation
      </button>
      <button onClick={() => onTabSwitch('curator')} className={`${getTabClassName('curator')} relative`}>
        2. Template Curator
        {unsavedCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse border-2 border-white dark:border-slate-800"
            title={`${unsavedCount} question(s) with unsaved changes`}
          ></span>
        )}
      </button>
      <button onClick={() => onTabSwitch('benchmark')} className={getTabClassName('benchmark')}>
        3. Benchmark
      </button>
      <button onClick={() => onTabSwitch('docs')} className={getTabClassName('docs')}>
        4. Docs
      </button>
    </div>
  );
}
