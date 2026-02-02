/**
 * PassRateChart - Bar chart showing template pass rates by model combination
 */

import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import { getChartTheme, ChartTooltip, MultilineTick, COMMON_LEGEND_CONFIG } from './chartTheme';

export interface PassRateData {
  combo: string;
  passed: number;
  failed: number;
  'Pass Rate': number;
}

export interface PassRateChartProps {
  data: PassRateData[];
}

export function PassRateChart({ data }: PassRateChartProps): JSX.Element | null {
  if (data.length === 0) return null;

  const theme = getChartTheme();

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Template Pass Rates by Model</h4>
      <div className="h-64 bg-white dark:bg-slate-800 rounded-lg p-4">
        <ResponsiveBar
          data={data}
          keys={['passed', 'failed']}
          indexBy="combo"
          margin={{ top: 100, right: 130, bottom: 40, left: 60 }}
          padding={0.3}
          valueScale={{ type: 'linear' }}
          indexScale={{ type: 'band', round: true }}
          colors={{ scheme: 'set2' }}
          borderColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          label={(d) => d.value.toLocaleString()}
          tooltip={({ id, value, color }) => <ChartTooltip id={id} value={value} color={color} />}
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
            legend: 'Count',
            legendPosition: 'middle',
            legendOffset: -50,
          }}
          labelSkipWidth={12}
          labelSkipHeight={12}
          labelTextColor={{
            from: 'color',
            modifiers: [['darker', 1.6]],
          }}
          legends={[COMMON_LEGEND_CONFIG]}
          role="application"
          ariaLabel="Template pass rates bar chart"
          theme={theme}
        />
      </div>
    </div>
  );
}
