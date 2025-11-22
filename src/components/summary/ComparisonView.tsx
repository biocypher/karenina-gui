/**
 * ComparisonView - Model comparison with heatmap and side-by-side metrics
 *
 * Features:
 * - Model selector (add/remove models, default 2, max 4)
 * - Side-by-side metrics comparison table
 * - Question×Model heatmap visualization
 * - Click cells to drill down to specific results
 */

import React, { useState, useEffect } from 'react';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { QuestionHeatmap } from './QuestionHeatmap';
import { MetricCard } from './MetricCard';
import { fetchModelComparison } from '../../utils/summaryApi';
import type { VerificationResult, ModelConfig, ModelComparisonResponse } from '../../types';

interface ModelOption {
  answering_model: string;
  mcp_config: string;
  display_name: string;
}

interface ComparisonViewProps {
  results: Record<string, VerificationResult>;
  /** Callback for drill-down to specific result */
  onDrillDown?: (questionId: string, modelKey: string) => void;
}

export function ComparisonView({ results, onDrillDown }: ComparisonViewProps) {
  // Extract available models from results
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [selectedModels, setSelectedModels] = useState<ModelConfig[]>([]);
  const [parsingModel, setParsingModel] = useState<string>('');
  const [comparisonData, setComparisonData] = useState<ModelComparisonResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch comparison when models change
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
        });

        setComparisonData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [selectedModels, results, parsingModel]);

  const getModelKey = (model: ModelConfig): string => {
    return `${model.answering_model}|${model.mcp_config}`;
  };

  const formatPercent = (pct: number): string => `${pct.toFixed(1)}%`;

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
      {selectedModels.length >= 2 && comparisonData && (
        <>
          {/* Side-by-side Metrics Comparison */}
          <div>
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Metrics Comparison</h3>

            {/* Key metrics in a grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {selectedModels.map((model) => {
                const modelKey = getModelKey(model);
                const summary = comparisonData.model_summaries[modelKey];

                if (!summary) return null;

                return (
                  <div key={modelKey} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 space-y-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 truncate">
                      {model.answering_model}
                    </h4>

                    <div className="space-y-2">
                      <MetricCard value={summary.num_results} label="Total Tests" />
                      {summary.template_pass_overall && (
                        <>
                          <MetricCard
                            value={formatPercent(summary.template_pass_overall.pass_pct)}
                            label="Pass Rate"
                            bgColor={
                              summary.template_pass_overall.pass_pct >= 90
                                ? 'bg-green-50 dark:bg-green-900/20'
                                : summary.template_pass_overall.pass_pct >= 70
                                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                                  : 'bg-red-50 dark:bg-red-900/20'
                            }
                            valueColor={
                              summary.template_pass_overall.pass_pct >= 90
                                ? 'text-green-700 dark:text-green-300'
                                : summary.template_pass_overall.pass_pct >= 70
                                  ? 'text-yellow-700 dark:text-yellow-300'
                                  : 'text-red-700 dark:text-red-300'
                            }
                          />
                          <MetricCard
                            value={summary.template_pass_overall.passed}
                            label="Passed Tests"
                            subtitle={`of ${summary.template_pass_overall.total}`}
                          />
                        </>
                      )}
                      <MetricCard
                        value={summary.num_completed}
                        label="Completed"
                        subtitle={`${formatPercent((summary.num_completed / summary.num_results) * 100)}`}
                      />
                    </div>
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
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
              Click on any cell to jump to that result in the main table
            </p>
            <QuestionHeatmap
              data={comparisonData.heatmap_data}
              modelKeys={selectedModels.map(getModelKey)}
              onCellClick={onDrillDown}
            />
          </div>
        </>
      )}
    </div>
  );
}
