/**
 * QuestionHeatmap - Interactive heatmap for model comparison
 *
 * Displays question×model×replicate matrix with color-coded pass/fail results.
 * Colors: Green (passed), Red (failed), Gray (not tested), Yellow (abstained), Orange (error)
 * Interactive: Click cell to drill down to specific result
 * Features hierarchical column headers: Model + MCP (top), Replicate (bottom)
 */

import React, { useState } from 'react';
import type { HeatmapQuestion, HeatmapCell } from '../../types';

interface QuestionHeatmapProps {
  data: HeatmapQuestion[];
  modelKeys: string[];
  onCellClick?: (questionId: string, modelKey: string, replicate?: number) => void;
}

interface FlattenedColumn {
  modelKey: string;
  modelLabel: string;
  replicate: number;
  replicateLabel: string;
}

interface TooltipData {
  executionType: string;
  inputTokens: number;
  outputTokens: number;
  iterations: number;
  x: number;
  y: number;
}

export function QuestionHeatmap({ data, modelKeys, onCellClick }: QuestionHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Safety checks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-600 dark:text-slate-400">No data available for comparison</p>
      </div>
    );
  }

  if (!modelKeys || !Array.isArray(modelKeys) || modelKeys.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-center min-h-[400px]">
        <p className="text-slate-600 dark:text-slate-400">No models selected for comparison</p>
      </div>
    );
  }

  // Extract model label from key (format: "model|mcp_config")
  const getModelLabel = (modelKey: string): { name: string; mcpLabel: string } => {
    const parts = modelKey.split('|');
    const modelName = parts[0] || modelKey;
    const mcpConfig = parts[1];

    let mcpLabel = '';
    if (mcpConfig && mcpConfig !== '[]') {
      try {
        const mcpServers = JSON.parse(mcpConfig);
        if (Array.isArray(mcpServers) && mcpServers.length > 0) {
          mcpLabel = `(${mcpServers.join(', ')})`;
        }
      } catch {
        // If parsing fails, no MCP label
      }
    }

    return { name: modelName, mcpLabel };
  };

  // Get color for cell status
  const getCellColor = (cell: HeatmapCell | undefined): string => {
    if (!cell || cell.passed === null) {
      return '#94a3b8'; // Gray - not tested
    } else if (cell.error) {
      return '#f97316'; // Orange - error
    } else if (cell.abstained) {
      return '#eab308'; // Yellow - abstained
    } else if (cell.passed) {
      return '#22c55e'; // Green - passed
    } else {
      return '#ef4444'; // Red - failed
    }
  };

  // Flatten replicates into columns grouped by model
  const flattenedColumns: FlattenedColumn[] = [];
  const modelReplicateCounts = new Map<string, number>();

  // First pass: determine replicate count for each model
  for (const modelKey of modelKeys) {
    let maxReplicates = 0;
    for (const question of data) {
      const modelData = question.results_by_model[modelKey];
      if (modelData && modelData.replicates) {
        maxReplicates = Math.max(maxReplicates, modelData.replicates.length);
      }
    }
    modelReplicateCounts.set(modelKey, maxReplicates);
  }

  // Second pass: create flattened columns
  for (const modelKey of modelKeys) {
    const modelLabel = getModelLabel(modelKey);
    const replicateCount = modelReplicateCounts.get(modelKey) || 0;

    for (let i = 0; i < replicateCount; i++) {
      flattenedColumns.push({
        modelKey,
        modelLabel: modelLabel.name + (modelLabel.mcpLabel ? ` ${modelLabel.mcpLabel}` : ''),
        replicate: i,
        replicateLabel: `Rep ${i + 1}`,
      });
    }
  }

  // Get cell for a specific question, model, and replicate
  const getCell = (question: HeatmapQuestion, modelKey: string, replicateIndex: number): HeatmapCell | undefined => {
    const modelData = question.results_by_model[modelKey];
    if (!modelData || !modelData.replicates) return undefined;
    return modelData.replicates[replicateIndex];
  };

  // Handle cell click
  const handleCellClick = (questionId: string, modelKey: string, replicate: number) => {
    if (onCellClick) {
      onCellClick(questionId, modelKey, replicate + 1); // Convert 0-indexed to 1-indexed
    }
  };

  // Handle mouse enter for tooltip
  const handleMouseEnter = (e: React.MouseEvent, cell: HeatmapCell | undefined) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      executionType: cell?.execution_type || 'Unknown',
      inputTokens: cell?.input_tokens || 0,
      outputTokens: cell?.output_tokens || 0,
      iterations: cell?.iterations || 0,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  // Handle mouse leave for tooltip
  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Helper to truncate long question text
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Group columns by model for hierarchical header
  const modelGroups: { modelKey: string; modelLabel: string; columns: FlattenedColumn[] }[] = [];
  let currentModelKey: string | null = null;
  let currentGroup: FlattenedColumn[] = [];

  for (const col of flattenedColumns) {
    if (col.modelKey !== currentModelKey) {
      if (currentModelKey !== null) {
        modelGroups.push({
          modelKey: currentModelKey,
          modelLabel:
            getModelLabel(currentModelKey).name +
            (getModelLabel(currentModelKey).mcpLabel ? ` ${getModelLabel(currentModelKey).mcpLabel}` : ''),
          columns: currentGroup,
        });
      }
      currentModelKey = col.modelKey;
      currentGroup = [col];
    } else {
      currentGroup.push(col);
    }
  }
  // Push last group
  if (currentModelKey !== null) {
    modelGroups.push({
      modelKey: currentModelKey,
      modelLabel:
        getModelLabel(currentModelKey).name +
        (getModelLabel(currentModelKey).mcpLabel ? ` ${getModelLabel(currentModelKey).mcpLabel}` : ''),
      columns: currentGroup,
    });
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
      {/* Scrollable table container */}
      <div className="overflow-x-auto overflow-y-auto max-h-[800px] border border-slate-300 dark:border-slate-600 rounded-lg">
        <table className="w-full border-collapse">
          {/* Hierarchical header */}
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700">
            {/* Top header: Model + MCP */}
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 text-left font-semibold text-sm text-slate-900 dark:text-slate-100">
                Question
              </th>
              {modelGroups.map((group, groupIdx) => (
                <React.Fragment key={group.modelKey}>
                  <th
                    colSpan={group.columns.length}
                    className="border border-slate-300 dark:border-slate-600 px-4 py-2 text-center font-semibold text-sm text-slate-900 dark:text-slate-100"
                  >
                    {group.modelLabel}
                  </th>
                  {/* Spacer column between model groups */}
                  {groupIdx < modelGroups.length - 1 && (
                    <th className="bg-slate-100 dark:bg-slate-700 w-2 border-0 p-0" />
                  )}
                </React.Fragment>
              ))}
            </tr>

            {/* Bottom header: Replicate labels */}
            <tr>
              <th className="sticky left-0 z-20 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-1 text-left font-medium text-xs text-slate-700 dark:text-slate-300"></th>
              {flattenedColumns.map((col, idx) => {
                const isLastInGroup =
                  idx === flattenedColumns.length - 1 || flattenedColumns[idx + 1]?.modelKey !== col.modelKey;

                return (
                  <React.Fragment key={`${col.modelKey}-${col.replicate}-${idx}`}>
                    <th className="border border-slate-300 dark:border-slate-600 px-2 py-1 text-center font-medium text-xs text-slate-700 dark:text-slate-300 min-w-[60px]">
                      {col.replicateLabel}
                    </th>
                    {/* Spacer column between model groups */}
                    {isLastInGroup && idx < flattenedColumns.length - 1 && (
                      <th className="bg-slate-100 dark:bg-slate-700 w-2 border-0 p-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          {/* Data rows */}
          <tbody>
            {data.map((question) => (
              <tr key={question.question_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                {/* Question text (sticky left column) */}
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[300px]">
                  <div className="truncate" title={question.question_text}>
                    {truncateText(question.question_text, 80)}
                  </div>
                </td>

                {/* Cell data for each replicate */}
                {flattenedColumns.map((col, colIdx) => {
                  const cell = getCell(question, col.modelKey, col.replicate);
                  const color = getCellColor(cell);

                  // Determine if this is the last column of a model group (for spacing)
                  const isLastInGroup =
                    colIdx === flattenedColumns.length - 1 || flattenedColumns[colIdx + 1]?.modelKey !== col.modelKey;

                  return (
                    <React.Fragment key={`${question.question_id}-${col.modelKey}-${col.replicate}-${colIdx}`}>
                      <td
                        className={`border border-slate-300 dark:border-slate-600 p-0 ${onCellClick ? 'cursor-pointer' : ''}`}
                        onClick={() => handleCellClick(question.question_id, col.modelKey, col.replicate)}
                        onMouseEnter={(e) => handleMouseEnter(e, cell)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div
                          className="w-full h-full min-h-[50px] transition-opacity hover:opacity-80"
                          style={{ backgroundColor: color }}
                        />
                      </td>
                      {/* Spacer column between model groups */}
                      {isLastInGroup && colIdx < flattenedColumns.length - 1 && (
                        <td className="bg-white dark:bg-slate-800 w-2 border-0 p-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-slate-600 dark:text-slate-400">Passed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-slate-600 dark:text-slate-400">Failed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
          <span className="text-slate-600 dark:text-slate-400">Abstained</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
          <span className="text-slate-600 dark:text-slate-400">Error</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#94a3b8' }} />
          <span className="text-slate-600 dark:text-slate-400">Not Tested</span>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-slate-900 dark:bg-slate-800 text-white dark:text-slate-100 px-3 py-2 rounded-lg shadow-lg text-xs max-w-md">
            <div className="font-semibold mb-2 text-slate-100">Execution Details</div>
            <div className="space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Type:</span>
                <span className="font-medium">{tooltip.executionType}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Input Tokens:</span>
                <span className="font-medium">{tooltip.inputTokens.toLocaleString()}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Output Tokens:</span>
                <span className="font-medium">{tooltip.outputTokens.toLocaleString()}</span>
              </div>
              {tooltip.iterations > 0 && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Iterations:</span>
                  <span className="font-medium">{tooltip.iterations}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
