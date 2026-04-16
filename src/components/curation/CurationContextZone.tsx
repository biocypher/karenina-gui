import { useState, useMemo } from 'react';
import type { VerificationResult } from '../../types/verification';
import type { TraceMessage } from '../../types/trace';
import { TraceHighlightedTextDisplay } from '../TraceHighlightedTextDisplay';
import { TraceStructuredDisplay } from '../trace';
import { buildEnrichedTrace } from '../../utils/curation';

interface CurationContextZoneProps {
  result: VerificationResult;
}

export function CurationContextZone({ result }: CurationContextZoneProps) {
  const [traceMode, setTraceMode] = useState<'raw' | 'structured'>('structured');

  const template = result.template;
  const traceMessages = template?.trace_messages as TraceMessage[] | undefined;

  const conversationContext = template?.conversation_context as TraceMessage[] | undefined;

  const enriched = useMemo(
    () =>
      buildEnrichedTrace(
        traceMessages,
        result.metadata.question_text,
        result.metadata.answering_system_prompt,
        template?.raw_llm_response,
        conversationContext
      ),
    [
      traceMessages,
      result.metadata.question_text,
      result.metadata.answering_system_prompt,
      template?.raw_llm_response,
      conversationContext,
    ]
  );

  const hasStructured = enriched.messages.length > 0;
  const hasRaw = !!template?.raw_llm_response;

  if (!hasStructured && !hasRaw) {
    return null;
  }

  return (
    <div data-testid="curation-context-zone" className="space-y-4">
      <div
        data-testid="context-answering-trace"
        className="border-l-[3px] border-l-blue-400 bg-slate-50 dark:bg-gray-700/70 rounded-r overflow-hidden"
      >
        <div className="flex justify-between items-center px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Answering Trace
          </span>
          <div className="flex gap-1">
            {hasRaw && (
              <button
                onClick={() => setTraceMode('raw')}
                className={`text-[11px] px-2.5 py-0.5 rounded ${traceMode === 'raw' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
              >
                Raw
              </button>
            )}
            {hasStructured && (
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
          {traceMode === 'raw' && hasRaw ? (
            <div>
              {result.metadata.answering_system_prompt && (
                <details className="border-b border-slate-200 dark:border-gray-600 px-4 py-2">
                  <summary className="text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300">
                    System Prompt
                  </summary>
                  <pre className="mt-1 p-2 bg-slate-100 dark:bg-gray-800 rounded text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {result.metadata.answering_system_prompt}
                  </pre>
                </details>
              )}
              <TraceHighlightedTextDisplay text={template!.raw_llm_response} className="text-xs" />
            </div>
          ) : hasStructured ? (
            <TraceStructuredDisplay
              traceMessages={enriched.messages}
              currentTurnIndex={enriched.currentTurnIndex}
              collapsibleSystem
              className="text-xs"
            />
          ) : (
            <div className="text-xs text-slate-400 dark:text-gray-600 italic px-4 py-3">No trace available</div>
          )}
        </div>
      </div>
    </div>
  );
}
