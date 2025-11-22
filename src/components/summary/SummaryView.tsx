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

  const passRate = summary.template_pass_overall.pass_pct;

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">
          === OVERVIEW ===
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Total Results:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{summary.num_results}</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Questions:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{summary.num_questions}</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Models:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {summary.num_models} answering x {summary.num_parsing_models} parsing
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Replicates:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{summary.num_replicates}</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Total Execution Time:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {formatDuration(summary.total_execution_time)}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Total Tokens:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {formatNumber(summary.tokens.total_input)} input, {formatNumber(summary.tokens.total_output)} output
                  <div className="ml-4 mt-1 text-xs text-slate-600 dark:text-slate-400">
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
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">
          === COMPLETION STATUS ===
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">By Model Combination:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {Object.entries(summary.completion_by_combo).map(([combo, stats]) => (
                    <div key={combo} className="mb-1">
                      {combo}: {stats.completed}/{stats.total} completed ({stats.completion_pct.toFixed(1)}%)
                    </div>
                  ))}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Overall:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  <span
                    className="cursor-pointer text-green-600 dark:text-green-400 hover:underline"
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
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">
          === EVALUATION TYPES ===
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Template Verification:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{summary.num_with_template} results</td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Rubric Evaluation:</td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {summary.num_with_rubric} results
                  {summary.rubric_traits && (
                    <div className="ml-4 mt-1 text-xs text-slate-600 dark:text-slate-400">
                      <div>
                        Total Trait Evaluations:{' '}
                        {summary.rubric_traits.global_traits.llm.count +
                          summary.rubric_traits.global_traits.regex.count +
                          summary.rubric_traits.global_traits.callable.count +
                          summary.rubric_traits.global_traits.metric.count +
                          summary.rubric_traits.question_specific_traits.llm.count +
                          summary.rubric_traits.question_specific_traits.regex.count +
                          summary.rubric_traits.question_specific_traits.callable.count +
                          summary.rubric_traits.question_specific_traits.metric.count}
                      </div>
                      <div>
                        Global:{' '}
                        {summary.rubric_traits.global_traits.llm.count +
                          summary.rubric_traits.global_traits.regex.count +
                          summary.rubric_traits.global_traits.callable.count +
                          summary.rubric_traits.global_traits.metric.count}
                      </div>
                      <div className="ml-4">└─ LLM: {summary.rubric_traits.global_traits.llm.count}</div>
                      {summary.rubric_traits.global_traits.regex.count > 0 && (
                        <div className="ml-4">└─ Regex: {summary.rubric_traits.global_traits.regex.count}</div>
                      )}
                      {summary.rubric_traits.global_traits.metric.count > 0 && (
                        <div className="ml-4">└─ Metric: {summary.rubric_traits.global_traits.metric.count}</div>
                      )}
                      <div>
                        Question-Specific:{' '}
                        {summary.rubric_traits.question_specific_traits.llm.count +
                          summary.rubric_traits.question_specific_traits.regex.count +
                          summary.rubric_traits.question_specific_traits.callable.count +
                          summary.rubric_traits.question_specific_traits.metric.count}
                      </div>
                      <div className="ml-4">
                        └─ LLM: {summary.rubric_traits.question_specific_traits.llm.count}, Metric:{' '}
                        {summary.rubric_traits.question_specific_traits.metric.count}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
              {summary.num_with_judgment > 0 && (
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Deep Judgment:</td>
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{summary.num_with_judgment} results</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Template Pass Rates */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">
          === TEMPLATE PASS RATES ===
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">
                  By Model Combination (+ MCP if used):
                </td>
                <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                  {Object.entries(summary.template_pass_by_combo).map(([combo, stats]) => (
                    <div key={combo} className="mb-1">
                      {combo}: {stats.passed}/{stats.total} passed ({stats.pass_pct.toFixed(1)}%)
                    </div>
                  ))}
                </td>
              </tr>
              <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Overall:</td>
                <td className="py-2 px-3">
                  <span
                    className={`cursor-pointer hover:underline ${
                      passRate >= 70 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                    onClick={onDrillDown ? () => onDrillDown({ type: 'passed' }) : undefined}
                  >
                    {summary.template_pass_overall.passed}/{summary.template_pass_overall.total} passed (
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
        <div>
          <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3 pb-2 border-b border-slate-300 dark:border-slate-600">
            === REPLICATE STATISTICS ===
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-300">
                    Template Pass Rate by Replicate:
                  </td>
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-100">
                    {Object.entries(summary.replicate_stats.replicate_pass_rates).map(([replicate, stats]) => (
                      <div key={replicate} className="mb-1">
                        Replicate {replicate}: {stats.passed}/{stats.total} passed ({stats.pass_pct.toFixed(1)}%)
                      </div>
                    ))}
                    <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                      Summary: mean={summary.replicate_stats.replicate_summary.mean.toFixed(3)}, std=
                      {summary.replicate_stats.replicate_summary.std.toFixed(3)}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
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
