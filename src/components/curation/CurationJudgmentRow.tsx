import { useState } from 'react';
import type { JudgmentValue, TraitJudgment } from '../../types/curation';

interface CurationJudgmentRowProps {
  name: string;
  verdictLabel: string;
  verdictPassed: boolean | null;
  /** Legacy single-string detail (used by rubric traits). */
  detailLine?: string;
  metaLine?: string;
  /** Template field: ground truth value as string. */
  gtValue?: string;
  /** Template field: LLM-parsed value as string. */
  llmValue?: string;
  /** Template field: Python type annotation (e.g. "bool", "list[str]"). */
  fieldType?: string;
  /** Template field: VerifiedField description from checkpoint. */
  fieldDescription?: string;
  /** Template field: verification primitive name (e.g. "BooleanMatch"). */
  verifyWith?: string;
  judgment: TraitJudgment | null;
  onJudgmentChange: (judgment: TraitJudgment) => void;
  onJudgmentClear: () => void;
}

const JUDGMENT_BUTTONS: { value: JudgmentValue; label: string; activeClass: string }[] = [
  { value: 'agree', label: '\u2713 Agree', activeClass: 'bg-green-500/20 border-green-500 text-green-400' },
  { value: 'disagree', label: '\u2717 Disagree', activeClass: 'bg-red-500/20 border-red-500 text-red-400' },
  { value: 'uncertain', label: '? Uncertain', activeClass: 'bg-amber-500/20 border-amber-500 text-amber-400' },
];

export function CurationJudgmentRow({
  name,
  verdictLabel,
  verdictPassed,
  detailLine,
  metaLine,
  gtValue,
  llmValue,
  fieldType,
  fieldDescription,
  verifyWith,
  judgment,
  onJudgmentChange,
  onJudgmentClear,
}: CurationJudgmentRowProps) {
  const [confidenceExpanded, setConfidenceExpanded] = useState(false);

  const borderColor =
    verdictPassed === null ? 'border-gray-500' : verdictPassed ? 'border-green-500' : 'border-red-500';

  const handleJudgmentClick = (value: JudgmentValue) => {
    if (judgment?.judgment === value) {
      onJudgmentClear();
    } else {
      onJudgmentChange({
        judgment: value,
        confidence: judgment?.confidence ?? null,
        note: judgment?.note ?? null,
      });
    }
  };

  const handleConfidenceClick = (level: number) => {
    if (!judgment) return;
    onJudgmentChange({ ...judgment, confidence: level });
  };

  const handleConfidenceClear = () => {
    if (!judgment) return;
    onJudgmentChange({ ...judgment, confidence: null });
  };

  const handleNoteChange = (note: string) => {
    if (!judgment) return;
    onJudgmentChange({ ...judgment, note: note || null });
  };

  return (
    <div
      data-testid={`judgment-row-${name}`}
      className={`bg-slate-50 dark:bg-gray-900 p-3 rounded border-l-[3px] ${borderColor}`}
    >
      {/* Header row: name + verdict + judgment buttons */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-teal-600 dark:text-teal-400 text-sm font-medium">{name}</span>
          {verdictLabel !== 'N/A' && (
            <span
              className={`ml-2 text-xs ${verdictPassed ? 'text-green-400' : verdictPassed === false ? 'text-red-400' : 'text-slate-500 dark:text-gray-400'}`}
            >
              {verdictLabel}
            </span>
          )}
          {metaLine && <span className="ml-2 text-xs text-slate-400 dark:text-gray-500">({metaLine})</span>}
        </div>
        <div className="flex gap-1">
          {JUDGMENT_BUTTONS.map(({ value, label, activeClass }) => (
            <button
              key={value}
              aria-label={label}
              onClick={() => handleJudgmentClick(value)}
              className={`px-2.5 py-1 rounded text-xs border cursor-pointer transition-colors ${
                judgment?.judgment === value
                  ? activeClass
                  : 'bg-white dark:bg-gray-800 border-slate-300 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:border-slate-400 dark:hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Confidence row (below buttons, right-aligned) */}
      {judgment && (
        <div className="flex justify-end mt-1.5">
          {confidenceExpanded ? (
            <div
              className="flex items-center gap-1 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-slate-300 dark:border-gray-600"
              title="1 = not confident, 5 = very confident"
            >
              <span
                className="text-[10px] text-slate-400 dark:text-gray-500 mr-1 cursor-pointer hover:text-slate-700 dark:hover:text-gray-300"
                onClick={() => setConfidenceExpanded(false)}
              >
                Confidence:
              </span>
              <button
                onClick={handleConfidenceClear}
                className="text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 text-xs px-1"
                title="Clear confidence"
              >
                {'\u2298'}
              </button>
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  aria-label={String(level)}
                  onClick={() => handleConfidenceClick(level)}
                  className={`px-1.5 py-0.5 rounded text-xs cursor-pointer ${
                    judgment.confidence === level
                      ? 'bg-amber-500/30 border border-amber-500 text-amber-400'
                      : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setConfidenceExpanded(true)}
              className="text-xs text-slate-400 dark:text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-slate-300 dark:border-gray-600 hover:border-slate-400 dark:hover:border-gray-400 cursor-pointer"
              title="Click to set confidence (1 = not confident, 5 = very confident)"
            >
              {judgment.confidence ? `Confidence: ${judgment.confidence}` : '\u25C8 Confidence'}
            </button>
          )}
        </div>
      )}

      {/* Field description from checkpoint template */}
      {fieldDescription && (
        <div className="mt-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400">
            Attribute Description
          </span>
          <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 leading-relaxed">{fieldDescription}</div>
        </div>
      )}

      {/* GT / LLM values (template fields) or detail line (rubric traits) */}
      {gtValue !== undefined || llmValue !== undefined ? (
        <div className="flex gap-4 mt-2 text-xs">
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase text-[10px]">GT</span>
            <span className="font-mono text-slate-700 dark:text-gray-200">{gtValue ?? '\u2014'}</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-blue-600 dark:text-blue-400 text-[10px]">
              LLM judgment extracted from trace
            </span>
            <span className="font-mono text-slate-700 dark:text-gray-200">{llmValue ?? '\u2014'}</span>
          </div>
          {fieldType && <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">{fieldType}</span>}
          {verifyWith && <span className="text-[10px] text-slate-400 dark:text-gray-500">{verifyWith}</span>}
        </div>
      ) : detailLine ? (
        <div className="text-xs text-slate-400 dark:text-gray-500 mt-1.5">{detailLine}</div>
      ) : null}

      {/* Note field (appears when judgment is set) */}
      {judgment && (
        <input
          type="text"
          value={judgment.note ?? ''}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Optional note..."
          className="w-full mt-1.5 bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-slate-700 dark:text-gray-300 placeholder-slate-400 dark:placeholder-gray-600 focus:border-slate-400 dark:focus:border-gray-400 focus:outline-none"
        />
      )}
    </div>
  );
}
