import React from 'react';
import { Settings } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { forceResetAllData } from '../utils/dataLoader';

export interface AppHeaderProps {
  sessionId: string;
  questionDataCount: number;
  checkpointCount: number;
  extractedQuestionsCount: number;
  onOpenConfig: () => void;
}

export function AppHeader({
  sessionId,
  questionDataCount,
  checkpointCount,
  extractedQuestionsCount,
  onOpenConfig,
}: AppHeaderProps) {
  const handleForceReset = () => {
    forceResetAllData();
    window.location.reload();
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <img
              src="/favicon.svg"
              alt="Karenina Logo"
              className="w-16 h-16 transition-all duration-300 filter dark:invert dark:brightness-0 dark:contrast-100"
            />
          </div>
          <div>
            <h1
              className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900
                         dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300
                         bg-clip-text text-transparent mb-2"
            >
              Karenina
            </h1>
            <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">
              A tool for benchmarking LLMs through structured templates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenConfig}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300
                     hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title="Configuration"
          >
            <Settings className="h-5 w-5" />
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Development Session Status - Only show in development */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
          <div className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Dev Mode:</strong> Session ID: {sessionId.slice(-8)} | Data: {questionDataCount} questions,{' '}
            {checkpointCount} checkpoint items, {extractedQuestionsCount} extracted
            <button
              onClick={handleForceReset}
              className="ml-2 px-2 py-1 bg-yellow-600 dark:bg-yellow-700 text-white rounded text-xs hover:bg-yellow-700 dark:hover:bg-yellow-600"
            >
              Force Reset & Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
