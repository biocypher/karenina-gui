/**
 * ComparisonView - Model comparison with heatmap and side-by-side metrics
 *
 * Features:
 * - Model selector (add/remove models, default 2, max 4)
 * - Side-by-side metrics comparison table
 * - Question×Model heatmap visualization
 * - Click cells to drill down to specific results
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { QuestionHeatmap } from './QuestionHeatmap';
import { VerificationResultDetailModal } from '../benchmark/VerificationResultDetailModal';
import { fetchModelComparison } from '../../utils/summaryApi';
import type { VerificationResult, ModelConfig, ModelComparisonResponse, Checkpoint, Rubric } from '../../types';

interface ModelOption {
  answering_model: string;
  mcp_config: string;
  display_name: string;
}

interface ComparisonViewProps {
  results: Record<string, VerificationResult>;
  checkpoint: Checkpoint;
  currentRubric: Rubric | null;
  onComparisonDataChange?: (data: ModelComparisonResponse | null) => void;
}

export function ComparisonView({ results, checkpoint, currentRubric, onComparisonDataChange }: ComparisonViewProps) {
  // Extract available models from results
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
  const [parsingModel, setParsingModel] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ModelComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [selectedResult, setSelectedResult] = useState<VerificationResult | null>(null);

  // Replicate selection state
  const [selectedReplicate, setSelectedReplicate] = useState<number | null>(null);

  // Extract unique replicates from results
  const availableReplicates = useMemo(() => {
    const replicates = new Set<number>();
    Object.values(results).forEach((result) => {
      if (result.metadata.answering_replicate !== undefined) {
        replicates.add(result.metadata.answering_replicate);
      }
    });
    return Array.from(replicates).sort((a, b) => a - b);
  }, [results]);

  // Auto-select first replicate when available
  useEffect(() => {
    if (availableReplicates.length > 0 && selectedReplicate === null) {
      setSelectedReplicate(availableReplicates[0]);
    }
  }, [availableReplicates, selectedReplicate]);

  // Extract unique models from results on mount
  useEffect(() => {
    const modelsMap = new Map<string, ModelOption>();

    Object.values(results).forEach((result) => {
      const answering_model = result.metadata.answering_model;

      // Extract MCP servers from template
      const mcpServers = result.template?.answering_mcp_servers || [];
      const mcp_config = JSON.stringify(mcpServers.sort()); // Sort for consistent keys
      const key = `${answering_model}|${mcp_config}`;

      if (!modelsMap.has(key)) {
        // Create display name with MCP servers
        let mcpSuffix = '';
        if (mcpServers.length > 0) {
          mcpSuffix = ` (MCP: ${mcpServers.join(', ')})`;
        }

        modelsMap.set(key, {
          answering_model,
          mcp_config,
          display_name: `${answering_model}${mcpSuffix}`,
        });
      }

      // Set default parsing model to the first one found
      if (!parsingModel && result.metadata.parsing_model) {
        setParsingModel(result.metadata.parsing_model);
      }
    });

    const models = Array.from(modelsMap.values());
    setAvailableModels(models);

    // Auto-select first 2 models
    if (models.length >= 2) {
      setSelectedModels([
        { answering_model: models[0].answering_model, mcp_config: models[0].mcp_config },
        { answering_model: models[1].answering_model, mcp_config: models[1].mcp_config },
      ]);
    }
  }, [results, parsingModel]);

  // Fetch comparison when models or replicate changes
  useEffect(() => {
    if (selectedModels.length < 2) {
      setComparisonData(null);
      return;
    }

    const fetchComparison = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchModelComparison({
          results,
          models: selectedModels,
          parsing_model: parsingModel,
          replicate: selectedReplicate,
        });

        console.log('📊 Comparison data received:', {
          hasData: !!data,
          hasHeatmapData: !!data?.heatmap_data,
          heatmapLength: data?.heatmap_data?.length,
          modelSummaries: data?.model_summaries ? Object.keys(data.model_summaries) : [],
        });

        console.log('🔍 Detailed heatmap data:', {
          sampleQuestion: data.heatmap_data[0],
          allModelKeysInData: data.heatmap_data[0]?.results_by_model
            ? Object.keys(data.heatmap_data[0].results_by_model)
            : [],
        });

        console.log('🔍 Selected models:', {
          selectedModels,
          generatedModelKeys: selectedModels.map((m) => `${m.answering_model}|${m.mcp_config}`),
        });

        // Validate the response has required data
        if (!data || !data.heatmap_data || !Array.isArray(data.heatmap_data)) {
          console.error('❌ Invalid comparison data:', data);
          setError('Invalid comparison data received from server');
          return;
        }

        setComparisonData(data);
      } catch (err) {
        console.error('❌ Comparison fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [selectedModels, results, parsingModel, selectedReplicate]);

  // Notify parent when comparison data changes
  useEffect(() => {
    if (onComparisonDataChange) {
      onComparisonDataChange(comparisonData);
    }
  }, [comparisonData, onComparisonDataChange]);

  const getModelKey = (model: ModelConfig): string => {
    return `${model.answering_model}|${model.mcp_config}`;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) return `${minutes}m ${secs.toFixed(1)}s`;
    return `${secs.toFixed(1)}s`;
  };

  // Handle heatmap cell click - find and display the result
  const handleCellClick = (questionId: string, modelKey: string) => {
    // Find the matching result for the selected replicate
    const matchingResult = Object.values(results).find((result) => {
      if (result.metadata.question_id !== questionId) return false;
      if (result.metadata.parsing_model !== parsingModel) return false;
      if (result.metadata.answering_replicate !== selectedReplicate) return false;

      // Extract model info from result
      const resultAnsweringModel = result.metadata.answering_model;
      const resultMcpServers = result.template?.answering_mcp_servers || [];
      const resultMcpConfig = JSON.stringify(resultMcpServers.sort());
      const resultModelKey = `${resultAnsweringModel}|${resultMcpConfig}`;

      return resultModelKey === modelKey;
    });

    if (matchingResult) {
      setSelectedResult(matchingResult);
    } else {
      console.warn('No matching result found for:', { questionId, modelKey, replicate: selectedReplicate });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600 dark:text-slate-400">Loading comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="text-red-800 dark:text-red-200 font-semibold">Error</div>
        <div className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Model Selector */}
      <div>
        <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Select Models to Compare</h3>
        <ModelSelectorDropdown
          availableModels={availableModels}
          selectedModels={selectedModels}
          onModelsChange={setSelectedModels}
          maxModels={4}
        />
      </div>

      {/* Only show comparison if at least 2 models selected */}
      {selectedModels.length >= 2 && comparisonData && comparisonData.heatmap_data && (
        <>
          {/* Side-by-side Detailed Metrics Comparison */}
          <div>
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Metrics Comparison</h3>

            {/* Detailed metrics in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {selectedModels.map((model) => {
                const modelKey = getModelKey(model);
                const summary = comparisonData.model_summaries[modelKey];

                if (!summary) return null;

                const passRate = summary.template_pass_overall?.pass_pct ?? 0;
                const sectionClass = 'bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4';
                const headerClass =
                  'text-sm font-mono font-bold text-blue-600 dark:text-blue-400 mb-3 pb-2 border-b-2 border-blue-200 dark:border-blue-800';
                const rowClass =
                  'border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors';
                const labelClass = 'py-2 px-3 font-medium text-slate-600 dark:text-slate-400 text-xs';
                const valueClass = 'py-2 px-3 text-slate-900 dark:text-slate-100 font-mono text-xs';

                return (
                  <div key={modelKey} className="space-y-4">
                    {/* Model Header */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {model.answering_model}
                      </h4>
                      {model.mcp_config && model.mcp_config !== '[]' && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          MCP: {JSON.parse(model.mcp_config).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Overview */}
                    <div className={sectionClass}>
                      <h5 className={headerClass}>Overview</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
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
                              <td className={labelClass}>Replicates:</td>
                              <td className={valueClass}>{summary.num_replicates}</td>
                            </tr>
                            <tr className={rowClass}>
                              <td className={labelClass}>Execution Time:</td>
                              <td className={valueClass}>{formatDuration(summary.total_execution_time)}</td>
                            </tr>
                            <tr className={rowClass}>
                              <td className={labelClass}>Total Tokens:</td>
                              <td className={valueClass}>
                                <div>
                                  {formatNumber(summary.tokens.total_input)} input,{' '}
                                  {formatNumber(summary.tokens.total_output)} output
                                </div>
                                <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
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
                      <h5 className={headerClass}>Completion Status</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            <tr className={rowClass}>
                              <td className={labelClass}>Overall:</td>
                              <td className={valueClass}>
                                <span className="text-green-600 dark:text-green-400 font-semibold">
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
                      <h5 className={headerClass}>Evaluation Types</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            <tr className={rowClass}>
                              <td className={labelClass}>Template Verification:</td>
                              <td className={valueClass}>{summary.num_with_template} results</td>
                            </tr>
                            <tr className={rowClass}>
                              <td className={labelClass}>Rubric Evaluation:</td>
                              <td className={valueClass}>
                                <div>{summary.num_with_rubric} results</div>
                                {summary.rubric_traits &&
                                  (() => {
                                    const globalLlm = summary.rubric_traits.global_traits?.llm?.count || 0;
                                    const globalRegex = summary.rubric_traits.global_traits?.regex?.count || 0;
                                    const globalCallable = summary.rubric_traits.global_traits?.callable?.count || 0;
                                    const globalMetric = summary.rubric_traits.global_traits?.metric?.count || 0;
                                    const qsLlm = summary.rubric_traits.question_specific_traits?.llm?.count || 0;
                                    const qsRegex = summary.rubric_traits.question_specific_traits?.regex?.count || 0;
                                    const qsCallable =
                                      summary.rubric_traits.question_specific_traits?.callable?.count || 0;
                                    const qsMetric = summary.rubric_traits.question_specific_traits?.metric?.count || 0;

                                    const globalTotal = globalLlm + globalRegex + globalCallable + globalMetric;
                                    const qsTotal = qsLlm + qsRegex + qsCallable + qsMetric;
                                    const total = globalTotal + qsTotal;

                                    return (
                                      <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                        <div>
                                          Total Trait Evaluations:{' '}
                                          <span className="font-mono text-slate-900 dark:text-slate-100">{total}</span>
                                        </div>
                                        <div>
                                          Global:{' '}
                                          <span className="font-mono text-slate-900 dark:text-slate-100">
                                            {globalTotal}
                                          </span>
                                        </div>
                                        <div className="ml-3">
                                          └─ LLM: <span className="font-mono">{globalLlm}</span>
                                        </div>
                                        {globalRegex > 0 && (
                                          <div className="ml-3">
                                            └─ Regex: <span className="font-mono">{globalRegex}</span>
                                          </div>
                                        )}
                                        {globalMetric > 0 && (
                                          <div className="ml-3">
                                            └─ Metric: <span className="font-mono">{globalMetric}</span>
                                          </div>
                                        )}
                                        <div>
                                          Question-Specific:{' '}
                                          <span className="font-mono text-slate-900 dark:text-slate-100">
                                            {qsTotal}
                                          </span>
                                        </div>
                                        <div className="ml-3">
                                          └─ LLM: <span className="font-mono">{qsLlm}</span>, Metric:{' '}
                                          <span className="font-mono">{qsMetric}</span>
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
                      <h5 className={headerClass}>Template Pass Rates</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <tbody>
                            <tr className={rowClass}>
                              <td className={labelClass}>Overall:</td>
                              <td className={valueClass}>
                                <span
                                  className={
                                    passRate >= 90
                                      ? 'text-green-600 dark:text-green-400 font-semibold'
                                      : passRate >= 70
                                        ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
                                        : 'text-red-600 dark:text-red-400 font-semibold'
                                  }
                                >
                                  {summary.template_pass_overall?.passed ?? 0}/
                                  {summary.template_pass_overall?.total ?? 0} passed ({passRate.toFixed(1)}%)
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Replicate Statistics */}
                    {summary.replicate_stats && summary.num_replicates > 1 && (
                      <div className={sectionClass}>
                        <h5 className={headerClass}>Replicate Statistics</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              {Object.entries(summary.replicate_stats.replicate_pass_rates).map(
                                ([replicate, stats]) => (
                                  <tr key={replicate} className={rowClass}>
                                    <td className={labelClass}>Replicate {replicate}:</td>
                                    <td className={valueClass}>
                                      <span
                                        className={
                                          stats.pass_pct >= 70
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-red-600 dark:text-red-400'
                                        }
                                      >
                                        {stats.passed}/{stats.total}
                                      </span>{' '}
                                      ({stats.pass_pct.toFixed(1)}%)
                                    </td>
                                  </tr>
                                )
                              )}
                              <tr className={rowClass}>
                                <td className={labelClass}>Summary:</td>
                                <td className={valueClass}>
                                  mean={summary.replicate_stats.replicate_summary.mean.toFixed(3)}, std=
                                  {summary.replicate_stats.replicate_summary.std.toFixed(3)}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Heatmap Visualization */}
          <div>
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Question-by-Question Comparison
            </h3>

            {/* Replicate Selector */}
            {availableReplicates.length > 1 && (
              <div className="mb-4">
                <label
                  htmlFor="replicate-selector"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Select Replicate:
                </label>
                <select
                  id="replicate-selector"
                  value={selectedReplicate ?? ''}
                  onChange={(e) => setSelectedReplicate(Number(e.target.value))}
                  className="block w-48 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  {availableReplicates.map((rep) => (
                    <option key={rep} value={rep}>
                      Replicate {rep}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Click on any cell to view detailed trace</p>
            <QuestionHeatmap
              data={comparisonData.heatmap_data}
              modelKeys={selectedModels.map(getModelKey)}
              onCellClick={handleCellClick}
            />
          </div>
        </>
      )}

      {/* Detailed Trace Modal */}
      <VerificationResultDetailModal
        result={selectedResult}
        checkpoint={checkpoint}
        currentRubric={currentRubric}
        onClose={() => setSelectedResult(null)}
      />
    </div>
  );
}
