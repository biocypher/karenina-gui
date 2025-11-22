/**
 * SummaryStatisticsPanel - Main container for summary statistics
 *
 * Features:
 * - Mode toggle: Summary ↔ Comparison
 * - Run name selector with "All Runs" option
 * - Auto-fetch summary on mount and when selection changes
 * - Displays SummaryView or ComparisonView based on mode
 * - Supports drill-down interactions to filter main table
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, GitCompare } from 'lucide-react';
import { SummaryView } from './SummaryView';
import { ComparisonView } from './ComparisonView';
import { fetchSummary } from '../../utils/summaryApi';
import type { VerificationResult, SummaryStats } from '../../types';

interface SummaryStatisticsPanelProps {
  benchmarkResults: Record<string, VerificationResult>;
  /** Callback for drill-down to filter main table */
  onDrillDown?: (filter: {
    type?: 'completed' | 'errors' | 'passed' | 'failed' | 'abstained';
    questionId?: string;
    modelKey?: string;
  }) => void;
}

type ViewMode = 'summary' | 'comparison';

export function SummaryStatisticsPanel({ benchmarkResults, onDrillDown }: SummaryStatisticsPanelProps) {
  const [mode, setMode] = useState<ViewMode>('summary');
  const [selectedRunName, setSelectedRunName] = useState<string | null>(null);
  const [summaryData, setSummaryData] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract unique run names from results
  const runNames = useMemo(() => {
    const names = new Set<string>();
    Object.values(benchmarkResults).forEach((result) => {
      if (result.metadata.run_name) {
        names.add(result.metadata.run_name);
      }
    });
    return Array.from(names).sort();
  }, [benchmarkResults]);

  // Fetch summary when results or run name changes (only for summary mode)
  useEffect(() => {
    if (mode !== 'summary') return;
    if (Object.keys(benchmarkResults).length === 0) {
      setSummaryData(null);
      return;
    }

    const fetchSummaryData = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchSummary({
          results: benchmarkResults,
          run_name: selectedRunName,
        });

        setSummaryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
        setSummaryData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSummaryData();
  }, [benchmarkResults, selectedRunName, mode]);

  const handleModeToggle = (newMode: ViewMode) => {
    setMode(newMode);
  };

  const handleSummaryDrillDown = (filter: { type: 'completed' | 'errors' | 'passed' | 'failed' | 'abstained' }) => {
    if (onDrillDown) {
      onDrillDown(filter);
    }
  };

  const handleComparisonDrillDown = (questionId: string, modelKey: string) => {
    if (onDrillDown) {
      onDrillDown({ questionId, modelKey });
    }
  };

  if (Object.keys(benchmarkResults).length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">
          No verification results available. Run verification to see summary statistics.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Summary Statistics</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Run Name Selector */}
          {mode === 'summary' && runNames.length > 0 && (
            <select
              value={selectedRunName || ''}
              onChange={(e) => setSelectedRunName(e.target.value || null)}
              className="px-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Runs</option>
              {runNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          )}

          {/* Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-md p-1">
            <button
              onClick={() => handleModeToggle('summary')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                mode === 'summary'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BarChart3 size={16} />
              Summary
            </button>
            <button
              onClick={() => handleModeToggle('comparison')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded transition-colors ${
                mode === 'comparison'
                  ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GitCompare size={16} />
              Compare
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-600 dark:text-slate-400">
              Loading{mode === 'summary' ? ' summary' : ' comparison'}...
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="text-red-800 dark:text-red-200 font-semibold">Error</div>
            <div className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</div>
          </div>
        )}

        {!loading && !error && mode === 'summary' && summaryData && (
          <SummaryView summary={summaryData} onDrillDown={handleSummaryDrillDown} />
        )}

        {!loading && !error && mode === 'comparison' && (
          <ComparisonView results={benchmarkResults} onDrillDown={handleComparisonDrillDown} />
        )}
      </div>
    </div>
  );
}
