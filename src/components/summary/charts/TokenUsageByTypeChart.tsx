/**
 * TokenUsageByTypeChart - Bar chart showing token usage by evaluation type
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { getChartTheme, ChartTooltip, COMMON_LEGEND_CONFIG, formatLargeNumber } from './chartTheme';

export interface TokenUsageByTypeData {
  type: string;
  input: number;
  output: number;
}

export interface TokenUsageByTypeChartProps {
  data: TokenUsageByTypeData[];
}

export function TokenUsageByTypeChart({ data }: TokenUsageByTypeChartProps): JSX.Element {
  const theme = getChartTheme();

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Token Usage by Evaluation Type</h4>
      <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
        <ResponsiveBar
          data={data}
          keys={['input', 'output']}
          indexBy="type"
          margin={{ top: 20, right: 130, bottom: 50, left: 80 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'nivo' }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          label={(d) => d.value.toLocaleString()}
          tooltip={({ id, value, color }) => <ChartTooltip id={id} value={value} color={color} />}
          axisTop={null}
          axisRight={null}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Evaluation Type',
            legendPosition: 'middle',
            legendOffset: 40,
          }}
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
          ariaLabel="Token usage bar chart"
          theme={theme}
        />
      </div>
    </div>
  );
}
