import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { CurationJudgmentRow } from './CurationJudgmentRow';
import { parseTemplateFields } from '../../utils/curation/parseTemplateFields';
import type { TemplateFieldMeta } from '../../utils/curation/parseTemplateFields';
import type { VerificationResult } from '../../types/verification';

const PREVIEW_CHARS = 180;

function CollapsibleMarkdown({ label, text, labelColor }: { label: string; text: string; labelColor: string }) {
  const trimmed = text.trim();
  const needsCollapse = trimmed.length > PREVIEW_CHARS;
  const preview = needsCollapse ? trimmed.slice(0, PREVIEW_CHARS).replace(/\s+\S*$/, '') + '…' : trimmed;

  return (
    <details className="group bg-white/50 dark:bg-gray-800/40 rounded px-3 py-2">
      <summary className="cursor-pointer list-none flex items-start gap-2 text-[11px] leading-snug">
        <span className={`font-semibold uppercase tracking-wider shrink-0 mt-0.5 w-20 ${labelColor}`}>{label}</span>
        <span className="text-slate-600 dark:text-slate-300 group-open:hidden flex-1 min-w-0 break-words">
          {preview}
        </span>
        {needsCollapse && (
          <span className="text-slate-400 dark:text-gray-500 shrink-0 mt-0.5 group-open:rotate-90 transition-transform">
            ▸
          </span>
        )}
      </summary>
      <div className="hidden group-open:block mt-2 text-xs text-slate-700 dark:text-slate-300 prose prose-sm prose-slate dark:prose-invert max-w-none break-words">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmed}</ReactMarkdown>
      </div>
    </details>
  );
}

interface CurationJudgmentZoneProps {
  result: VerificationResult;
  scenarioId?: string;
  nodeId?: string;
  answerTemplateSource?: string;
  rawAnswer?: string;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function CurationJudgmentZone({
  result,
  scenarioId,
  nodeId,
  answerTemplateSource,
  rawAnswer,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: CurationJudgmentZoneProps) {
  const {
    activeCuratorId,
    activeTab,
    setActiveTab,
    templateJudgments,
    rubricJudgments,
    curatedFlags,
    setTemplateJudgment,
    clearTemplateJudgment,
    setRubricJudgment,
    clearRubricJudgment,
    toggleCurated,
    scenarioTemplateJudgments,
    scenarioRubricJudgments,
    scenarioCuratedFlags,
    setScenarioTemplateJudgment,
    clearScenarioTemplateJudgment,
    setScenarioRubricJudgment,
    clearScenarioRubricJudgment,
    toggleScenarioCurated,
  } = useCurationStore(
    useShallow((s) => ({
      activeCuratorId: s.activeCuratorId,
      activeTab: s.activeTab,
      setActiveTab: s.setActiveTab,
      templateJudgments: s.templateJudgments,
      rubricJudgments: s.rubricJudgments,
      curatedFlags: s.curatedFlags,
      setTemplateJudgment: s.setTemplateJudgment,
      clearTemplateJudgment: s.clearTemplateJudgment,
      setRubricJudgment: s.setRubricJudgment,
      clearRubricJudgment: s.clearRubricJudgment,
      toggleCurated: s.toggleCurated,
      scenarioTemplateJudgments: s.scenarioTemplateJudgments,
      scenarioRubricJudgments: s.scenarioRubricJudgments,
      scenarioCuratedFlags: s.scenarioCuratedFlags,
      setScenarioTemplateJudgment: s.setScenarioTemplateJudgment,
      clearScenarioTemplateJudgment: s.clearScenarioTemplateJudgment,
      setScenarioRubricJudgment: s.setScenarioRubricJudgment,
      clearScenarioRubricJudgment: s.clearScenarioRubricJudgment,
      toggleScenarioCurated: s.toggleScenarioCurated,
    }))
  );

  const isScenarioMode = scenarioId != null && nodeId != null;
  const resultId = result.metadata.result_id ?? result.metadata.template_id;

  // Parse template field metadata from checkpoint source code
  const fieldMetaMap = useMemo(() => {
    if (!answerTemplateSource) return {} as Record<string, TemplateFieldMeta>;
    const fields = parseTemplateFields(answerTemplateSource);
    const map: Record<string, TemplateFieldMeta> = {};
    for (const f of fields) map[f.name] = f;
    return map;
  }, [answerTemplateSource]);

  const isCurated = activeCuratorId
    ? isScenarioMode
      ? (scenarioCuratedFlags[activeCuratorId]?.[scenarioId] ?? false)
      : (curatedFlags[activeCuratorId]?.[resultId] ?? false)
    : false;

  // Template fields: use granular breakdown if available, fall back to parsed responses
  const granular = result.template?.verify_granular_result;
  const breakdown = granular?.breakdown ?? {};
  const parsedGt = result.template?.parsed_gt_response ?? {};
  const parsedLlm = result.template?.parsed_llm_response ?? {};

  // Build template field entries from breakdown or parsed responses
  const templateFieldNames =
    Object.keys(breakdown).length > 0
      ? Object.keys(breakdown)
      : [...new Set([...Object.keys(parsedGt), ...Object.keys(parsedLlm)])];

  // Rubric: merge all trait score types
  const rubricResult = result.rubric;
  const allTraitScores: Record<string, number | boolean> = {
    ...rubricResult?.llm_trait_scores,
    ...rubricResult?.regex_trait_scores,
    ...rubricResult?.callable_trait_scores,
  };

  const metricTraitScores = rubricResult?.metric_trait_scores ?? {};
  const metricTraitCount = Object.keys(metricTraitScores).length;

  const hasTemplate = result.template?.template_verification_performed !== false && templateFieldNames.length > 0;
  const hasRubric =
    rubricResult?.rubric_evaluation_performed !== false &&
    (Object.keys(allTraitScores).length > 0 || metricTraitCount > 0);

  const templateFieldCount = templateFieldNames.length;
  const rubricTraitCount = Object.keys(allTraitScores).length + metricTraitCount;

  const autoFailStage = result.metadata.failed_stage?.endsWith('AutoFail') ? result.metadata.failed_stage : null;

  return (
    <div
      data-testid="curation-judgment-zone"
      className="border-l-[3px] border-l-violet-400 bg-slate-50 dark:bg-gray-700/70 rounded-r px-4 py-3"
    >
      {/* Section label + curated flag */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Curation
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('template')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'template'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200'
              }`}
            >
              Template Fields ({templateFieldCount})
            </button>
            <button
              onClick={() => setActiveTab('rubric')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                activeTab === 'rubric'
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'
                  : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200'
              }`}
            >
              Rubric Traits ({rubricTraitCount})
            </button>
          </div>
        </div>
        <button
          onClick={() => (isScenarioMode ? toggleScenarioCurated(scenarioId) : toggleCurated(resultId))}
          title="Mark this result as fully reviewed. Your individual trait judgments are saved automatically."
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            isCurated
              ? 'bg-green-600 dark:bg-green-700 text-white border border-green-500'
              : 'bg-white dark:bg-gray-700 text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-400'
          }`}
        >
          {isCurated ? 'Curated' : 'Flag as Curated'}
        </button>
      </div>

      {/* Reminder: question + raw answer */}
      {(() => {
        const effectiveRaw = rawAnswer ?? result.raw_answer;
        if (!result.metadata.question_text && !effectiveRaw) return null;
        return (
          <div className="flex flex-col gap-1.5 mb-3">
            {result.metadata.question_text && (
              <CollapsibleMarkdown
                label="Question"
                text={result.metadata.question_text}
                labelColor="text-amber-600 dark:text-amber-400"
              />
            )}
            {effectiveRaw && (
              <CollapsibleMarkdown
                label="Raw Answer"
                text={effectiveRaw}
                labelColor="text-emerald-600 dark:text-emerald-400"
              />
            )}
          </div>
        );
      })()}

      {/* Template Fields tab */}
      {activeTab === 'template' && (
        <div className="flex flex-col gap-2">
          {!hasTemplate ? (
            <div className="text-xs text-slate-400 dark:text-gray-500 italic flex items-center gap-1.5 py-4 justify-center">
              No template verification was performed for this result
              {autoFailStage && (
                <span className="text-orange-500 dark:text-orange-400"> (auto-failed at {autoFailStage})</span>
              )}
            </div>
          ) : (
            templateFieldNames.map((fieldName) => {
              const fieldScore = breakdown[fieldName];
              const passed = fieldScore !== undefined ? fieldScore >= 1.0 : null;
              const verdictLabel =
                fieldScore !== undefined ? (passed ? 'Pass' : `Fail (${fieldScore.toFixed(2)})`) : 'N/A';
              const gt = parsedGt[fieldName];
              const llm = parsedLlm[fieldName];
              const meta = fieldMetaMap[fieldName];
              const curJudgment = activeCuratorId
                ? isScenarioMode
                  ? (scenarioTemplateJudgments[activeCuratorId]?.[scenarioId]?.[nodeId]?.[fieldName] ?? null)
                  : (templateJudgments[activeCuratorId]?.[resultId]?.[fieldName] ?? null)
                : null;

              return (
                <CurationJudgmentRow
                  key={fieldName}
                  name={fieldName}
                  verdictLabel={verdictLabel}
                  verdictPassed={passed}
                  gtValue={gt !== undefined ? JSON.stringify(gt) : undefined}
                  llmValue={llm !== undefined ? JSON.stringify(llm) : undefined}
                  fieldType={meta?.type}
                  fieldDescription={meta?.description}
                  verifyWith={meta?.verifyWith}
                  judgment={curJudgment}
                  onJudgmentChange={(j) =>
                    isScenarioMode
                      ? setScenarioTemplateJudgment(scenarioId, nodeId, fieldName, j)
                      : setTemplateJudgment(resultId, fieldName, j)
                  }
                  onJudgmentClear={() =>
                    isScenarioMode
                      ? clearScenarioTemplateJudgment(scenarioId, nodeId, fieldName)
                      : clearTemplateJudgment(resultId, fieldName)
                  }
                />
              );
            })
          )}
        </div>
      )}

      {/* Rubric Traits tab */}
      {activeTab === 'rubric' && (
        <div className="flex flex-col gap-2">
          {!hasRubric ? (
            <div className="text-xs text-slate-400 dark:text-gray-500 italic flex items-center gap-1.5 py-4 justify-center">
              No rubric evaluation was performed for this result
              {autoFailStage && (
                <span className="text-orange-500 dark:text-orange-400"> (auto-failed at {autoFailStage})</span>
              )}
            </div>
          ) : (
            <>
              {Object.entries(allTraitScores).map(([traitName, score]) => {
                const passed = typeof score === 'boolean' ? score : score >= 3;
                const label = typeof score === 'boolean' ? (score ? 'True' : 'False') : String(score);
                const curJudgment = activeCuratorId
                  ? isScenarioMode
                    ? (scenarioRubricJudgments[activeCuratorId]?.[scenarioId]?.[nodeId]?.[traitName] ?? null)
                    : (rubricJudgments[activeCuratorId]?.[resultId]?.[traitName] ?? null)
                  : null;

                return (
                  <CurationJudgmentRow
                    key={traitName}
                    name={traitName}
                    verdictLabel={label}
                    verdictPassed={passed}
                    detailLine={typeof score === 'boolean' ? 'Boolean trait' : `Score: ${score}`}
                    judgment={curJudgment}
                    onJudgmentChange={(j) =>
                      isScenarioMode
                        ? setScenarioRubricJudgment(scenarioId, nodeId, traitName, j)
                        : setRubricJudgment(resultId, traitName, j)
                    }
                    onJudgmentClear={() =>
                      isScenarioMode
                        ? clearScenarioRubricJudgment(scenarioId, nodeId, traitName)
                        : clearRubricJudgment(resultId, traitName)
                    }
                  />
                );
              })}
              {Object.entries(metricTraitScores).map(([traitName, metrics]) => {
                const f1 = metrics.f1;
                const primaryScore = f1 ?? Object.values(metrics)[0] ?? 0;
                const curJudgment = activeCuratorId
                  ? isScenarioMode
                    ? (scenarioRubricJudgments[activeCuratorId]?.[scenarioId]?.[nodeId]?.[traitName] ?? null)
                    : (rubricJudgments[activeCuratorId]?.[resultId]?.[traitName] ?? null)
                  : null;

                return (
                  <CurationJudgmentRow
                    key={`metric-${traitName}`}
                    name={traitName}
                    verdictLabel={`F1: ${(f1 ?? primaryScore).toFixed(2)}`}
                    verdictPassed={null}
                    detailLine={Object.entries(metrics)
                      .map(([m, v]) => `${m}: ${v.toFixed(2)}`)
                      .join(', ')}
                    metaLine="metric"
                    judgment={curJudgment}
                    onJudgmentChange={(j) =>
                      isScenarioMode
                        ? setScenarioRubricJudgment(scenarioId, nodeId, traitName, j)
                        : setRubricJudgment(resultId, traitName, j)
                    }
                    onJudgmentClear={() =>
                      isScenarioMode
                        ? clearScenarioRubricJudgment(scenarioId, nodeId, traitName)
                        : clearRubricJudgment(resultId, traitName)
                    }
                  />
                );
              })}
            </>
          )}
        </div>
      )}

      {(onPrev || onNext) && (
        <div className="flex justify-end gap-1 mt-3 pt-2 border-t border-slate-200 dark:border-gray-600/50">
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
      )}
    </div>
  );
}
