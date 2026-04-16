import type { VerificationResult } from '../../types/verification';
import type { ScenarioExecutionResult, TurnRecord } from '../../types/scenario';
import { resolveVerdict } from './resolveVerdict';

export interface GroupedResults {
  standaloneResults: VerificationResult[];
  scenarioResults: ScenarioExecutionResult[];
}

/**
 * Partition flat VerificationResult[] into standalone QA results and
 * grouped ScenarioExecutionResult objects.
 *
 * Results with a truthy metadata.scenario_id are grouped by that ID,
 * sorted by scenario_turn within each group, and assembled into
 * ScenarioExecutionResult structures. All other results are returned
 * as standaloneResults unchanged.
 *
 * If outcomesByScenario is provided, each grouped scenario receives
 * the matching outcome_results map (keyed by scenario_id). Missing
 * entries fall back to an empty object.
 */
export function groupScenarioResults(
  results: VerificationResult[],
  outcomesByScenario?: Record<string, Record<string, boolean | number>>
): GroupedResults {
  const standaloneResults: VerificationResult[] = [];
  const scenarioMap = new Map<string, VerificationResult[]>();

  // 1. Partition by scenario_id
  for (const result of results) {
    const scenarioId = result.metadata.scenario_id;
    if (scenarioId) {
      const group = scenarioMap.get(scenarioId);
      if (group) {
        group.push(result);
      } else {
        scenarioMap.set(scenarioId, [result]);
      }
    } else {
      standaloneResults.push(result);
    }
  }

  // 2. Build ScenarioExecutionResult per group
  const scenarioResults: ScenarioExecutionResult[] = [];

  for (const [scenarioId, group] of scenarioMap) {
    // Sort by scenario_turn ascending (undefined treated as 0)
    group.sort((a, b) => (a.metadata.scenario_turn ?? 0) - (b.metadata.scenario_turn ?? 0));

    const lastResult = group[group.length - 1];
    const lastPath = lastResult.metadata.scenario_path;

    // Derive path: prefer last turn's scenario_path, fall back to unique ordered node IDs
    let path: string[];
    if (lastPath && lastPath.length > 0) {
      path = lastPath;
    } else {
      const seen = new Set<string>();
      path = [];
      for (const r of group) {
        const node = r.metadata.scenario_node;
        if (node && !seen.has(node)) {
          seen.add(node);
          path.push(node);
        }
      }
    }

    // Build history TurnRecords
    const history: TurnRecord[] = group.map((r) => ({
      node_id: r.metadata.scenario_node ?? '',
      question_text: r.metadata.question_text,
      question_messages: [],
      trace_messages: [],
      raw_response: r.template?.raw_llm_response ?? '',
      parsed_fields: r.template?.parsed_llm_response ?? {},
      verify_result: resolveVerdict(r),
      verification_result_id: r.metadata.result_id ?? r.metadata.template_id ?? null,
    }));

    // Compute node_visits
    const nodeVisits: Record<string, number> = {};
    for (const r of group) {
      const node = r.metadata.scenario_node;
      if (node) {
        nodeVisits[node] = (nodeVisits[node] ?? 0) + 1;
      }
    }

    scenarioResults.push({
      scenario_id: scenarioId,
      status: 'completed',
      path,
      turn_count: group.length,
      turn_results: group,
      history,
      final_state: {
        turn: lastResult.metadata.scenario_turn ?? group.length - 1,
        current_node: lastResult.metadata.scenario_node ?? '',
        verify_result: resolveVerdict(lastResult),
        parsed: lastResult.template?.parsed_llm_response ?? {},
        node_visits: nodeVisits,
        accumulated: {},
        node_results: {},
      },
      outcome_results: outcomesByScenario?.[scenarioId] ?? {},
    });
  }

  return { standaloneResults, scenarioResults };
}
