import React from 'react';
import type { TraceMessage } from '../../types/trace';
import { TraceToolCallBlock } from './TraceToolCallBlock';
import { TraceToolResultBlock } from './TraceToolResultBlock';
import { TraceThinkingBlock } from './TraceThinkingBlock';

interface TraceMessageBlockProps {
  message: TraceMessage;
}

const ROLE_STYLES: Record<string, { bg: string; badge: string; label: string }> = {
  assistant: {
    bg: 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
    badge: 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200',
    label: 'Assistant',
  },
  tool: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200',
    label: 'Tool',
  },
  user: {
    bg: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800',
    badge: 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
    label: 'User',
  },
  system: {
    bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200',
    label: 'System',
  },
};

export const TraceMessageBlock: React.FC<TraceMessageBlockProps> = ({ message }) => {
  const style = ROLE_STYLES[message.role] || ROLE_STYLES.system;

  return (
    <div className={`rounded-lg border p-3 ${style.bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>{style.label}</span>
        {message.model && <span className="text-[10px] text-slate-400 dark:text-slate-500">{message.model}</span>}
      </div>

      {/* Thinking block (SDK extended thinking) */}
      {message.thinking && <TraceThinkingBlock thinking={message.thinking} />}

      {/* Text content */}
      {message.content && (
        <pre className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap mt-1">{message.content}</pre>
      )}

      {/* Tool calls */}
      {message.tool_calls && message.tool_calls.length > 0 && <TraceToolCallBlock toolCalls={message.tool_calls} />}

      {/* Tool result */}
      {message.role === 'tool' && message.tool_result && (
        <TraceToolResultBlock content={message.content} toolResult={message.tool_result} />
      )}
    </div>
  );
};
