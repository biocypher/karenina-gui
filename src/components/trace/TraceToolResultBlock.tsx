import React from 'react';
import type { ToolResultMeta } from '../../types/trace';

interface TraceToolResultBlockProps {
  content: string;
  toolResult: ToolResultMeta;
}

export const TraceToolResultBlock: React.FC<TraceToolResultBlockProps> = ({ content, toolResult }) => {
  const isError = toolResult.is_error;

  return (
    <div
      className={`text-xs rounded p-2 max-h-40 overflow-y-auto whitespace-pre-wrap ${
        isError
          ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700'
          : 'bg-yellow-50 dark:bg-yellow-900/10 text-slate-700 dark:text-slate-300'
      }`}
    >
      <span className="text-[10px] text-slate-400 dark:text-slate-500">
        {toolResult.tool_use_id}
        {isError && ' [ERROR]'}
      </span>
      <pre className="mt-1 whitespace-pre-wrap">{content}</pre>
    </div>
  );
};
