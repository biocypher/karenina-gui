import type {
  CurationExport,
  CurationSessionExport,
  CurationJudgmentEntry,
  ScenarioCurationEntry,
  Curator,
  TraitJudgment,
} from '../../types/curation';
import type { Checkpoint } from '../../types/checkpoint';
import type { VerificationResult } from '../../types/verification';
import type { ScenarioDefinition, ScenarioExecutionResult } from '../../types/scenario';

export interface ExportInput {
  curators: Curator[];
  templateJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  rubricJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  curatedFlags: Record<string, Record<string, boolean>>;
  scenarioTemplateJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioRubricJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioCuratedFlags: Record<string, Record<string, boolean>>;
  sourceMetadata: { checkpointName: string; jobId: string; kareninaVersion: string } | null;
}

export function buildCurationExport(input: ExportInput): CurationExport {
  const now = new Date().toISOString();

  const judgments: CurationJudgmentEntry[] = [];
  const scenarioJudgments: ScenarioCurationEntry[] = [];

  for (const curator of input.curators) {
    const cId = curator.id;

    // Collect all result IDs this curator has interacted with
    const resultIds = new Set<string>([
      ...Object.keys(input.templateJudgments[cId] ?? {}),
      ...Object.keys(input.rubricJudgments[cId] ?? {}),
      ...Object.keys(input.curatedFlags[cId] ?? {}),
    ]);

    for (const resultId of resultIds) {
      judgments.push({
        result_id: resultId,
        curator_id: cId,
        curated: input.curatedFlags[cId]?.[resultId] ?? false,
        timestamp: now,
        template_judgments: input.templateJudgments[cId]?.[resultId] ?? {},
        rubric_judgments: input.rubricJudgments[cId]?.[resultId] ?? {},
      });
    }

    // Collect scenario IDs
    const scenarioIds = new Set<string>([
      ...Object.keys(input.scenarioTemplateJudgments[cId] ?? {}),
      ...Object.keys(input.scenarioRubricJudgments[cId] ?? {}),
      ...Object.keys(input.scenarioCuratedFlags[cId] ?? {}),
    ]);

    for (const scenarioId of scenarioIds) {
      const nodeIds = new Set<string>([
        ...Object.keys(input.scenarioTemplateJudgments[cId]?.[scenarioId] ?? {}),
        ...Object.keys(input.scenarioRubricJudgments[cId]?.[scenarioId] ?? {}),
      ]);

      const nodeJudgments: ScenarioCurationEntry['node_judgments'] = {};
      for (const nodeId of nodeIds) {
        nodeJudgments[nodeId] = {
          result_id: nodeId,
          template_judgments: input.scenarioTemplateJudgments[cId]?.[scenarioId]?.[nodeId] ?? {},
          rubric_judgments: input.scenarioRubricJudgments[cId]?.[scenarioId]?.[nodeId] ?? {},
        };
      }

      scenarioJudgments.push({
        scenario_id: scenarioId,
        curator_id: cId,
        curated: input.scenarioCuratedFlags[cId]?.[scenarioId] ?? false,
        timestamp: now,
        node_judgments: nodeJudgments,
      });
    }
  }

  return {
    format_version: '1.0',
    metadata: {
      export_timestamp: now,
      karenina_version: input.sourceMetadata?.kareninaVersion ?? 'unknown',
      source_checkpoint: input.sourceMetadata?.checkpointName ?? 'unknown',
      source_results_job_id: input.sourceMetadata?.jobId ?? 'unknown',
    },
    curators: input.curators,
    judgments,
    scenario_judgments: scenarioJudgments,
  };
}

export interface SessionExportInput extends ExportInput {
  checkpoint: Checkpoint;
  results: VerificationResult[];
  scenarioDefinitions: ScenarioDefinition[];
  scenarioResults: ScenarioExecutionResult[];
}

/** Build a self-contained v2.0 session export with checkpoint, results, and judgments. */
export function buildSessionExport(input: SessionExportInput): CurationSessionExport {
  const v1 = buildCurationExport(input);
  return {
    format_version: '2.0',
    metadata: v1.metadata,
    session_data: {
      checkpoint: input.checkpoint,
      results: input.results,
      scenario_definitions: input.scenarioDefinitions,
      scenario_results: input.scenarioResults,
    },
    curators: v1.curators,
    judgments: v1.judgments,
    scenario_judgments: v1.scenario_judgments,
  };
}
