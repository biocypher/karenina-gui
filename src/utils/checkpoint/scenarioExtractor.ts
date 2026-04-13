/**
 * Scenario Definition Extractor
 * Converts scenario data from JSON-LD checkpoint hasPart field
 * into ScenarioDefinition[] for the curation store.
 */

import type { ScenarioDefinition, ScenarioNode, ScenarioEdge, ScenarioOutcomeCriterion } from '../../types/scenario';
import type { JsonLdCheckpoint } from '../../types/checkpoint';

/**
 * Extract scenario definitions from a JSON-LD checkpoint's hasPart field.
 *
 * The Python backend stores scenarios in SchemaOrgDataFeed.hasPart as
 * objects with @type "karenina:Scenario". This function filters for those
 * entries and converts them to the frontend ScenarioDefinition type,
 * mapping camelCase JSON-LD fields to snake_case TypeScript fields.
 */
export function extractScenarioDefinitions(checkpoint: JsonLdCheckpoint): ScenarioDefinition[] {
  if (!checkpoint.hasPart || !Array.isArray(checkpoint.hasPart)) return [];

  return checkpoint.hasPart
    .filter((part) => part['@type'] === 'karenina:Scenario')
    .map((scenario) => {
      const nodes: Record<string, ScenarioNode> = {};
      for (const [nodeId, snode] of Object.entries(scenario.nodes)) {
        nodes[nodeId] = {
          node_id: snode.nodeId ?? nodeId,
          question: {
            question_id: nodeId,
            text: snode.question.text,
            raw_answer: snode.question.acceptedAnswer?.text,
          },
          model_override: snode.modelOverride ?? undefined,
          agent_identity: snode.agentIdentity ?? undefined,
          metadata: snode.metadata,
        };
      }

      const edges: ScenarioEdge[] = scenario.edges.map((e) => ({
        source: e.source,
        target: e.target,
        condition: e.condition ?? undefined,
        condition_source: e.conditionSource ?? undefined,
        handover: e.handover ?? undefined,
      }));

      const outcome_criteria: ScenarioOutcomeCriterion[] = (scenario.outcomeCriteria ?? []).map((c) => ({
        name: c.name,
        description: c.description ?? '',
        check: c.check ?? undefined,
        evaluate_source: c.evaluateSource ?? undefined,
      }));

      return {
        name: scenario.name,
        description: scenario.description ?? '',
        nodes,
        edges,
        entry_node: scenario.entryNode,
        outcome_criteria,
        metadata: scenario.metadata,
      };
    });
}
