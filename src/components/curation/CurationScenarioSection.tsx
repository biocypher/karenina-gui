import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCurationStore } from '../../stores/useCurationStore';
import { resolveVerdict, computeScenarioStatus } from '../../utils/curation';
import { CurationScenarioDetail } from './CurationScenarioDetail';
import { CurationStatusBadge } from './CurationStatusBadge';
import type { ScenarioExecutionResult } from '../../types/scenario';
import type { VerificationResult } from '../../types/verification';
import type { CurationStatus } from '../../types/curation';

type OverallStatus = 'pass' | 'fail' | 'error' | 'unknown';

/** Strip scenario ID prefixes (e.g. "guardrail_000_" or "q1_") to match across naming conventions. */
function scenarioSuffix(id: string): string {
  return id.replace(/^(?:q\d+_|guardrail_\d+_|scenario_\d+_)/, '');
}

function deriveOverallStatus(turnResults: VerificationResult[]): OverallStatus {
  if (turnResults.length === 0) return 'unknown';

  let allPass = true;
  for (const tr of turnResults) {
    // Legacy: !completed_without_errors -> "error". Map straight to failure === null inverse.
    if (tr.metadata.failure !== null) return 'error';
    const verdict = resolveVerdict(tr);
    if (verdict === false) return 'fail';
    if (verdict !== true) allPass = false;
  }
  return allPass ? 'pass' : 'unknown';
}

function deriveOutcomeCounts(outcomes: Record<string, boolean | number>): { pass: number; fail: number } | null {
  let pass = 0;
  let fail = 0;
  let hasBoolean = false;
  for (const v of Object.values(outcomes)) {
    if (typeof v === 'boolean') {
      hasBoolean = true;
      if (v) pass++;
      else fail++;
    }
  }
  return hasBoolean ? { pass, fail } : null;
}

const STATUS_COLORS: Record<OverallStatus, string> = {
  pass: 'text-green-400',
  fail: 'text-red-400',
  error: 'text-amber-400',
  unknown: 'text-gray-500',
};

const STATUS_LABELS: Record<OverallStatus, string> = {
  pass: 'Pass',
  fail: 'Fail',
  error: 'Error',
  unknown: '\u2014',
};

export function CurationScenarioSection() {
  const {
    scenarioResults,
    scenarioDefinitions,
    selectedScenarioId,
    activeCuratorId,
    scenarioTemplateJudgments,
    scenarioRubricJudgments,
    scenarioCuratedFlags,
    filters,
    setSelectedScenario,
  } = useCurationStore(
    useShallow((s) => ({
      scenarioResults: s.scenarioResults,
      scenarioDefinitions: s.scenarioDefinitions,
      selectedScenarioId: s.selectedScenarioId,
      activeCuratorId: s.activeCuratorId,
      scenarioTemplateJudgments: s.scenarioTemplateJudgments,
      scenarioRubricJudgments: s.scenarioRubricJudgments,
      scenarioCuratedFlags: s.scenarioCuratedFlags,
      filters: s.filters,
      setSelectedScenario: s.setSelectedScenario,
    }))
  );

  const getScenarioCurationStatus = (scenarioId: string): CurationStatus => {
    if (!activeCuratorId) return 'pending';
    return computeScenarioStatus(
      scenarioId,
      activeCuratorId,
      scenarioTemplateJudgments,
      scenarioRubricJudgments,
      scenarioCuratedFlags
    );
  };

  const filteredScenarios = scenarioResults.filter((scenario) => {
    // Curation status filter
    if (filters.status !== 'all' && activeCuratorId) {
      const status = getScenarioCurationStatus(scenario.scenario_id);
      if (status !== filters.status) return false;
    }

    // Pass/fail filter
    if (filters.passStatus !== 'all') {
      const status = deriveOverallStatus(scenario.turn_results);
      if (filters.passStatus === 'pass' && status !== 'pass') return false;
      if (filters.passStatus === 'fail' && status !== 'fail') return false;
      if (filters.passStatus === 'error' && status !== 'error') return false;
    }

    // Model filter (check first turn's answering model)
    if (filters.answeringModel && scenario.turn_results.length > 0) {
      if (scenario.turn_results[0].metadata.answering.model_name !== filters.answeringModel) return false;
    }
    if (filters.parsingModel && scenario.turn_results.length > 0) {
      if (scenario.turn_results[0].metadata.parsing.model_name !== filters.parsingModel) return false;
    }

    // Search query: match against scenario id or any turn's question text
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      if (
        !scenario.scenario_id.toLowerCase().includes(q) &&
        !scenario.turn_results.some((tr) => tr.metadata.question_text.toLowerCase().includes(q))
      ) {
        return false;
      }
    }

    return true;
  });

  const findDefinition = (scenarioId: string) => {
    return (
      scenarioDefinitions.find((d) => d.name === scenarioId) ??
      scenarioDefinitions.find((d) => scenarioSuffix(d.name) === scenarioSuffix(scenarioId))
    );
  };

  const PAGE_SIZE = 25;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredScenarios.length / PAGE_SIZE));
  const pageScenarios = filteredScenarios.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div data-testid="curation-scenario-section" className="mb-4">
      <div className="text-xs text-slate-400 dark:text-gray-500 uppercase tracking-wide mb-2">
        Scenarios (
        {filteredScenarios.length === scenarioResults.length
          ? scenarioResults.length
          : `${filteredScenarios.length} / ${scenarioResults.length}`}
        )
      </div>

      <div className="bg-white dark:bg-gray-800 rounded overflow-hidden">
        {pageScenarios.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.scenario_id;
          return (
            <div key={scenario.scenario_id} data-testid={`scenario-card-${scenario.scenario_id}`}>
              <ScenarioCard
                scenario={scenario}
                name={findDefinition(scenario.scenario_id)?.name ?? scenario.scenario_id}
                isSelected={isSelected}
                curationStatus={getScenarioCurationStatus(scenario.scenario_id)}
                onClick={() => setSelectedScenario(isSelected ? null : scenario.scenario_id)}
              />
              {isSelected && (
                <CurationScenarioDetail
                  scenarioResult={scenario}
                  definition={findDefinition(scenario.scenario_id)}
                  turnResults={scenario.turn_results}
                />
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 p-2 text-xs text-slate-500 dark:text-gray-400">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="hover:text-slate-800 dark:hover:text-gray-200 disabled:opacity-30"
          >
            Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const page =
              totalPages <= 7
                ? i + 1
                : currentPage <= 4
                  ? i + 1
                  : currentPage >= totalPages - 3
                    ? totalPages - 6 + i
                    : currentPage - 3 + i;
            return (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2 py-0.5 rounded ${page === currentPage ? 'bg-slate-300 dark:bg-gray-600 text-slate-800 dark:text-gray-200' : 'hover:text-slate-800 dark:hover:text-gray-200'}`}
              >
                {page}
              </button>
            );
          })}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="hover:text-slate-800 dark:hover:text-gray-200 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

interface ScenarioCardProps {
  scenario: ScenarioExecutionResult;
  name: string;
  isSelected: boolean;
  curationStatus: CurationStatus;
  onClick: () => void;
}

function ScenarioCard({ scenario, name, isSelected, curationStatus, onClick }: ScenarioCardProps) {
  const status = deriveOverallStatus(scenario.turn_results);
  const counts = deriveOutcomeCounts(scenario.outcome_results);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex items-center gap-3 px-3 py-2 border-b border-slate-200/60 dark:border-gray-700/50 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-slate-200/60 dark:bg-gray-700/50 border-l-2 border-l-teal-500'
          : 'hover:bg-slate-100 dark:hover:bg-gray-700/30'
      }`}
    >
      <CurationStatusBadge status={curationStatus} />

      <div className="flex-1 min-w-0">
        <span className="text-sm text-slate-700 dark:text-gray-300 truncate block">{name}</span>
      </div>

      <span className="text-xs text-slate-400 dark:text-gray-500 flex-shrink-0">
        {scenario.turn_count} {scenario.turn_count === 1 ? 'turn' : 'turns'}
      </span>

      {counts ? (
        <span className="text-xs flex items-center gap-1.5 flex-shrink-0">
          <span className="text-green-500 dark:text-green-400">{counts.pass} pass</span>
          <span className="text-slate-300 dark:text-gray-600">·</span>
          <span className="text-red-500 dark:text-red-400">{counts.fail} fail</span>
        </span>
      ) : (
        <span className={`text-xs flex-shrink-0 ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>
      )}
    </div>
  );
}
