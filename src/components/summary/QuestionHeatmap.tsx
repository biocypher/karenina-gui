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

export function QuestionHeatmap({ data, modelKeys, onCellClick }: QuestionHeatmapProps) {
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

  // Helper to wrap text into multiple lines
  const wrapText = (text: string, maxLength: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).trim().length <= maxLength) {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  };

  // Transform data to Nivo's expected format:
  // [{ id: string, data: [{ x: string, y: number }] }]
  // Store mapping of question IDs to full text and actual IDs for labels and click handling
  const questionIdToText = new Map<string, string>();
  const questionIdToActualId = new Map<string, string>();

  // Reverse the data array since Nivo renders from bottom to top
  const heatmapData = [...data].reverse().map((question, index) => {
    // Use simple numeric ID for Nivo, store full text and actual ID separately
    const questionId = `q${index}`;
    questionIdToText.set(questionId, question.question_text);
    questionIdToActualId.set(questionId, question.question_id);

    return {
      id: questionId,
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
        stroke: isDark ? '#475569' : '#94a3b8',
        strokeWidth: 1,
      },
    },
  };

  // Calculate dynamic height based on number of questions
  const cellHeight = 35; // Height per question row
  const minHeight = 400;
  const calculatedHeight = Math.max(minHeight, data.length * cellHeight + 200);

  return (
    <div
      style={{ height: `${calculatedHeight}px` }}
      className={`bg-white dark:bg-slate-800 rounded-lg p-4 ${onCellClick ? 'cursor-pointer' : ''}`}
    >
      <ResponsiveHeatMap
        data={heatmapData}
        margin={{ top: 160, right: 90, bottom: 60, left: 350 }}
        valueFormat=">-.0f"
        colors={getColor}
        emptyColor="#555555"
        cellOpacity={1}
        cellBorderWidth={1}
        cellBorderColor={isDark ? '#334155' : '#cbd5e1'}
        hoverTarget="cell"
        animate={false}
        axisTop={{
          tickSize: 5,
          tickPadding: 20,
          tickRotation: -45,
          legend: '',
          legendOffset: 0,
          renderTick: (tick) => {
            const label = getModelLabel(tick.value as string);
            const lines = label.split('\n');

            return (
              <g transform={`translate(${tick.x},${tick.y - 10})`}>
                <line x1="0" x2="0" y1="10" y2="15" style={{ stroke: isDark ? '#cbd5e1' : '#475569' }} />
                <text
                  textAnchor="start"
                  dominantBaseline="middle"
                  transform="rotate(-45)"
                  style={{
                    fill: isDark ? '#e2e8f0' : '#1e293b',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x="10" dy={i === 0 ? 0 : 16}>
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
          tickPadding: 15,
          tickRotation: 0,
          legend: '',
          legendPosition: 'middle',
          legendOffset: -200,
          renderTick: (tick) => {
            // Get full question text from mapping
            const fullText = questionIdToText.get(tick.value as string) || (tick.value as string);
            const lines = wrapText(fullText, 50);
            const lineHeight = 14;
            const totalHeight = lines.length * lineHeight;
            const startY = tick.y - totalHeight / 2;

            return (
              <g transform={`translate(${tick.x - 10},${startY})`}>
                <text
                  textAnchor="end"
                  dominantBaseline="hanging"
                  style={{
                    fill: isDark ? '#cbd5e1' : '#475569',
                    fontSize: '13px',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}
                >
                  {lines.map((line, i) => (
                    <tspan key={i} x="0" dy={i === 0 ? 0 : lineHeight}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          },
        }}
        labelTextColor="white"
        enableLabels={false}
        onClick={(cell) => {
          if (onCellClick) {
            const questionNumericId = cell.serieId as string;
            const actualQuestionId = questionIdToActualId.get(questionNumericId);
            const modelKey = cell.data.x as string;

            if (actualQuestionId) {
              onCellClick(actualQuestionId, modelKey);
            }
          }
        }}
        tooltip={({ cell }) => {
          const status = cell.data?.y ?? 0;
          // Get full question text from mapping
          const fullQuestionText = questionIdToText.get(cell.serieId as string) || cell.serieId;

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
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{fullQuestionText}</div>
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
