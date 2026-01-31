import React, { useState } from 'react';
import type { ThinkingMeta } from '../../types/trace';

interface TraceThinkingBlockProps {
  thinking: ThinkingMeta;
}

export const TraceThinkingBlock: React.FC<TraceThinkingBlockProps> = ({ thinking }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-1 mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
      >
        <span>{expanded ? '▼' : '▶'}</span>
        <span>Extended Thinking</span>
      </button>
      {expanded && (
        <pre className="mt-1 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
          {thinking.thinking}
        </pre>
      )}
    </div>
  );
};
