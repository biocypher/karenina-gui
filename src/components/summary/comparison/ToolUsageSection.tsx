import { ResponsiveBar } from '@nivo/bar';
import type { ModelConfig, ModelComparisonResponse } from '../../../../types';

interface ToolUsageSectionProps {
  selectedModels: ModelConfig[];
  comparisonData: ModelComparisonResponse;
  collapsed: boolean;
  onToggle: () => void;
}

export function ToolUsageSection({ selectedModels, comparisonData, collapsed, onToggle }: ToolUsageSectionProps) {
  const getModelKey = (model: ModelConfig): string => {
    return `${model.answering_model}|${model.mcp_config}`;
  };

  // Check if any model has tool usage stats
  const hasToolUsageStats = selectedModels.some((model) => {
    const modelKey = getModelKey(model);
    const summary = comparisonData.model_summaries[modelKey];
    return summary?.tool_usage_stats?.tools && Object.keys(summary.tool_usage_stats.tools).length > 0;
  });

  if (!hasToolUsageStats) return null;

  // Dark mode detection and theme for charts
  const isDark = document.documentElement.classList.contains('dark');
  const chartTheme = {
    text: { fill: isDark ? '#e2e8f0' : '#1e293b' },
    grid: { line: { stroke: isDark ? '#334155' : '#cbd5e1' } },
    axis: {
      ticks: { text: { fill: isDark ? '#cbd5e1' : '#475569' } },
      legend: { text: { fill: isDark ? '#e2e8f0' : '#1e293b' } },
    },
  };

  return (
    <div>
      {/* Collapsible Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-4 py-3 transition-colors rounded-lg border ${
          collapsed
            ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200">Tool Usage Statistics</h3>
          {collapsed && <span className="text-xs text-slate-400 dark:text-slate-500">Click to expand</span>}
        </div>
        <svg
          className={`w-5 h-5 text-slate-500 dark:text-slate-400 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsible Content */}
      {!collapsed && (
        <div className="p-4 space-y-6">
          {/* Per-model tool usage - grid based on model count */}
          <div
            className={`grid gap-6 ${
              selectedModels.length === 1
                ? 'grid-cols-1'
                : selectedModels.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : selectedModels.length === 3
                    ? 'grid-cols-1 md:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {selectedModels.map((model) => {
              const modelKey = getModelKey(model);
              const summary = comparisonData.model_summaries[modelKey];
              const toolStats = summary?.tool_usage_stats;

              if (!toolStats?.tools || Object.keys(toolStats.tools).length === 0) {
                return (
                  <div key={modelKey} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800 truncate">
                      {model.answering_model}
                      {model.mcp_config && model.mcp_config !== '[]' && (
                        <span className="font-normal text-xs text-slate-500 dark:text-slate-400 ml-2">
                          (MCP: {JSON.parse(model.mcp_config).join(', ')})
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">No tool usage data available</p>
                  </div>
                );
              }

              const toolCount = Object.keys(toolStats.tools).length;
              const chartHeight = Math.max(180, Math.min(toolCount, 15) * 24 + 60);

              return (
                <div key={modelKey} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                  {/* Model Header */}
                  <h4 className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800 truncate">
                    {model.answering_model}
                    {model.mcp_config && model.mcp_config !== '[]' && (
                      <span className="font-normal text-xs text-slate-500 dark:text-slate-400 ml-2">
                        (MCP: {JSON.parse(model.mcp_config).join(', ')})
                      </span>
                    )}
                  </h4>

                  {/* Stacked charts - Total Calls on top, Avg per Trace below */}
                  <div className="space-y-4">
                    {/* Total Calls Chart */}
                    <div>
                      <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Total Calls</h5>
                      <div className="rounded-lg" style={{ height: `${chartHeight}px` }}>
                        <ResponsiveBar
                          data={Object.entries(toolStats.tools)
                            .sort(([, a], [, b]) => b.total_calls - a.total_calls)
                            .slice(0, 15)
                            .map(([tool, stats]) => ({
                              tool: tool,
                              value: stats.total_calls,
                            }))}
                          keys={['value']}
                          indexBy="tool"
                          layout="horizontal"
                          margin={{ top: 5, right: 50, bottom: 30, left: 140 }}
                          padding={0.3}
                          valueScale={{ type: 'linear' }}
                          indexScale={{ type: 'band', round: true }}
                          colors={['#3b82f6']}
                          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                          label={(d) => (d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : d.value.toString())}
                          labelSkipWidth={12}
                          labelTextColor="#ffffff"
                          tooltip={({ indexValue, value }) => (
                            <div
                              style={{
                                background: isDark ? '#1e293b' : '#ffffff',
                                color: isDark ? '#e2e8f0' : '#1e293b',
                                padding: '8px 10px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{indexValue}</div>
                              <div>Total: {value.toLocaleString()}</div>
                            </div>
                          )}
                          axisTop={null}
                          axisRight={null}
                          axisBottom={{
                            tickSize: 3,
                            tickPadding: 3,
                            tickRotation: 0,
                            legend: 'Calls',
                            legendPosition: 'middle',
                            legendOffset: 24,
                          }}
                          axisLeft={{
                            tickSize: 0,
                            tickPadding: 5,
                            tickRotation: 0,
                          }}
                          theme={chartTheme}
                        />
                      </div>
                    </div>

                    {/* Average Calls per Trace Chart */}
                    <div>
                      <h5 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                        Average Calls per Trace
                      </h5>
                      <div className="rounded-lg" style={{ height: `${chartHeight}px` }}>
                        <ResponsiveBar
                          data={Object.entries(toolStats.tools)
                            .sort(([, a], [, b]) => b.avg_calls_per_trace - a.avg_calls_per_trace)
                            .slice(0, 15)
                            .map(([tool, stats]) => ({
                              tool: tool,
                              value: parseFloat(stats.avg_calls_per_trace.toFixed(2)),
                            }))}
                          keys={['value']}
                          indexBy="tool"
                          layout="horizontal"
                          margin={{ top: 5, right: 50, bottom: 30, left: 140 }}
                          padding={0.3}
                          valueScale={{ type: 'linear' }}
                          indexScale={{ type: 'band', round: true }}
                          colors={['#10b981']}
                          borderColor={{ from: 'color', modifiers: [['darker', 1.6]] }}
                          label={(d) => d.value.toFixed(1)}
                          labelSkipWidth={12}
                          labelTextColor="#ffffff"
                          tooltip={({ indexValue, value }) => (
                            <div
                              style={{
                                background: isDark ? '#1e293b' : '#ffffff',
                                color: isDark ? '#e2e8f0' : '#1e293b',
                                padding: '8px 10px',
                                borderRadius: '4px',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                              }}
                            >
                              <div style={{ fontWeight: 'bold' }}>{indexValue}</div>
                              <div>Avg per Trace: {value.toFixed(2)}</div>
                            </div>
                          )}
                          axisTop={null}
                          axisRight={null}
                          axisBottom={{
                            tickSize: 3,
                            tickPadding: 3,
                            tickRotation: 0,
                            legend: 'Avg Calls',
                            legendPosition: 'middle',
                            legendOffset: 24,
                          }}
                          axisLeft={{
                            tickSize: 0,
                            tickPadding: 5,
                            tickRotation: 0,
                          }}
                          theme={chartTheme}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary text */}
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
                    {toolStats.total_tool_calls.toLocaleString()} calls across{' '}
                    {toolStats.total_traces_with_tools.toLocaleString()} traces
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
