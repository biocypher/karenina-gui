/**
 * TokenUsageByModelChart - Bar chart showing token usage by model combination
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { getChartTheme, ChartTooltip, MultilineTick, COMMON_LEGEND_CONFIG, formatLargeNumber } from './chartTheme';

export interface TokenUsageByModelData {
  combo: string;
  input: number;
  output: number;
}

export interface TokenUsageByModelChartProps {
  data: TokenUsageByModelData[];
}

export function TokenUsageByModelChart({ data }: TokenUsageByModelChartProps): JSX.Element | null {
  if (data.length === 0) return null;

  const theme = getChartTheme();

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Token Usage by Model</h4>
      <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
        <ResponsiveBar
          data={data}
          keys={['input', 'output']}
          indexBy="combo"
          margin={{ top: 120, right: 130, bottom: 40, left: 80 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'category10' }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          label={(d) => d.value.toLocaleString()}
          tooltip={({ id, value, color }) => (
            <ChartTooltip id={id} value={value} color={color} formatValue={(v) => `${formatLargeNumber(v)} tokens`} />
          )}
          axisTop={{
            tickSize: 0,
            tickPadding: 50,
            tickRotation: 0,
            legend: '',
            legendOffset: 0,
            renderTick: (tick) => <MultilineTick x={tick.x} y={tick.y - 50} value={tick.value} />,
          }}
          axisRight={null}
          axisBottom={null}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Tokens',
            legendPosition: 'middle',
            legendOffset: -60,
            format: formatLargeNumber,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          legends={[COMMON_LEGEND_CONFIG]}
          role="application"
          ariaLabel="Total token usage bar chart"
          theme={theme}
        />
      </div>
    </div>
  );
}
