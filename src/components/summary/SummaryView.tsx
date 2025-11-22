/**
 * SummaryView - Display all summary statistics
 *
 * Shows comprehensive statistics organized in sections:
 * - Basic counts
 * - Execution & tokens
 * - Template pass rates
 * - Rubric scores (if available)
 * - Charts for visual representation
 */

import React from 'react';
import { MetricCard } from './MetricCard';
import { SummaryCharts } from './SummaryCharts';
import type { SummaryStats } from '../../types';

interface SummaryViewProps {
  summary: SummaryStats;
  /** Callback for drill-down to filtered table view */
  onDrillDown?: (filter: { type: 'completed' | 'errors' | 'passed' | 'failed' | 'abstained' }) => void;
}

export function SummaryView({ summary, onDrillDown }: SummaryViewProps) {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const passRate = summary.template_pass_overall.pass_pct;

  return (
    <div className="space-y-6">
      {/* Basic Counts */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard value={summary.num_results} label="Total Results" />
          <MetricCard
            value={summary.num_completed}
            label="Completed"
            bgColor="bg-green-50 dark:bg-green-900/20"
            valueColor="text-green-700 dark:text-green-300"
            onClick={onDrillDown ? () => onDrillDown({ type: 'completed' }) : undefined}
          />
          <MetricCard
            value={summary.num_results - summary.num_completed}
            label="With Errors"
            bgColor="bg-red-50 dark:bg-red-900/20"
            valueColor="text-red-700 dark:text-red-300"
            onClick={onDrillDown ? () => onDrillDown({ type: 'errors' }) : undefined}
          />
          <MetricCard value={summary.num_questions} label="Questions" />
          <MetricCard value={summary.num_models} label="Models" />
          <MetricCard value={summary.num_replicates} label="Replicates" />
        </div>
      </div>

      {/* Execution & Tokens */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Performance</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <MetricCard value={formatDuration(summary.total_execution_time)} label="Total Time" />
          <MetricCard
            value={formatNumber(summary.tokens.total_input)}
            label="Input Tokens"
            subtitle="All evaluations"
          />
          <MetricCard
            value={formatNumber(summary.tokens.total_output)}
            label="Output Tokens"
            subtitle="All evaluations"
          />
          <MetricCard value={summary.num_with_template} label="With Template" />
          <MetricCard value={summary.num_with_rubric} label="With Rubric" />
          <MetricCard value={summary.num_with_judgment} label="With Judgment" />
        </div>
      </div>

      {/* Template Pass Rates */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Template Verification</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard value={summary.template_pass_overall.total} label="Total Tests" />
          <MetricCard
            value={summary.template_pass_overall.passed}
            label="Passed"
            bgColor="bg-green-50 dark:bg-green-900/20"
            valueColor="text-green-700 dark:text-green-300"
            onClick={onDrillDown ? () => onDrillDown({ type: 'passed' }) : undefined}
          />
          <MetricCard
            value={summary.template_pass_overall.total - summary.template_pass_overall.passed}
            label="Failed"
            bgColor="bg-red-50 dark:bg-red-900/20"
            valueColor="text-red-700 dark:text-red-300"
            onClick={onDrillDown ? () => onDrillDown({ type: 'failed' }) : undefined}
          />
          <MetricCard
            value={`${passRate.toFixed(1)}%`}
            label="Pass Rate"
            bgColor={
              passRate >= 90
                ? 'bg-green-50 dark:bg-green-900/20'
                : passRate >= 70
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
            }
            valueColor={
              passRate >= 90
                ? 'text-green-700 dark:text-green-300'
                : passRate >= 70
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-red-700 dark:text-red-300'
            }
          />
        </div>
      </div>

      {/* Rubric Statistics (if available) */}
      {summary.rubric_traits && (
        <div>
          <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Rubric Traits</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard value={summary.rubric_traits.global_traits.llm.count} label="Global LLM Traits" />
            <MetricCard value={summary.rubric_traits.global_traits.regex.count} label="Global Regex Traits" />
            <MetricCard value={summary.rubric_traits.question_specific_traits.llm.count} label="Question LLM Traits" />
            <MetricCard
              value={summary.rubric_traits.question_specific_traits.regex.count}
              label="Question Regex Traits"
            />
          </div>
        </div>
      )}

      {/* Replicate Statistics (if available) */}
      {summary.replicate_stats && summary.num_replicates > 1 && (
        <div>
          <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Replicate Consistency</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard
              value={`${(summary.replicate_stats.replicate_summary.mean * 100).toFixed(1)}%`}
              label="Mean Pass Rate"
              subtitle="Across replicates"
            />
            <MetricCard
              value={`${(summary.replicate_stats.replicate_summary.std * 100).toFixed(1)}%`}
              label="Std Deviation"
              subtitle="Replicate variation"
            />
            {Object.entries(summary.replicate_stats.replicate_pass_rates).map(([replicate, stats]) => (
              <MetricCard
                key={replicate}
                value={`${stats.pass_pct.toFixed(1)}%`}
                label={`Replicate ${replicate}`}
                subtitle={`${stats.passed}/${stats.total}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Visualizations</h3>
        <SummaryCharts summary={summary} />
      </div>
    </div>
  );
}
