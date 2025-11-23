/**
 * QuestionHeatmap - Interactive heatmap for model comparison
 *
 * Displays question×model matrix with color-coded pass/fail results.
 * Colors: Green (passed), Red (failed), Gray (not tested), Yellow (abstained), Orange (error)
 * Interactive: Click cell to drill down to specific result
 */

import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import type { HeatmapQuestion } from '../../types';

interface QuestionHeatmapProps {
  data: HeatmapQuestion[];
  modelKeys: string[];
  onCellClick?: (questionId: string, modelKey: string) => void;
}

export function QuestionHeatmap({ data, modelKeys }: QuestionHeatmapProps) {
  // Safety checks
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="h-[600px] bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">No data available for comparison</p>
      </div>
    );
  }

  if (!modelKeys || !Array.isArray(modelKeys) || modelKeys.length === 0) {
    return (
      <div className="h-[600px] bg-white dark:bg-slate-800 rounded-lg p-4 flex items-center justify-center">
        <p className="text-slate-600 dark:text-slate-400">No models selected for comparison</p>
      </div>
    );
  }

  // Transform data to Nivo's expected format:
  // [{ id: string, data: [{ x: string, y: number }] }]
  const heatmapData = data.map((question) => {
    const questionLabel = question.question_text.slice(0, 60) + '...';

    return {
      id: questionLabel,
      data: modelKeys.map((modelKey) => {
        const cell = question.results_by_model?.[modelKey];

        // Encode status as number:
        // 0 = not tested, 1 = failed, 2 = abstained, 3 = passed, 4 = error
        let status: number;
        if (!cell || cell.passed === null) {
          status = 0;
        } else if (cell.error) {
          status = 4;
        } else if (cell.abstained) {
          status = 2;
        } else if (cell.passed) {
          status = 3;
        } else {
          status = 1;
        }

        return {
          x: modelKey,
          y: status,
        };
      }),
    };
  });

  // Custom color scale based on status
  const getColor = (cell: { data?: { y?: number } }): string => {
    const value = cell.data?.y ?? 0;
    switch (value) {
      case 0:
        return '#94a3b8'; // Gray - not tested
      case 1:
        return '#ef4444'; // Red - failed
      case 2:
        return '#eab308'; // Yellow - abstained
      case 3:
        return '#22c55e'; // Green - passed
      case 4:
        return '#f97316'; // Orange - error
      default:
        return '#94a3b8';
    }
  };

  const getStatusLabel = (value: number): string => {
    switch (value) {
      case 0:
        return 'Not Tested';
      case 1:
        return 'Failed';
      case 2:
        return 'Abstained';
      case 3:
        return 'Passed';
      case 4:
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  // Extract model label from key (format: "model|mcp_config")
  const getModelLabel = (modelKey: string): string => {
    const parts = modelKey.split('|');
    const modelName = parts[0] || modelKey;
    const mcpConfig = parts[1];

    if (mcpConfig && mcpConfig !== '[]') {
      try {
        const mcpServers = JSON.parse(mcpConfig);
        if (Array.isArray(mcpServers) && mcpServers.length > 0) {
          return `${modelName}\n(${mcpServers.join(', ')})`;
        }
      } catch {
        // If parsing fails, just return model name
      }
    }
    return modelName;
  };

  const isDark = document.documentElement.classList.contains('dark');
  const theme = {
    text: {
      fill: isDark ? '#e2e8f0' : '#1e293b',
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
    grid: {
      line: {
        stroke: isDark ? '#334155' : '#cbd5e1',
      },
    },
  };

  return (
    <div className="h-[600px] bg-white dark:bg-slate-800 rounded-lg p-4">
      <ResponsiveHeatMap
        data={heatmapData}
        margin={{ top: 100, right: 90, bottom: 60, left: 240 }}
        valueFormat=">-.0f"
        colors={getColor}
        emptyColor="#555555"
        axisTop={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: -45,
          legend: '',
          legendOffset: 0,
          format: (value) => getModelLabel(value as string),
        }}
        axisRight={null}
        axisBottom={null}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: -200,
        }}
        labelTextColor="white"
        enableLabels={false}
        tooltip={({ cell }) => {
          const status = cell.data?.y ?? 0;
          return (
            <div
              style={{
                background: isDark ? '#1e293b' : '#ffffff',
                color: isDark ? '#e2e8f0' : '#1e293b',
                padding: '9px 12px',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{cell.serieId}</div>
              <div style={{ fontSize: '11px', marginBottom: '2px' }}>Model: {getModelLabel(cell.data.x as string)}</div>
              <div style={{ fontSize: '11px', fontWeight: 600 }}>
                Status: <span style={{ color: getColor(cell) }}>{getStatusLabel(status)}</span>
              </div>
            </div>
          );
        }}
        theme={theme}
      />

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
    </div>
  );
}
