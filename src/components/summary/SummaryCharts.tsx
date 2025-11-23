/**
 * SummaryCharts - Chart visualizations for summary statistics
 *
 * Provides bar charts and pie charts using Nivo for:
 * - Template pass rates by model combination
 * - Token usage breakdown
 * - Model distribution
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import type { SummaryStats } from '../../types';

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
  const passRateData = Object.entries(summary.template_pass_by_combo).map(([combo, stats]) => ({
    combo: parseCombo(combo),
    passed: stats.passed,
    failed: stats.total - stats.passed,
    'Pass Rate': stats.pass_pct,
  }));

  // Prepare data for token usage by model chart
  const tokensByModelData = Object.entries(summary.tokens_by_combo).map(([combo, stats]) => ({
    combo: parseCombo(combo),
    input: stats.input,
    output: stats.output,
  }));

  // Prepare data for token usage by evaluation type bar chart
  const tokenData = [
    {
      type: 'Template',
      input: summary.tokens.template_input,
      output: summary.tokens.template_output,
    },
    {
      type: 'Rubric',
      input: summary.tokens.rubric_input,
      output: summary.tokens.rubric_output,
    },
  ];

  if (summary.tokens.deep_judgment_input && summary.tokens.deep_judgment_output) {
    tokenData.push({
      type: 'Deep Judgment',
      input: summary.tokens.deep_judgment_input,
      output: summary.tokens.deep_judgment_output,
    });
  }

  // Common theme for dark mode support
  const isDark = document.documentElement.classList.contains('dark');
  const theme = {
    text: {
      fill: isDark ? '#e2e8f0' : '#1e293b',
    },
    grid: {
      line: {
        stroke: isDark ? '#334155' : '#cbd5e1',
      },
    },
    axis: {
      ticks: {
        text: {
          fill: isDark ? '#cbd5e1' : '#475569',
        },
      },
      legend: {
        text: {
          fill: isDark ? '#e2e8f0' : '#1e293b',
        },
      },
    },
    tooltip: {
      container: {
        background: isDark ? '#1e293b' : '#ffffff',
        color: isDark ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
        borderRadius: '6px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Template Pass Rates */}
      {passRateData.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Template Pass Rates by Model
          </h4>
          <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
            <ResponsiveBar
              data={passRateData}
              keys={['passed', 'failed']}
              indexBy="combo"
              margin={{ top: 100, right: 130, bottom: 40, left: 60 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={{ scheme: 'set2' }}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 1.6]],
              }}
              label={(d) => d.value.toLocaleString()}
              tooltip={({ id, value, color }) => (
                <div
                  style={{
                    background: isDark ? '#1e293b' : '#ffffff',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    border: `2px solid ${color}`,
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                  <div style={{ fontSize: '12px' }}>{value.toLocaleString()}</div>
                </div>
              )}
              axisTop={{
                tickSize: 0,
                tickPadding: 50,
                tickRotation: 0,
                legend: '',
                legendOffset: 0,
                renderTick: (tick) => {
                  const lines = tick.value.split('\n');
                  return (
                    <g transform={`translate(${tick.x},${tick.y - 50})`}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fill: isDark ? '#cbd5e1' : '#475569',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {lines.map((line, i) => (
                          <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  );
                },
              }}
              axisRight={null}
              axisBottom={null}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Count',
                legendPosition: 'middle',
                legendOffset: -50,
              }}
              labelSkipWidth={12}
              labelSkipHeight={12}
              labelTextColor={{
                from: 'color',
                modifiers: [['darker', 1.6]],
              }}
              legends={[
                {
                  dataFrom: 'keys',
                  anchor: 'bottom-right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemWidth: 100,
                  itemHeight: 20,
                  itemDirection: 'left-to-right',
                  itemOpacity: 0.85,
                  symbolSize: 20,
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemOpacity: 1,
                      },
                    },
                  ],
                },
              ]}
              role="application"
              ariaLabel="Template pass rates bar chart"
              theme={theme}
            />
          </div>
        </div>
      )}

      {/* Token Usage by Model */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Token Usage by Model</h4>
        <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
          <ResponsiveBar
            data={tokensByModelData}
            keys={['input', 'output']}
            indexBy="combo"
            margin={{ top: 120, right: 130, bottom: 40, left: 80 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'category10' }}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 1.6]],
            }}
            label={(d) => d.value.toLocaleString()}
            tooltip={({ id, value, color }) => (
              <div
                style={{
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  border: `2px solid ${color}`,
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                <div style={{ fontSize: '12px' }}>{value.toLocaleString()} tokens</div>
              </div>
            )}
            axisTop={{
              tickSize: 0,
              tickPadding: 50,
              tickRotation: 0,
              legend: '',
              legendOffset: 0,
              renderTick: (tick) => {
                const lines = tick.value.split('\n');
                return (
                  <g transform={`translate(${tick.x},${tick.y - 50})`}>
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{
                        fill: isDark ? '#cbd5e1' : '#475569',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {lines.map((line, i) => (
                        <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
                          {line}
                        </tspan>
                      ))}
                    </text>
                  </g>
                );
              },
            }}
            axisRight={null}
            axisBottom={null}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Tokens',
              legendPosition: 'middle',
              legendOffset: -60,
              format: (value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              },
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 1.6]],
            }}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemsSpacing: 2,
                itemWidth: 100,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 20,
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemOpacity: 1,
                    },
                  },
                ],
              },
            ]}
            role="application"
            ariaLabel="Total token usage bar chart"
            theme={theme}
          />
        </div>
      </div>

      {/* Token Usage by Evaluation Type */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Token Usage by Evaluation Type
        </h4>
        <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
          <ResponsiveBar
            data={tokenData}
            keys={['input', 'output']}
            indexBy="type"
            margin={{ top: 20, right: 130, bottom: 50, left: 80 }}
            padding={0.3}
            valueScale={{ type: 'linear' }}
            indexScale={{ type: 'band', round: true }}
            colors={{ scheme: 'nivo' }}
            borderColor={{
              from: 'color',
              modifiers: [['darker', 1.6]],
            }}
            label={(d) => d.value.toLocaleString()}
            tooltip={({ id, value, color }) => (
              <div
                style={{
                  background: isDark ? '#1e293b' : '#ffffff',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  border: `2px solid ${color}`,
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{id}</div>
                <div style={{ fontSize: '12px' }}>{value.toLocaleString()}</div>
              </div>
            )}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Evaluation Type',
              legendPosition: 'middle',
              legendOffset: 40,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Tokens',
              legendPosition: 'middle',
              legendOffset: -60,
              format: (value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              },
            }}
            labelSkipWidth={12}
            labelSkipHeight={12}
            labelTextColor={{
              from: 'color',
              modifiers: [['darker', 1.6]],
            }}
            legends={[
              {
                dataFrom: 'keys',
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 120,
                translateY: 0,
                itemsSpacing: 2,
                itemWidth: 100,
                itemHeight: 20,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 20,
                effects: [
                  {
                    on: 'hover',
                    style: {
                      itemOpacity: 1,
                    },
                  },
                ],
              },
            ]}
            role="application"
            ariaLabel="Token usage bar chart"
            theme={theme}
          />
        </div>
      </div>
    </div>
  );
}
