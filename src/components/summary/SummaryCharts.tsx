/**
 * SummaryCharts - Chart visualizations for summary statistics
 *
 * Composition root for chart components using extracted modules.
 * Displays template pass rates, token usage, and tool usage statistics.
 */

import React from 'react';
import type { SummaryStats } from '../../types';
import {
  PassRateChart,
  TokenUsageByModelChart,
  TokenUsageByTypeChart,
  ToolUsageChart,
  type PassRateData,
  type TokenUsageByModelData,
  type TokenUsageByTypeData,
} from './charts';

interface SummaryChartsProps {
  summary: SummaryStats;
}

export function SummaryCharts({ summary }: SummaryChartsProps) {
  // Parse combo into readable format with labels
  const parseCombo = (combo: string): string => {
    const parts = combo.split(',');
    const answering = parts[0] || 'Unknown';
    const parsing = parts[1] || 'Unknown';
    const mcp = parts[2] === 'None' ? 'None' : parts.slice(2).join(',');
    return `Answering: ${answering}\nParsing: ${parsing}\nMCP: ${mcp}`;
  };

  // Prepare data for template pass rates bar chart
  const passRateData: PassRateData[] =
    summary.template_pass_by_combo && typeof summary.template_pass_by_combo === 'object'
      ? Object.entries(summary.template_pass_by_combo).map(([combo, stats]) => ({
          combo: parseCombo(combo),
          passed: stats.passed,
          failed: stats.total - stats.passed,
          'Pass Rate': stats.pass_pct,
        }))
      : [];

  // Prepare data for token usage by model chart
  const tokensByModelData: TokenUsageByModelData[] =
    summary.tokens_by_combo && typeof summary.tokens_by_combo === 'object'
      ? Object.entries(summary.tokens_by_combo).map(([combo, stats]) => ({
          combo: parseCombo(combo),
          input: stats.input,
          output: stats.output,
        }))
      : [];

  // Prepare data for token usage by evaluation type bar chart
  const tokenData: TokenUsageByTypeData[] = summary.tokens
    ? [
        {
          type: 'Template',
          input: summary.tokens.template_input ?? 0,
          output: summary.tokens.template_output ?? 0,
        },
        {
          type: 'Rubric',
          input: summary.tokens.rubric_input ?? 0,
          output: summary.tokens.rubric_output ?? 0,
        },
      ]
    : [];

  if (summary.tokens?.deep_judgment_input && summary.tokens.deep_judgment_output) {
    tokenData.push({
      type: 'Deep Judgment',
      input: summary.tokens.deep_judgment_input,
      output: summary.tokens.deep_judgment_output,
    });
  }

  return (
    <div className="space-y-6">
      {/* Template Pass Rates */}
      <PassRateChart data={passRateData} />

      {/* Token Usage by Model */}
      <TokenUsageByModelChart data={tokensByModelData} />

      {/* Token Usage by Evaluation Type */}
      <TokenUsageByTypeChart data={tokenData} />

      {/* Tool Usage Statistics */}
      {summary.tool_usage_stats &&
        summary.tool_usage_stats.tools &&
        Object.keys(summary.tool_usage_stats.tools).length > 0 && (
          <ToolUsageChart
            tools={summary.tool_usage_stats.tools}
            totalCalls={summary.tool_usage_stats.total_tool_calls}
            totalTraces={summary.tool_usage_stats.total_traces_with_tools}
          />
        )}
    </div>
  );
}
