/**
 * ToolUsageChart - Horizontal bar charts showing tool usage statistics
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { getChartTheme } from './chartTheme';

export interface ToolUsageStats {
  total_calls: number;
  avg_calls_per_trace: number;
}

export interface ToolUsageChartProps {
  tools: Record<string, ToolUsageStats>;
  totalCalls: number;
  totalTraces: number;
}

interface ToolUsageData {
  tool: string;
  value: number;
}

export function ToolUsageChart({ tools, totalCalls, totalTraces }: ToolUsageChartProps): JSX.Element | null {
  if (Object.keys(tools).length === 0) return null;

  const theme = getChartTheme();
  const toolEntries = Object.entries(tools);

  // Sort and limit to top 15 tools
  const totalCallsData: ToolUsageData[] = toolEntries
    .sort(([, a], [, b]) => b.total_calls - a.total_calls)
    .slice(0, 15)
    .map(([tool, stats]) => ({ tool, value: stats.total_calls }));

  const avgCallsData: ToolUsageData[] = toolEntries
    .sort(([, a], [, b]) => b.avg_calls_per_trace - a.avg_calls_per_trace)
    .slice(0, 15)
    .map(([tool, stats]) => ({ tool, value: parseFloat(stats.avg_calls_per_trace.toFixed(2)) }));

  const chartHeight = Math.max(200, toolEntries.length * 28 + 60);

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Tool Usage Statistics</h4>
      <div className="grid grid-cols-2 gap-4">
        {/* Total Calls Chart */}
        <div>
          <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 text-center">Total Calls</h5>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4" style={{ height: `${chartHeight}px` }}>
            <ResponsiveBar
              data={totalCallsData}
              keys={['value']}
              indexBy="tool"
              layout="horizontal"
              margin={{ top: 10, right: 60, bottom: 40, left: 180 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={['#3b82f6']}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 1.6]],
              }}
              label={(d) => (d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : d.value.toString())}
              labelSkipWidth={12}
              labelTextColor="#ffffff"
              tooltip={({ indexValue, value }) => (
                <div
                  style={{
                    background: theme.tooltip?.container?.background || '#ffffff',
                    color: theme.tooltip?.container?.color || '#1e293b',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{indexValue}</div>
                  <div style={{ fontSize: '12px' }}>Total Calls: {value.toLocaleString()}</div>
                </div>
              )}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Calls',
                legendPosition: 'middle',
                legendOffset: 32,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0,
              }}
              role="application"
              ariaLabel="Total tool calls bar chart"
              theme={theme}
            />
          </div>
        </div>

        {/* Average Calls per Trace Chart */}
        <div>
          <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 text-center">
            Average Calls per Trace
          </h5>
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4" style={{ height: `${chartHeight}px` }}>
            <ResponsiveBar
              data={avgCallsData}
              keys={['value']}
              indexBy="tool"
              layout="horizontal"
              margin={{ top: 10, right: 60, bottom: 40, left: 180 }}
              padding={0.3}
              valueScale={{ type: 'linear' }}
              indexScale={{ type: 'band', round: true }}
              colors={['#10b981']}
              borderColor={{
                from: 'color',
                modifiers: [['darker', 1.6]],
              }}
              label={(d) => d.value.toFixed(1)}
              labelSkipWidth={12}
              labelTextColor="#ffffff"
              tooltip={({ indexValue, value }) => (
                <div
                  style={{
                    background: theme.tooltip?.container?.background || '#ffffff',
                    color: theme.tooltip?.container?.color || '#1e293b',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{indexValue}</div>
                  <div style={{ fontSize: '12px' }}>Avg per Trace: {value.toFixed(2)}</div>
                </div>
              )}
              axisTop={null}
              axisRight={null}
              axisBottom={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                legend: 'Avg Calls',
                legendPosition: 'middle',
                legendOffset: 32,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                tickRotation: 0,
              }}
              role="application"
              ariaLabel="Average tool calls per trace bar chart"
              theme={theme}
            />
          </div>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
        {totalCalls.toLocaleString()} total calls across {totalTraces.toLocaleString()} traces
      </div>
    </div>
  );
}
