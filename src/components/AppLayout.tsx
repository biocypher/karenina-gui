import React, { ReactNode } from 'react';

export interface AppLayoutProps {
  children: ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function AppLayout({ children, isLoading, loadingMessage = 'Loading question data...' }: AppLayoutProps) {
  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
                      dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900
                      flex items-center justify-center"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50
                    dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900"
    >
      <div className="container mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
