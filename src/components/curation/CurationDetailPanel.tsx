import type { VerificationResult } from '../../types/verification';
import { CurationContextZone } from './CurationContextZone';
import { CurationJudgmentZone } from './CurationJudgmentZone';

interface CurationDetailPanelProps {
  result: VerificationResult;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

/**
 * Resolve the verify_result to a boolean or null.
 *
 * verify_result is typed as VerificationOutcome | null but in practice
 * the backend may send a plain boolean. Handle both shapes.
 */
function resolveVerdict(result: VerificationResult): boolean | null {
  const vr = result.template?.verify_result;
  if (vr == null) return null;
  if (typeof vr === 'boolean') return vr;
  if (typeof vr === 'object' && 'completed_without_errors' in vr) {
    return vr.completed_without_errors;
  }
  return null;
}

export function CurationDetailPanel({ result, onPrev, onNext, hasPrev, hasNext }: CurationDetailPanelProps) {
  const meta = result.metadata;
  const passed = resolveVerdict(result);

  return (
    <div className="border border-gray-700 rounded p-4 mt-2">
      {/* Result header bar */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="text-sm text-teal-400">{meta.question_text}</div>
          <div className="text-xs text-gray-500 mt-1">
            <span className={passed === true ? 'text-green-400' : passed === false ? 'text-red-400' : 'text-gray-400'}>
              {passed === true ? 'Pass' : passed === false ? 'Fail' : 'No verdict'}
            </span>
            {' | '}Answering: <span className="text-gray-300">{meta.answering.model_name}</span> Parsing:{' '}
            <span className="text-gray-300">{meta.parsing.model_name}</span>
            {meta.replicate != null && (
              <>
                {' '}
                Replicate: <span className="text-gray-300">{meta.replicate}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="px-3 py-1 bg-gray-700 text-xs rounded disabled:opacity-30 hover:bg-gray-600"
          >
            Prev
          </button>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="px-3 py-1 bg-gray-700 text-xs rounded disabled:opacity-30 hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      </div>

      <CurationContextZone result={result} />
      <CurationJudgmentZone result={result} />
    </div>
  );
}
