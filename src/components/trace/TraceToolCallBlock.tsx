import React, { useState } from 'react';
import type { ToolCall } from '../../types/trace';

interface TraceToolCallBlockProps {
  toolCalls: ToolCall[];
}

export const TraceToolCallBlock: React.FC<TraceToolCallBlockProps> = ({ toolCalls }) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-1 space-y-1">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="border border-amber-200 dark:border-amber-700 rounded">
          <button
            onClick={() => toggle(tc.id)}
            className="w-full text-left px-2 py-1 text-xs flex items-center gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          >
            <span>{expandedIds.has(tc.id) ? '▼' : '▶'}</span>
            <span className="font-mono font-medium text-amber-700 dark:text-amber-300">{tc.name}</span>
            <span className="text-slate-400 dark:text-slate-500 ml-auto truncate text-[10px]">{tc.id}</span>
          </button>
          {expandedIds.has(tc.id) && (
            <pre className="px-2 py-1 bg-amber-50 dark:bg-amber-900/10 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto border-t border-amber-200 dark:border-amber-700">
              {JSON.stringify(tc.input, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
};
