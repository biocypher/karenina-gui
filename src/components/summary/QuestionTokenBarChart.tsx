import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ErrorBar, ResponsiveContainer } from 'recharts';
import type { QuestionTokenData } from '../../types';

interface Props {
  data: QuestionTokenData[];
  selectedModels: string[];
  tokenType: 'input' | 'output';
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const QuestionTokenBarChart: React.FC<Props> = ({ data, selectedModels, tokenType }) => {
  const isDark = document.documentElement.classList.contains('dark');

  // Transform data for Recharts format
  // Filter to only include models that are selected
  const chartData = data.map((question) => {
    const dataPoint: Record<string, string | number> = {
      question: question.question_text,
      question_id: question.question_id,
    };

    // Only include selected models
    const selectedModelData = question.models.filter((model) => selectedModels.includes(model.model_key));

    selectedModelData.forEach((model) => {
      const key = model.model_key;
      const displayName = model.model_display_name;

      if (tokenType === 'input') {
        dataPoint[key] = model.input_tokens_median;
        dataPoint[`${key}_error`] = model.input_tokens_std;
        dataPoint[`${key}_name`] = displayName;
      } else {
        dataPoint[key] = model.output_tokens_median;
        dataPoint[`${key}_error`] = model.output_tokens_std;
        dataPoint[`${key}_name`] = displayName;
      }
    });

    return dataPoint;
  });

  // Debug logging
  console.log('QuestionTokenBarChart Debug:', {
    tokenType,
    dataLength: data.length,
    selectedModels,
    chartDataSample: chartData[0],
    allChartData: chartData,
  });

  // Calculate dynamic height based on number of questions
  const heightPerQuestion = 140; // Match heatmap cell height
  const minHeight = 400;
  const maxHeight = 2400;
  const calculatedHeight = Math.max(minHeight, Math.min(maxHeight, data.length * heightPerQuestion + 100));

  // Custom tooltip
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      dataKey: string;
      value: number;
      color: string;
      payload: Record<string, string | number>;
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 shadow-lg">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">{data.question}</p>
          {payload.map((entry, index: number) => {
            const modelKey = entry.dataKey;
            const errorKey = `${modelKey}_error`;
            const nameKey = `${modelKey}_name`;
            const value = entry.value;
            const error = data[errorKey];
            const name = data[nameKey] || modelKey;

            return (
              <div key={index} className="text-xs" style={{ color: entry.color }}>
                <span className="font-medium">{name}:</span> {value.toLocaleString()} ± {Number(error).toLocaleString()} tokens
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
        No token data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={calculatedHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
          <XAxis
            type="number"
            domain={[0, 'auto']}
            tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 11 }}
            tickFormatter={(value) => value.toLocaleString()}
            label={{
              value: `${tokenType === 'input' ? 'Input' : 'Output'} Tokens`,
              position: 'insideBottom',
              offset: -10,
              style: { fill: isDark ? '#cbd5e1' : '#475569', fontSize: 12 },
            }}
          />
          <YAxis
            type="category"
            dataKey="question"
            width={350}
            tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 13, fontFamily: 'system-ui, -apple-system, sans-serif' }}
            interval={0}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            formatter={(value: string) => {
              // Extract model display name from model_key
              const displayName = chartData[0]?.[`${value}_name`] || value.split('|')[0];
              return <span className="text-xs">{displayName}</span>;
            }}
          />
          {selectedModels.map((modelKey, idx) => (
            <Bar key={modelKey} dataKey={modelKey} fill={COLORS[idx % COLORS.length]} name={modelKey} barSize={40}>
              <ErrorBar dataKey={`${modelKey}_error`} width={4} strokeWidth={1.5} stroke="#000000" />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
