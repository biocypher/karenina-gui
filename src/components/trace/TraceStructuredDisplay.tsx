import React from 'react';
import type { TraceMessage } from '../../types/trace';
import { TraceMessageBlock } from './TraceMessageBlock';

interface TraceStructuredDisplayProps {
  traceMessages: TraceMessage[];
  className?: string;
}

export const TraceStructuredDisplay: React.FC<TraceStructuredDisplayProps> = ({ traceMessages, className = '' }) => {
  if (!traceMessages || traceMessages.length === 0) {
    return (
      <div className="text-slate-400 dark:text-slate-500 text-sm italic p-3">
        No structured trace messages available.
      </div>
    );
  }

  return (
    <div className={`space-y-2 max-h-[32rem] overflow-y-auto ${className}`}>
      {traceMessages.map((msg, idx) => (
        <TraceMessageBlock key={`${msg.role}-${msg.block_index}-${idx}`} message={msg} />
      ))}
    </div>
  );
};
