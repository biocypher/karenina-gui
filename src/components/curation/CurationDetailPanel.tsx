import type { VerificationResult } from '../../types/verification';
import { resolveVerdict } from '../../utils/curation';
import { CurationContextZone } from './CurationContextZone';
import { CurationJudgmentZone } from './CurationJudgmentZone';

interface CurationDetailPanelProps {
  result: VerificationResult;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  scenarioId?: string;
  nodeId?: string;
  answerTemplateSource?: string;
}

const VERDICT_STYLES = {
  pass: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700',
  fail: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
  none: 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 border-slate-300 dark:border-gray-600',
};

export function CurationDetailPanel({
  result,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  scenarioId,
  nodeId,
  answerTemplateSource,
}: CurationDetailPanelProps) {
  const meta = result.metadata;
  const passed = resolveVerdict(result);
  const verdictStyle =
    passed === true ? VERDICT_STYLES.pass : passed === false ? VERDICT_STYLES.fail : VERDICT_STYLES.none;

  return (
    <div data-testid="curation-detail-panel" className="py-3 px-3 space-y-4">
      {/* Metadata bar */}
      <div className="border-l-[3px] border-l-teal-500 bg-slate-50 dark:bg-gray-700/70 rounded-r px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              {scenarioId ? 'Node' : 'Question'}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${verdictStyle}`}>
              {passed === true ? 'PASS' : passed === false ? 'FAIL' : 'NO VERDICT'}
            </span>
            {!meta.completed_without_errors && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                ERROR
              </span>
            )}
            <span className="text-slate-300 dark:text-gray-600">|</span>
            <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-400 dark:text-gray-500">
              <span className="text-slate-600 dark:text-gray-300">{meta.answering.model_name}</span>
              {meta.answering.model_name !== meta.parsing.model_name && <span>parser: {meta.parsing.model_name}</span>}
              <span>{meta.execution_time.toFixed(1)}s</span>
              <span>{meta.timestamp}</span>
              {meta.answering.tools.length > 0 && <span>tools: {meta.answering.tools.join(', ')}</span>}
              {meta.replicate != null && <span>replicate {meta.replicate}</span>}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0 ml-3">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="px-2 py-0.5 text-[11px] text-slate-400 dark:text-gray-500 rounded disabled:opacity-20 hover:text-slate-800 dark:hover:text-gray-200"
            >
              Prev
            </button>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="px-2 py-0.5 text-[11px] text-slate-400 dark:text-gray-500 rounded disabled:opacity-20 hover:text-slate-800 dark:hover:text-gray-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <CurationContextZone result={result} />
      <CurationJudgmentZone
        result={result}
        scenarioId={scenarioId}
        nodeId={nodeId}
        answerTemplateSource={answerTemplateSource}
      />
    </div>
  );
}
