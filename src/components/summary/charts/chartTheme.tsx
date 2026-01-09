/**
 * Chart Theme Configuration
 *
 * Provides consistent Nivo chart theming with dark mode support.
 * Extracted from SummaryCharts.tsx to reduce duplication.
 */

import React from 'react';
import type { Theme } from '@nivo/core';

/**
 * Check if dark mode is currently active
 */
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Get the chart theme based on current dark mode state
 */
export function getChartTheme(): Theme {
  const dark = isDarkMode();
  return {
    text: {
      fill: dark ? '#e2e8f0' : '#1e293b',
    },
    grid: {
      line: {
        stroke: dark ? '#334155' : '#cbd5e1',
      },
    },
    axis: {
      ticks: {
        text: {
          fill: dark ? '#cbd5e1' : '#475569',
        },
      },
      legend: {
        text: {
          fill: dark ? '#e2e8f0' : '#1e293b',
        },
      },
    },
    tooltip: {
      container: {
        background: dark ? '#1e293b' : '#ffffff',
        color: dark ? '#e2e8f0' : '#1e293b',
        fontSize: '12px',
        borderRadius: '6px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
    },
  };
}

/**
 * Common tooltip styles for chart tooltips
 */
export function getTooltipStyles() {
  const dark = isDarkMode();
  return {
    background: dark ? '#1e293b' : '#ffffff',
    color: dark ? '#e2e8f0' : '#1e293b',
    padding: '9px 12px',
    borderRadius: '6px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  };
}

/**
 * Custom tooltip renderer with color border
 */
export interface ChartTooltipProps {
  id: string;
  value: number;
  color: string;
  label?: string;
  formatValue?: (value: number) => string;
}

export function ChartTooltip({ id, value, color, label, formatValue }: ChartTooltipProps): JSX.Element {
  const styles = getTooltipStyles();
  const displayValue = formatValue ? formatValue(value) : value.toLocaleString();

  return (
    <div style={{ ...styles, border: `2px solid ${color}` }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{label || id}</div>
      <div style={{ fontSize: '12px' }}>{displayValue}</div>
    </div>
  );
}

/**
 * Tick text color based on dark mode
 */
export function getTickColor(): string {
  return isDarkMode() ? '#cbd5e1' : '#475569';
}

/**
 * Multiline tick renderer for chart axes
 * Used to display model combo information with line breaks
 */
export interface MultilineTickProps {
  x: number;
  y: number;
  value: string;
}

export function MultilineTick({ x, y, value }: MultilineTickProps): JSX.Element {
  const lines = value.split('\n');
  const tickColor = getTickColor();

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fill: tickColor,
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      >
        {lines.map((line, i) => (
          <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

/**
 * Common Nivo legend configuration
 */
export const COMMON_LEGEND_CONFIG = {
  dataFrom: 'keys' as const,
  anchor: 'bottom-right' as const,
  direction: 'column' as const,
  justify: false,
  translateX: 120,
  translateY: 0,
  itemsSpacing: 2,
  itemWidth: 100,
  itemHeight: 20,
  itemDirection: 'left-to-right' as const,
  itemOpacity: 0.85,
  symbolSize: 20,
  effects: [
    {
      on: 'hover' as const,
      style: {
        itemOpacity: 1,
      },
    },
  ],
};

/**
 * Format large numbers with K/M suffixes
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}
