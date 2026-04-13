import { useState } from 'react';
import type { JudgmentValue, TraitJudgment } from '../../types/curation';

interface CurationJudgmentRowProps {
  name: string;
  verdictLabel: string;
  verdictPassed: boolean | null;
  detailLine: string;
  metaLine?: string;
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
    <div className={`bg-gray-900 p-3 rounded border-l-[3px] ${borderColor}`}>
      {/* Header row: name + verdict + judgment buttons */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-teal-400 text-sm font-medium">{name}</span>
          <span
            className={`ml-2 text-xs ${verdictPassed ? 'text-green-400' : verdictPassed === false ? 'text-red-400' : 'text-gray-400'}`}
          >
            {verdictLabel}
          </span>
          {metaLine && <span className="ml-2 text-xs text-gray-500">({metaLine})</span>}
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
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400'
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
              className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded border border-gray-600"
              title="1 = not confident, 5 = very confident"
            >
              <span className="text-[10px] text-gray-500 mr-1">Confidence:</span>
              <button
                onClick={handleConfidenceClear}
                className="text-gray-500 hover:text-gray-300 text-xs px-1"
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
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setConfidenceExpanded(true)}
              className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded border border-gray-600 hover:border-gray-400 cursor-pointer"
              title="Click to set confidence (1 = not confident, 5 = very confident)"
            >
              {judgment.confidence ? `Confidence: ${judgment.confidence}` : '\u25C8 Confidence'}
            </button>
          )}
        </div>
      )}

      {/* Detail line */}
      <div className="text-xs text-gray-500 mt-1.5">{detailLine}</div>

      {/* Note field (appears when judgment is set) */}
      {judgment && (
        <input
          type="text"
          value={judgment.note ?? ''}
          onChange={(e) => handleNoteChange(e.target.value)}
          placeholder="Optional note..."
          className="w-full mt-1.5 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:border-gray-400 focus:outline-none"
        />
      )}
    </div>
  );
}
