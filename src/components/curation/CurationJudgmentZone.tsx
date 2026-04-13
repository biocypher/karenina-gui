import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { CurationJudgmentRow } from './CurationJudgmentRow';
import type { VerificationResult } from '../../types/verification';

interface CurationJudgmentZoneProps {
  result: VerificationResult;
  scenarioId?: string;
  nodeId?: string;
}

export function CurationJudgmentZone({ result, scenarioId, nodeId }: CurationJudgmentZoneProps) {
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

  return (
    <div className="bg-gray-800 rounded p-3">
      {/* Tab header + curated flag */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('template')}
            className={`px-3 py-1.5 rounded text-xs ${
              activeTab === 'template'
                ? 'bg-blue-900/50 text-teal-400 border-b-2 border-teal-400'
                : 'bg-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Template Fields ({templateFieldCount})
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-3 py-1.5 rounded text-xs ${
              activeTab === 'rubric'
                ? 'bg-blue-900/50 text-teal-400 border-b-2 border-teal-400'
                : 'bg-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            Rubric Traits ({rubricTraitCount})
          </button>
        </div>
        <button
          onClick={() => (isScenarioMode ? toggleScenarioCurated(scenarioId) : toggleCurated(resultId))}
          title="Mark this result as fully reviewed. Your individual trait judgments are saved automatically."
          className={`px-3 py-1.5 rounded text-xs transition-colors ${
            isCurated
              ? 'bg-green-700 text-white border border-green-500'
              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-400'
          }`}
        >
          {isCurated ? 'Curated' : 'Flag as Curated'}
        </button>
      </div>

      {/* Template Fields tab */}
      {activeTab === 'template' && (
        <div className="flex flex-col gap-2">
          {!hasTemplate ? (
            <div className="text-xs text-gray-500 italic flex items-center gap-1.5 py-4 justify-center">
              No template verification was performed for this result
            </div>
          ) : (
            templateFieldNames.map((fieldName) => {
              const fieldScore = breakdown[fieldName];
              const passed = fieldScore !== undefined ? fieldScore >= 1.0 : null;
              const verdictLabel =
                fieldScore !== undefined ? (passed ? 'Pass' : `Fail (${fieldScore.toFixed(2)})`) : 'N/A';
              const gt = parsedGt[fieldName];
              const llm = parsedLlm[fieldName];
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
                  detailLine={`GT: ${gt !== undefined ? JSON.stringify(gt) : '\u2014'} | LLM: ${llm !== undefined ? JSON.stringify(llm) : '\u2014'}`}
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
            <div className="text-xs text-gray-500 italic flex items-center gap-1.5 py-4 justify-center">
              No rubric evaluation was performed for this result
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
    </div>
  );
}
