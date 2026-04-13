import { useState } from 'react';
import type { VerificationResult } from '../../types/verification';
import { TraceHighlightedTextDisplay } from '../TraceHighlightedTextDisplay';
import { TraceStructuredDisplay } from '../trace';
import type { TraceMessage } from '../../types/trace';

interface CurationContextZoneProps {
  result: VerificationResult;
}

export function CurationContextZone({ result }: CurationContextZoneProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [traceMode, setTraceMode] = useState<'raw' | 'structured'>('raw');

  const meta = result.metadata;
  const template = result.template;
  const rawAnswer = meta.raw_answer ?? template?.raw_llm_response ?? '';
  const traceMessages = template?.trace_messages as TraceMessage[] | undefined;

  if (collapsed) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded p-2 mb-3">
        <button onClick={() => setCollapsed(false)} className="text-xs text-gray-400 hover:text-gray-200">
          &#9654; Show response context
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded p-3 mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-teal-400 font-bold">RESPONSE CONTEXT</span>
        <button onClick={() => setCollapsed(true)} className="text-xs text-gray-500 hover:text-gray-300">
          &#9660; Collapse
        </button>
      </div>

      {/* Metadata row */}
      <div className="flex gap-4 text-xs text-gray-500 mb-2 px-2 py-1 bg-gray-800 rounded">
        <span>
          Execution: <span className="text-gray-300">{meta.execution_time.toFixed(1)}s</span>
        </span>
        <span>
          Timestamp: <span className="text-gray-300">{meta.timestamp}</span>
        </span>
        {meta.answering.tools.length > 0 && (
          <span>
            Tools: <span className="text-gray-300">{meta.answering.tools.join(', ')}</span>
          </span>
        )}
        <span>
          Errors:{' '}
          <span className={meta.completed_without_errors ? 'text-green-400' : 'text-red-400'}>
            {meta.completed_without_errors ? 'None' : (meta.error ?? 'Error')}
          </span>
        </span>
      </div>

      {/* Raw answer */}
      <div className="mb-2">
        <div className="text-xs text-gray-500 mb-1">RAW ANSWER</div>
        <div className="bg-gray-800 rounded p-2 text-xs text-gray-300 max-h-32 overflow-auto whitespace-pre-wrap">
          {rawAnswer || <span className="text-gray-600 italic">No answer recorded</span>}
        </div>
      </div>

      {/* Trace */}
      {(template?.raw_llm_response || traceMessages) && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-gray-500">ANSWERING TRACE</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTraceMode('raw')}
                className={`text-xs px-2 py-0.5 rounded ${traceMode === 'raw' ? 'bg-gray-700 text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Raw
              </button>
              {traceMessages && traceMessages.length > 0 && (
                <button
                  onClick={() => setTraceMode('structured')}
                  className={`text-xs px-2 py-0.5 rounded ${traceMode === 'structured' ? 'bg-gray-700 text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  Structured
                </button>
              )}
            </div>
          </div>
          <div className="max-h-64 overflow-auto rounded">
            {traceMode === 'raw' && template?.raw_llm_response ? (
              <TraceHighlightedTextDisplay text={template.raw_llm_response} className="text-xs" />
            ) : traceMessages && traceMessages.length > 0 ? (
              <TraceStructuredDisplay traceMessages={traceMessages} className="text-xs" />
            ) : (
              <div className="text-xs text-gray-600 italic p-2">No trace available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
