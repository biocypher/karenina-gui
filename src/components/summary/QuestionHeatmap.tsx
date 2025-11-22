/**
 * QuestionHeatmap - Interactive heatmap for model comparison
 *
 * Displays question×model matrix with color-coded pass/fail results.
 * Colors: Green (passed), Red (failed), Gray (not tested), Yellow (abstained)
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

export function QuestionHeatmap({ data, modelKeys, onCellClick }: QuestionHeatmapProps) {
  // Transform data for Nivo heatmap format
  const heatmapData = data.map((question) => {
    const row: Record<string, number> = {
      id: question.question_text.slice(0, 60) + '...', // Truncate for display
      question_id: question.question_id,
    };

    modelKeys.forEach((modelKey) => {
      const cell = question.results_by_model[modelKey];
      // Encode status as number for heatmap:
      // 0 = not tested, 1 = failed, 2 = abstained, 3 = passed, 4 = error
      if (!cell || cell.passed === null) {
        row[modelKey] = 0; // not tested
      } else if (cell.error) {
        row[modelKey] = 4; // error
      } else if (cell.abstained) {
        row[modelKey] = 2; // abstained
      } else if (cell.passed) {
        row[modelKey] = 3; // passed
      } else {
        row[modelKey] = 1; // failed
      }
    });

    return row;
  });

  // Custom color scale
  const getColor = (value: number): string => {
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
  };

  return (
    <div className="h-[600px] bg-white dark:bg-slate-800 rounded-lg p-4">
      <ResponsiveHeatMap
        data={heatmapData}
        keys={modelKeys}
        indexBy="id"
        margin={{ top: 60, right: 90, bottom: 60, left: 200 }}
        forceSquare={false}
        axisTop={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: -45,
          legend: '',
          legendOffset: 46,
        }}
        axisRight={null}
        axisBottom={null}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'Questions',
          legendPosition: 'middle',
          legendOffset: -180,
        }}
        cellOpacity={1}
        cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
        labelTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        colors={(cell) => getColor(cell.value as number)}
        onClick={(cell) => {
          if (onCellClick) {
            const row = heatmapData.find((r) => r.id === cell.indexValue);
            if (row && row.question_id) {
              onCellClick(row.question_id as string, cell.serieId);
            }
          }
        }}
        tooltip={({ cell }) => {
          const row = heatmapData.find((r) => r.id === cell.indexValue);
          const questionId = row?.question_id as string | undefined;
          const question = data.find((q) => q.question_id === questionId);
          const cellData = question?.results_by_model[cell.serieId];

          return (
            <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-sm mb-1">{getStatusLabel(cell.value as number)}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Model: {cell.serieId}</div>
              <div className="text-xs text-slate-600 dark:text-slate-400">Question: {cell.indexValue}</div>
              {cellData?.score !== null && cellData?.score !== undefined && (
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Rubric Score: {cellData.score.toFixed(2)}
                </div>
              )}
            </div>
          );
        }}
        theme={theme}
        animate={true}
        motionConfig="wobbly"
        role="application"
        ariaLabel="Model comparison heatmap"
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
