import { useState } from 'react';
import type { VerificationResult } from '../../types/verification';
import { TraceHighlightedTextDisplay } from '../TraceHighlightedTextDisplay';
import { TraceStructuredDisplay } from '../trace';
import type { TraceMessage } from '../../types/trace';

interface CurationContextZoneProps {
  result: VerificationResult;
}

export function CurationContextZone({ result }: CurationContextZoneProps) {
  const [traceMode, setTraceMode] = useState<'raw' | 'structured'>('structured');

  const template = result.template;
  const traceMessages = template?.trace_messages as TraceMessage[] | undefined;

  return (
    <div data-testid="curation-context-zone" className="space-y-4">
      {/* Answering Trace */}
      {(template?.raw_llm_response || traceMessages) && (
        <div
          data-testid="context-answering-trace"
          className="border-l-[3px] border-l-blue-400 bg-slate-50 dark:bg-gray-700/70 rounded-r overflow-hidden"
        >
          <div className="flex justify-between items-center px-4 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Answering Trace
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setTraceMode('raw')}
                className={`text-[11px] px-2.5 py-0.5 rounded ${traceMode === 'raw' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
              >
                Raw
              </button>
              {traceMessages && traceMessages.length > 0 && (
                <button
                  onClick={() => setTraceMode('structured')}
                  className={`text-[11px] px-2.5 py-0.5 rounded ${traceMode === 'structured' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                >
                  Structured
                </button>
              )}
            </div>
          </div>
          <div className="max-h-[48rem] overflow-auto min-w-0">
            {traceMode === 'raw' && template?.raw_llm_response ? (
              <TraceHighlightedTextDisplay text={template.raw_llm_response} className="text-xs" />
            ) : traceMessages && traceMessages.length > 0 ? (
              <TraceStructuredDisplay traceMessages={traceMessages} className="text-xs" />
            ) : (
              <div className="text-xs text-slate-400 dark:text-gray-600 italic px-4 py-3">No trace available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
