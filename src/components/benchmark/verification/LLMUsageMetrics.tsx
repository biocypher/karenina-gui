import React from 'react';
import type { VerificationResult, UsageMetadata } from '../../../types';

interface LLMUsageMetricsProps {
  usageMetadata: NonNullable<VerificationResult['template']>['usage_metadata'];
  agentMetrics?: NonNullable<VerificationResult['template']>['agent_metrics'];
}

export const LLMUsageMetrics: React.FC<LLMUsageMetricsProps> = ({ usageMetadata, agentMetrics }) => {
  const totals = Object.entries(usageMetadata)
    .filter(([stage]) => stage.toLowerCase() !== 'total')
    .reduce(
      (acc, [, metadata]) => ({
        input_tokens: (acc.input_tokens || 0) + (metadata.input_tokens || 0),
        output_tokens: (acc.output_tokens || 0) + (metadata.output_tokens || 0),
        total_tokens: (acc.total_tokens || 0) + (metadata.total_tokens || 0),
      }),
      { input_tokens: 0, output_tokens: 0, total_tokens: 0 }
    );

  return (
    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-600">
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Stage</th>
              <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Input Tokens</th>
              <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Output Tokens</th>
              <th className="text-right py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Total Tokens</th>
              <th className="text-left py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Model</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(usageMetadata)
              .filter(([stage]) => stage.toLowerCase() !== 'total')
              .map(([stage, metadata]: [string, UsageMetadata]) => (
                <tr key={stage} className="border-b border-slate-100 dark:border-slate-600/50">
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200 capitalize">
                    {stage.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                    {metadata.input_tokens?.toLocaleString() || 0}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                    {metadata.output_tokens?.toLocaleString() || 0}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right font-medium">
                    {metadata.total_tokens?.toLocaleString() || 0}
                  </td>
                  <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-xs">{metadata.model || 'N/A'}</td>
                </tr>
              ))}
            <tr className="border-t-2 border-slate-300 dark:border-slate-500 font-semibold">
              <td className="py-2 px-3 text-slate-800 dark:text-slate-200">Total</td>
              <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                {totals.input_tokens.toLocaleString()}
              </td>
              <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                {totals.output_tokens.toLocaleString()}
              </td>
              <td className="py-2 px-3 text-slate-800 dark:text-slate-200 text-right">
                {totals.total_tokens.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Agent Metrics (if available) */}
      {agentMetrics && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
          <h5 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Agent Execution</h5>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Iterations:</span>
              <p className="text-slate-800 dark:text-slate-200">{agentMetrics.iterations || 0}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Tool Calls:</span>
              <p className="text-slate-800 dark:text-slate-200">{agentMetrics.tool_calls || 0}</p>
            </div>
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Suspect Failed Calls:</span>
              <p
                className={`${
                  (agentMetrics.suspect_failed_tool_calls || 0) > 0
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {agentMetrics.suspect_failed_tool_calls || 0}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm mt-3">
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Tools Used:</span>
              {agentMetrics.tool_call_counts && Object.keys(agentMetrics.tool_call_counts).length > 0 ? (
                <ul className="text-slate-800 dark:text-slate-200 text-xs mt-1 list-disc list-inside space-y-0.5">
                  {Object.entries(agentMetrics.tool_call_counts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([tool, count]) => (
                      <li key={tool}>
                        <span className="font-mono">{tool}</span>: {count}
                      </li>
                    ))}
                </ul>
              ) : agentMetrics.tools_used && agentMetrics.tools_used.length > 0 ? (
                <ul className="text-slate-800 dark:text-slate-200 text-xs mt-1 list-disc list-inside space-y-0.5">
                  {agentMetrics.tools_used.map((tool) => (
                    <li key={tool}>
                      <span className="font-mono">{tool}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-800 dark:text-slate-200 text-xs mt-1">None</p>
              )}
            </div>
            <div>
              <span className="font-medium text-slate-600 dark:text-slate-300">Suspect Failed Tools:</span>
              <p
                className={`text-xs mt-1 ${
                  agentMetrics.suspect_failed_tools && agentMetrics.suspect_failed_tools.length > 0
                    ? 'text-red-600 dark:text-red-400 font-semibold'
                    : 'text-slate-800 dark:text-slate-200'
                }`}
              >
                {agentMetrics.suspect_failed_tools && agentMetrics.suspect_failed_tools.length > 0
                  ? agentMetrics.suspect_failed_tools.join(', ')
                  : 'None'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
