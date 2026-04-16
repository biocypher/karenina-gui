import { lazy, Suspense } from 'react';
import { useCurationStore } from '../../stores/useCurationStore';
import { resolveVerdict } from '../../utils/curation';
import { CurationDetailPanel } from './CurationDetailPanel';
import type { ScenarioDefinition, ScenarioExecutionResult } from '../../types/scenario';
import type { VerificationResult } from '../../types/verification';

const CurationScenarioDAG = lazy(() =>
  import('./CurationScenarioDAG').then((m) => ({ default: m.CurationScenarioDAG }))
);

interface CurationScenarioDetailProps {
  scenarioResult: ScenarioExecutionResult;
  definition: ScenarioDefinition | undefined;
  turnResults: VerificationResult[];
}

export function CurationScenarioDetail({ scenarioResult, definition, turnResults }: CurationScenarioDetailProps) {
  const { selectedNodeId, setSelectedNode, scenarioCuratedFlags, activeCuratorId, toggleScenarioCurated } =
    useCurationStore();

  const isCurated = activeCuratorId
    ? (scenarioCuratedFlags[activeCuratorId]?.[scenarioResult.scenario_id] ?? false)
    : false;

  const nodeResults: Record<string, boolean | null> = {};
  for (const tr of turnResults) {
    const nodeId = tr.metadata.scenario_node;
    if (nodeId) {
      nodeResults[nodeId] = resolveVerdict(tr);
    }
  }

  const selectedNodeResult = selectedNodeId
    ? (turnResults.find((r) => r.metadata.scenario_node === selectedNodeId) ?? null)
    : null;

  const selectedNodeIndex = selectedNodeResult ? turnResults.indexOf(selectedNodeResult) : -1;

  // Look up the answer template source from the scenario definition for the selected node
  const selectedNodeTemplateSource =
    selectedNodeId && definition ? definition.nodes[selectedNodeId]?.answer_template : undefined;

  return (
    <div data-testid="curation-scenario-detail" className="py-3 px-3 space-y-3">
      {/* Scenario header */}
      <div className="border-l-[3px] border-l-emerald-500 bg-slate-50 dark:bg-gray-700/70 rounded-r px-4 py-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Scenario
              </span>
              <span className="text-[10px] text-slate-400 dark:text-gray-500">{scenarioResult.turn_count} turns</span>
              {Object.entries(scenarioResult.outcome_results).map(([name, value]) => (
                <span
                  key={name}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                    typeof value === 'boolean'
                      ? value
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
                      : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 border-slate-300 dark:border-gray-600'
                  }`}
                >
                  {typeof value === 'boolean' ? (value ? 'PASS' : 'FAIL') : `${value}`} {name}
                </span>
              ))}
            </div>
            <div className="text-sm text-slate-800 dark:text-gray-100">
              {definition?.name ?? scenarioResult.scenario_id}
            </div>
            <div className="text-[11px] text-slate-400 dark:text-gray-500 mt-1">
              Path: {scenarioResult.path.join(' > ')}
            </div>
          </div>
          <button
            onClick={() => toggleScenarioCurated(scenarioResult.scenario_id)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors flex-shrink-0 ml-3 ${
              isCurated
                ? 'bg-green-600 dark:bg-green-700 text-white border border-green-500'
                : 'bg-white dark:bg-gray-700 text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-gray-600 hover:border-emerald-400 dark:hover:border-emerald-400'
            }`}
          >
            {isCurated ? 'Curated' : 'Flag as Curated'}
          </button>
        </div>
      </div>

      {/* Scenario graph */}
      <div className="border-l-[3px] border-l-indigo-400 bg-slate-50 dark:bg-gray-700/70 rounded-r">
        <div className="px-4 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Scenario Graph
          </span>
          <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-2">click a node to inspect</span>
        </div>
        {definition ? (
          <Suspense
            fallback={
              <div className="h-96 flex items-center justify-center text-xs text-slate-400 dark:text-gray-500">
                Loading graph...
              </div>
            }
          >
            <CurationScenarioDAG
              definition={definition}
              takenPath={scenarioResult.path}
              nodeResults={nodeResults}
              selectedNodeId={selectedNodeId}
              onNodeClick={setSelectedNode}
            />
          </Suspense>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-400 dark:text-gray-500">
            Scenario definition not available in checkpoint
          </div>
        )}
      </div>

      {/* Node detail or placeholder */}
      {selectedNodeResult ? (
        <CurationDetailPanel
          result={selectedNodeResult}
          scenarioId={scenarioResult.scenario_id}
          nodeId={selectedNodeId ?? undefined}
          answerTemplateSource={selectedNodeTemplateSource}
          onPrev={() => {
            if (selectedNodeIndex > 0) {
              const prev = turnResults[selectedNodeIndex - 1];
              setSelectedNode(prev.metadata.scenario_node ?? null);
            }
          }}
          onNext={() => {
            if (selectedNodeIndex < turnResults.length - 1) {
              const next = turnResults[selectedNodeIndex + 1];
              setSelectedNode(next.metadata.scenario_node ?? null);
            }
          }}
          hasPrev={selectedNodeIndex > 0}
          hasNext={selectedNodeIndex < turnResults.length - 1}
        />
      ) : (
        <div className="flex items-center justify-center h-12 text-[11px] text-slate-400 dark:text-gray-500 italic">
          Click a node in the graph to inspect its results
        </div>
      )}
    </div>
  );
}
