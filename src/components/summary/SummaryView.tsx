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
import { SummaryCharts } from './SummaryCharts';
import type { SummaryStats } from '../../types';

interface SummaryViewProps {
  summary: SummaryStats;
  /** Callback for drill-down to filtered table view */
  onDrillDown?: (filter: { type: 'completed' | 'errors' | 'passed' | 'failed' | 'abstained' }) => void;
}

export function SummaryView({ summary, onDrillDown }: SummaryViewProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) return `${minutes}m ${secs.toFixed(1)}s`;
    return `${secs.toFixed(1)}s`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const parseCombo = (combo: string): { answering: string; parsing: string; mcp: string } => {
    const parts = combo.split(',');
    return {
      answering: parts[0] || 'Unknown',
      parsing: parts[1] || 'Unknown',
      mcp: parts[2] === 'None' ? 'None' : parts.slice(2).join(','),
    };
  };

  const passRate = summary.template_pass_overall?.pass_pct ?? 0;

  // Calculate unique answering model configurations (model + MCP)
  const uniqueAnsweringConfigs = new Set<string>();
  const uniqueParsingModels = new Set<string>();
  Object.keys(summary.completion_by_combo).forEach((combo) => {
    const parsed = parseCombo(combo);
    // Create a key that includes model + MCP config
    const answeringKey = `${parsed.answering}|${parsed.mcp}`;
    uniqueAnsweringConfigs.add(answeringKey);
    uniqueParsingModels.add(parsed.parsing);
  });
  const numAnsweringConfigs = uniqueAnsweringConfigs.size;
  const numParsingModels = uniqueParsingModels.size;

  // Common table row classes
  const rowClass =
    'border-b border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors';
  const labelClass = 'py-2.5 px-4 font-medium text-slate-600 dark:text-slate-400 w-1/3';
  const valueClass = 'py-2.5 px-4 text-slate-900 dark:text-slate-100 font-mono';
  const sectionClass = 'bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4';
  const headerClass =
    'text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-4 pb-2 border-b-2 border-blue-200 dark:border-blue-800';

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div className={sectionClass}>
        <h3 className={headerClass}>Overview</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className={rowClass}>
                <td className={labelClass}>Total Results:</td>
                <td className={valueClass}>{summary.num_results}</td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Questions:</td>
                <td className={valueClass}>{summary.num_questions}</td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Models:</td>
                <td className={valueClass}>
                  {numAnsweringConfigs} answering × {numParsingModels} parsing
                </td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Replicates:</td>
                <td className={valueClass}>{summary.num_replicates}</td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Total Execution Time:</td>
                <td className={valueClass}>{formatDuration(summary.total_execution_time)}</td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Total Tokens:</td>
                <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">
                  <div className="font-mono">
                    {formatNumber(summary.tokens.total_input)} input, {formatNumber(summary.tokens.total_output)} output
                  </div>
                  <div className="ml-4 mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-normal">
                    <div>
                      └─ Templates: {formatNumber(summary.tokens.template_input)} input,{' '}
                      {formatNumber(summary.tokens.template_output)} output
                    </div>
                    <div>
                      └─ Rubrics: {formatNumber(summary.tokens.rubric_input)} input,{' '}
                      {formatNumber(summary.tokens.rubric_output)} output
                    </div>
                    {summary.tokens.deep_judgment_input && summary.tokens.deep_judgment_output && (
                      <div>
                        └─ Deep Judgment: {formatNumber(summary.tokens.deep_judgment_input)} input,{' '}
                        {formatNumber(summary.tokens.deep_judgment_output)} output
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Completion Status */}
      <div className={sectionClass}>
        <h3 className={headerClass}>Completion Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className={rowClass}>
                <td className={labelClass}>By Model Combination:</td>
                <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">
                  <div className="space-y-3">
                    {Object.entries(summary.completion_by_combo).map(([combo, stats]) => {
                      const parsed = parseCombo(combo);
                      return (
                        <div key={combo} className="text-xs space-y-0.5">
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            Answering Model:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.answering}</span>
                          </div>
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            Parsing Model:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.parsing}</span>
                          </div>
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            MCP Tools:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.mcp}</span>
                          </div>
                          <div className="mt-1 font-mono">
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              {stats.completed}/{stats.total}
                            </span>{' '}
                            completed ({stats.completion_pct.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Overall:</td>
                <td className={valueClass}>
                  <span
                    className="cursor-pointer text-green-600 dark:text-green-400 hover:underline font-semibold"
                    onClick={onDrillDown ? () => onDrillDown({ type: 'completed' }) : undefined}
                  >
                    {summary.num_completed}/{summary.num_results} completed (
                    {((summary.num_completed / summary.num_results) * 100).toFixed(1)}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluation Types */}
      <div className={sectionClass}>
        <h3 className={headerClass}>Evaluation Types</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className={rowClass}>
                <td className={labelClass}>Template Verification:</td>
                <td className={valueClass}>{summary.num_with_template} results</td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Rubric Evaluation:</td>
                <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">
                  <div className="font-mono">{summary.num_with_rubric} results</div>
                  {summary.rubric_traits &&
                    (() => {
                      const globalLlm = summary.rubric_traits.global_traits?.llm?.count || 0;
                      const globalRegex = summary.rubric_traits.global_traits?.regex?.count || 0;
                      const globalCallable = summary.rubric_traits.global_traits?.callable?.count || 0;
                      const globalMetric = summary.rubric_traits.global_traits?.metric?.count || 0;
                      const qsLlm = summary.rubric_traits.question_specific_traits?.llm?.count || 0;
                      const qsRegex = summary.rubric_traits.question_specific_traits?.regex?.count || 0;
                      const qsCallable = summary.rubric_traits.question_specific_traits?.callable?.count || 0;
                      const qsMetric = summary.rubric_traits.question_specific_traits?.metric?.count || 0;

                      const globalTotal = globalLlm + globalRegex + globalCallable + globalMetric;
                      const qsTotal = qsLlm + qsRegex + qsCallable + qsMetric;
                      const total = globalTotal + qsTotal;

                      return (
                        <div className="ml-4 mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1 font-normal">
                          <div>
                            Total Trait Evaluations:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{total}</span>
                          </div>
                          <div>
                            Global: <span className="font-mono text-slate-900 dark:text-slate-100">{globalTotal}</span>
                          </div>
                          <div className="ml-4">
                            └─ LLM: <span className="font-mono">{globalLlm}</span>
                          </div>
                          {globalRegex > 0 && (
                            <div className="ml-4">
                              └─ Regex: <span className="font-mono">{globalRegex}</span>
                            </div>
                          )}
                          {globalCallable > 0 && (
                            <div className="ml-4">
                              └─ Callable: <span className="font-mono">{globalCallable}</span>
                            </div>
                          )}
                          {globalMetric > 0 && (
                            <div className="ml-4">
                              └─ Metric: <span className="font-mono">{globalMetric}</span>
                            </div>
                          )}
                          <div>
                            Question-Specific:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{qsTotal}</span>
                          </div>
                          <div className="ml-4">
                            └─ LLM: <span className="font-mono">{qsLlm}</span>
                            {qsRegex > 0 && (
                              <>
                                , Regex: <span className="font-mono">{qsRegex}</span>
                              </>
                            )}
                            {qsCallable > 0 && (
                              <>
                                , Callable: <span className="font-mono">{qsCallable}</span>
                              </>
                            )}
                            {qsMetric > 0 && (
                              <>
                                , Metric: <span className="font-mono">{qsMetric}</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </td>
              </tr>
              {summary.num_with_judgment > 0 && (
                <tr className={rowClass}>
                  <td className={labelClass}>Deep Judgment:</td>
                  <td className={valueClass}>{summary.num_with_judgment} results</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Pass Rates */}
      <div className={sectionClass}>
        <h3 className={headerClass}>Template Pass Rates</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <tbody>
              <tr className={rowClass}>
                <td className={labelClass}>By Model Combination (+ MCP if used):</td>
                <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">
                  <div className="space-y-3">
                    {Object.entries(summary.template_pass_by_combo).map(([combo, stats]) => {
                      const parsed = parseCombo(combo);
                      return (
                        <div key={combo} className="text-xs space-y-0.5">
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            Answering Model:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.answering}</span>
                          </div>
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            Parsing Model:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.parsing}</span>
                          </div>
                          <div className="font-medium text-slate-600 dark:text-slate-400">
                            MCP Tools:{' '}
                            <span className="font-mono text-slate-900 dark:text-slate-100">{parsed.mcp}</span>
                          </div>
                          <div className="mt-1 font-mono">
                            <span
                              className={
                                stats.pass_pct >= 70
                                  ? 'text-green-600 dark:text-green-400 font-semibold'
                                  : 'text-red-600 dark:text-red-400 font-semibold'
                              }
                            >
                              {stats.passed}/{stats.total}
                            </span>{' '}
                            passed ({stats.pass_pct.toFixed(1)}%)
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </td>
              </tr>
              <tr className={rowClass}>
                <td className={labelClass}>Overall:</td>
                <td className={valueClass}>
                  <span
                    className={`cursor-pointer hover:underline font-semibold ${
                      passRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                    onClick={onDrillDown ? () => onDrillDown({ type: 'passed' }) : undefined}
                  >
                    {summary.template_pass_overall?.passed ?? 0}/{summary.template_pass_overall?.total ?? 0} passed (
                    {passRate.toFixed(1)}%)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Replicate Statistics (if available) */}
      {summary.replicate_stats && summary.num_replicates > 1 && (
        <div className={sectionClass}>
          <h3 className={headerClass}>Replicate Statistics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className={rowClass}>
                  <td className={labelClass}>Template Pass Rate by Replicate:</td>
                  <td className="py-2.5 px-4 text-slate-900 dark:text-slate-100">
                    <div className="space-y-1">
                      {Object.entries(summary.replicate_stats.replicate_pass_rates).map(([replicate, stats]) => (
                        <div key={replicate} className="font-mono text-xs">
                          Replicate {replicate}:{' '}
                          <span
                            className={
                              stats.pass_pct >= 70
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }
                          >
                            {stats.passed}/{stats.total}
                          </span>{' '}
                          passed ({stats.pass_pct.toFixed(1)}%)
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 font-normal">
                      Summary: mean=
                      <span className="font-mono">{summary.replicate_stats.replicate_summary.mean.toFixed(3)}</span>,
                      std=<span className="font-mono">{summary.replicate_stats.replicate_summary.std.toFixed(3)}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className={sectionClass}>
        <h3 className={headerClass}>Visualizations</h3>
        <SummaryCharts summary={summary} />
      </div>
    </div>
  );
}
