/**
 * ComparisonView - Model comparison with heatmap and side-by-side metrics
 *
 * Features:
 * - Model selector (add/remove models, default 2, max 4)
 * - Side-by-side metrics comparison table
 * - Question×Model heatmap visualization
 * - Click cells to drill down to specific results
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ModelSelectorDropdown } from './ModelSelectorDropdown';
import { QuestionHeatmap } from './QuestionHeatmap';
import { QuestionTokenBarChart } from './QuestionTokenBarChart';
import { RubricTraitMenu } from './RubricTraitMenu';
import { VerificationResultDetailModal } from '../benchmark/VerificationResultDetailModal';
import { ComparisonMetricsTable, ToolUsageSection, QuestionFilters } from './comparison';
import { fetchModelComparison } from '../../utils/summaryApi';
import { logger } from '../../utils/logger';
import type {
  VerificationResult,
  ModelConfig,
  ModelComparisonResponse,
  Checkpoint,
  Rubric,
  TraitLetterMap,
  BadgeVisibilityFilter,
} from '../../types';

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

  // Question selection state
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [questionSearchText, setQuestionSearchText] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  // Rubric badge overlay state
  const [traitLetterAssignments, setTraitLetterAssignments] = useState<TraitLetterMap>({});
  const [badgeVisibilityFilter, setBadgeVisibilityFilter] = useState<BadgeVisibilityFilter>('all');

  // Tool usage section collapse state (collapsed by default)
  const [toolUsageCollapsed, setToolUsageCollapsed] = useState(true);

  // Extract rubric from results if not provided via checkpoint
  // This is needed when loading results from a file (the rubric is embedded in VerificationResult)
  const effectiveRubric = useMemo(() => {
    // Use checkpoint rubric if available
    if (currentRubric) {
      logger.debugLog('COMPARISON', 'Using currentRubric from checkpoint', 'ComparisonView', {
        llm_traits: currentRubric.llm_traits?.length,
        regex_traits: currentRubric.regex_traits?.length,
        callable_traits: currentRubric.callable_traits?.length,
      });
      return currentRubric;
    }

    // Otherwise, extract from first result that has an evaluation_rubric
    const resultWithRubric = Object.values(results).find((result) => result.rubric?.evaluation_rubric);

    const extractedRubric = resultWithRubric?.rubric?.evaluation_rubric ?? null;
    logger.debugLog('COMPARISON', 'Extracting rubric from results', 'ComparisonView', {
      hasResultWithRubric: !!resultWithRubric,
      rubricComponent: resultWithRubric?.rubric,
      extractedRubric,
      llm_traits: extractedRubric?.llm_traits?.length,
      regex_traits: extractedRubric?.regex_traits?.length,
      callable_traits: extractedRubric?.callable_traits?.length,
    });

    return extractedRubric;
  }, [currentRubric, results]);

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

    // Auto-select first model (or first 2 if available)
    if (models.length >= 1) {
      const autoSelected =
        models.length >= 2
          ? [
              { answering_model: models[0].answering_model, mcp_config: models[0].mcp_config },
              { answering_model: models[1].answering_model, mcp_config: models[1].mcp_config },
            ]
          : [{ answering_model: models[0].answering_model, mcp_config: models[0].mcp_config }];
      setSelectedModels(autoSelected);
    }
  }, [results, parsingModel]);

  // Fetch comparison when models or replicate changes
  useEffect(() => {
    if (selectedModels.length < 1) {
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

        logger.debugLog('COMPARISON', 'Comparison data received', 'ComparisonView', {
          hasData: !!data,
          hasHeatmapData: !!data?.heatmap_data,
          heatmapLength: data?.heatmap_data?.length,
          modelSummaries: data?.model_summaries ? Object.keys(data.model_summaries) : [],
        });

        logger.debugLog('COMPARISON', 'Detailed heatmap data', 'ComparisonView', {
          sampleQuestion: data.heatmap_data[0],
          allModelKeysInData: data.heatmap_data[0]?.results_by_model
            ? Object.keys(data.heatmap_data[0].results_by_model)
            : [],
        });

        logger.debugLog('COMPARISON', 'Selected models', 'ComparisonView', {
          selectedModels,
          generatedModelKeys: selectedModels.map((m) => `${m.answering_model}|${m.mcp_config}`),
        });

        // Validate the response has required data
        if (!data || !data.heatmap_data || !Array.isArray(data.heatmap_data)) {
          logger.error('COMPARISON', 'Invalid comparison data', 'ComparisonView', { data });
          setError('Invalid comparison data received from server');
          return;
        }

        setComparisonData(data);
      } catch (err) {
        logger.error('COMPARISON', 'Comparison fetch error', 'ComparisonView', { error: err });
        setError(err instanceof Error ? err.message : 'Failed to fetch comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [selectedModels, results, parsingModel]);

  // Notify parent when comparison data changes
  useEffect(() => {
    if (onComparisonDataChange) {
      onComparisonDataChange(comparisonData);
    }
  }, [comparisonData, onComparisonDataChange]);

  // Extract available questions and auto-select all when data changes
  const availableQuestions = useMemo(() => {
    if (!comparisonData?.heatmap_data) return [];
    return comparisonData.heatmap_data.map((q) => ({
      id: q.question_id,
      text: q.question_text,
      keywords: q.keywords || [],
    }));
  }, [comparisonData]);

  // Extract all unique keywords from questions
  const availableKeywords = useMemo(() => {
    const keywordSet = new Set<string>();
    availableQuestions.forEach((q) => {
      q.keywords.forEach((keyword) => keywordSet.add(keyword));
    });
    return Array.from(keywordSet).sort();
  }, [availableQuestions]);

  // Auto-select all questions when available questions change
  useEffect(() => {
    if (availableQuestions.length > 0) {
      setSelectedQuestions(new Set(availableQuestions.map((q) => q.id)));
    }
  }, [availableQuestions]);

  // Filter questions based on search text and selected keywords
  const filteredQuestions = useMemo(() => {
    let filtered = availableQuestions;

    // Filter by search text
    if (questionSearchText) {
      const searchLower = questionSearchText.toLowerCase();
      filtered = filtered.filter((q) => q.text.toLowerCase().includes(searchLower));
    }

    // Filter by selected keywords (question must have at least one of the selected keywords)
    if (selectedKeywords.size > 0) {
      filtered = filtered.filter((q) => q.keywords.some((keyword) => selectedKeywords.has(keyword)));
    }

    return filtered;
  }, [availableQuestions, questionSearchText, selectedKeywords]);

  // Filter heatmap and token data based on selected questions
  const filteredHeatmapData = useMemo(() => {
    if (!comparisonData?.heatmap_data) return [];
    return comparisonData.heatmap_data.filter((q) => selectedQuestions.has(q.question_id));
  }, [comparisonData, selectedQuestions]);

  const filteredTokenData = useMemo(() => {
    if (!comparisonData?.question_token_data) return [];
    return comparisonData.question_token_data.filter((q) => selectedQuestions.has(q.question_id));
  }, [comparisonData, selectedQuestions]);

  const getModelKey = (model: ModelConfig): string => {
    return `${model.answering_model}|${model.mcp_config}`;
  };

  // Question selection handlers - operate on filtered questions only
  const handleSelectAllQuestions = () => {
    // Select all currently visible (filtered) questions, preserving selections outside the filter
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      filteredQuestions.forEach((q) => newSet.add(q.id));
      return newSet;
    });
  };

  const handleSelectNoneQuestions = () => {
    // Deselect all currently visible (filtered) questions, preserving selections outside the filter
    setSelectedQuestions((prev) => {
      const filteredIds = new Set(filteredQuestions.map((q) => q.id));
      const newSet = new Set(prev);
      filteredIds.forEach((id) => newSet.delete(id));
      return newSet;
    });
  };

  const handleToggleQuestion = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  // Keyword selection handlers
  const handleToggleKeyword = (keyword: string) => {
    // Check if we're adding the first keyword (transitioning from no filter to filtered)
    const isAddingFirstKeyword = selectedKeywords.size === 0 && !selectedKeywords.has(keyword);

    setSelectedKeywords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keyword)) {
        newSet.delete(keyword);
      } else {
        newSet.add(keyword);
      }
      return newSet;
    });

    // Auto-deselect all questions when first keyword is selected
    if (isAddingFirstKeyword) {
      setSelectedQuestions(new Set());
    }
  };

  const handleClearKeywords = () => {
    setSelectedKeywords(new Set());
  };

  // Clear all filters (search text and keywords) and re-select all questions
  const handleClearAllFilters = () => {
    setQuestionSearchText('');
    setSelectedKeywords(new Set());
    setSelectedQuestions(new Set(availableQuestions.map((q) => q.id)));
  };

  // Handle heatmap cell click - find and display the result
  const handleCellClick = (questionId: string, modelKey: string, replicate?: number) => {
    // Find the matching result for the specified replicate
    const matchingResult = Object.values(results).find((result) => {
      if (result.metadata.question_id !== questionId) return false;
      if (result.metadata.parsing_model !== parsingModel) return false;
      if (replicate !== undefined && result.metadata.replicate !== replicate) return false;

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
      logger.warning('COMPARISON', 'No matching result found', 'ComparisonView', { questionId, modelKey, replicate });
    }
  };

  // Handler for rubric trait letter assignment
  const handleAssignLetter = useCallback(
    (traitName: string, traitType: 'llm' | 'regex' | 'callable', kind: 'boolean' | 'score', letters: string | null) => {
      setTraitLetterAssignments((prev) => {
        if (letters === null) {
          // Remove assignment - create new object without the trait
          const newAssignments = { ...prev };
          delete newAssignments[traitName];
          return newAssignments;
        }
        return {
          ...prev,
          [traitName]: { traitName, traitType, kind, letters },
        };
      });
    },
    []
  );

  // Handler for badge visibility change
  const handleVisibilityChange = useCallback((filter: BadgeVisibilityFilter) => {
    setBadgeVisibilityFilter(filter);
  }, []);

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

      {/* Show visualizations if at least 1 model selected */}
      {selectedModels.length >= 1 && comparisonData && comparisonData.heatmap_data && (
        <>
          {/* Side-by-side Detailed Metrics Comparison */}
          <div>
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">Metrics Comparison</h3>
            <ComparisonMetricsTable selectedModels={selectedModels} comparisonData={comparisonData} />
          </div>

          {/* Tool Usage Statistics - Collapsible Section */}
          <ToolUsageSection
            selectedModels={selectedModels}
            comparisonData={comparisonData}
            collapsed={toolUsageCollapsed}
            onToggle={() => setToolUsageCollapsed(!toolUsageCollapsed)}
          />

          {/* Heatmap Visualization */}
          <div>
            <h3 className="text-md font-semibold text-slate-800 dark:text-slate-200 mb-3">
              Question-by-Question Comparison
            </h3>

            {/* Question and Keyword Filters */}
            <QuestionFilters
              availableQuestions={availableQuestions}
              filteredQuestions={filteredQuestions}
              selectedQuestions={selectedQuestions}
              selectedKeywords={selectedKeywords}
              availableKeywords={availableKeywords}
              questionSearchText={questionSearchText}
              onSearchTextChange={setQuestionSearchText}
              onSelectAll={handleSelectAllQuestions}
              onSelectNone={handleSelectNoneQuestions}
              onToggleQuestion={handleToggleQuestion}
              onToggleKeyword={handleToggleKeyword}
              onClearKeywords={handleClearKeywords}
              onClearAllFilters={handleClearAllFilters}
            />

            {/* Rubric Trait Badge Menu */}
            <RubricTraitMenu
              rubric={effectiveRubric}
              letterAssignments={traitLetterAssignments}
              visibilityFilter={badgeVisibilityFilter}
              onAssignLetter={handleAssignLetter}
              onVisibilityChange={handleVisibilityChange}
            />

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">Click on any cell to view detailed trace</p>
            <QuestionHeatmap
              data={filteredHeatmapData}
              modelKeys={selectedModels.map(getModelKey)}
              onCellClick={handleCellClick}
              letterAssignments={traitLetterAssignments}
              visibilityFilter={badgeVisibilityFilter}
            />

            {/* Token Usage per Question */}
            {filteredTokenData.length > 0 && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Token Usage per Question
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  Bar charts show median token usage across all replicates with error bars indicating standard
                  deviation.
                </p>
                <div className="space-y-8">
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Input Tokens</h4>
                    <QuestionTokenBarChart
                      data={filteredTokenData}
                      selectedModels={selectedModels.map(getModelKey)}
                      tokenType="input"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Output Tokens</h4>
                    <QuestionTokenBarChart
                      data={filteredTokenData}
                      selectedModels={selectedModels.map(getModelKey)}
                      tokenType="output"
                    />
                  </div>
                </div>
              </div>
            )}
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
