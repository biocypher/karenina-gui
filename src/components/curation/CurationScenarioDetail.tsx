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

  return (
    <div className="border border-gray-700 rounded p-4 mt-2">
      <div className="flex justify-between items-center mb-3">
        <div>
          <span className="text-sm text-teal-400">{definition?.name ?? scenarioResult.scenario_id}</span>
          <span className="text-xs text-gray-500 ml-2">
            {scenarioResult.turn_count} turns, path: {scenarioResult.path.join(' > ')}
          </span>
        </div>
        <button
          onClick={() => toggleScenarioCurated(scenarioResult.scenario_id)}
          className={`px-3 py-1.5 rounded text-xs transition-colors ${
            isCurated
              ? 'bg-green-700 text-white border border-green-500'
              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-400'
          }`}
        >
          {isCurated ? 'Curated' : 'Flag as Curated'}
        </button>
      </div>

      <div className="bg-gray-800 px-3 py-2 rounded mb-3">
        <div className="text-xs text-gray-500 mb-1">OUTCOME CRITERIA (programmatic, no curation)</div>
        <div className="flex gap-3 text-xs">
          {Object.entries(scenarioResult.outcome_results).map(([name, value]) => (
            <span
              key={name}
              className={typeof value === 'boolean' ? (value ? 'text-green-400' : 'text-red-400') : 'text-gray-300'}
            >
              {typeof value === 'boolean' ? (value ? 'Pass' : 'Fail') : `${value}`} {name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-shrink-0 w-72">
          <div className="text-xs text-gray-500 mb-1">SCENARIO GRAPH (click node to inspect)</div>
          {definition ? (
            <Suspense
              fallback={
                <div className="h-72 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
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
            <div className="h-72 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">
              Scenario definition not available in checkpoint
            </div>
          )}
        </div>

        <div className="flex-1">
          {selectedNodeResult ? (
            <CurationDetailPanel
              result={selectedNodeResult}
              scenarioId={scenarioResult.scenario_id}
              nodeId={selectedNodeId ?? undefined}
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
            <div className="flex items-center justify-center h-48 text-xs text-gray-500">
              Click a node in the graph to inspect its results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
