import type { CurationExport, CurationSessionExport, Curator, TraitJudgment } from '../../types/curation';
import type { Checkpoint } from '../../types/checkpoint';
import type { VerificationResult } from '../../types/verification';
import type { ScenarioDefinition, ScenarioExecutionResult } from '../../types/scenario';

/** Type guard: accepts both v1.0 and v2.0 curation exports. */
export function isCurationExport(data: unknown): data is CurationExport | CurationSessionExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  const validVersion = obj.format_version === '1.0' || obj.format_version === '2.0';
  return (
    validVersion &&
    typeof obj.metadata === 'object' &&
    Array.isArray(obj.curators) &&
    Array.isArray(obj.judgments) &&
    Array.isArray(obj.scenario_judgments)
  );
}

/** Type guard: true only for v2.0 session exports with session_data. */
export function isSessionExport(data: unknown): data is CurationSessionExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return obj.format_version === '2.0' && typeof obj.session_data === 'object' && obj.session_data !== null;
}

export interface ParsedCuration {
  curators: Curator[];
  templateJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  rubricJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  curatedFlags: Record<string, Record<string, boolean>>;
  scenarioTemplateJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioRubricJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioCuratedFlags: Record<string, Record<string, boolean>>;
}

export interface ParsedSession extends ParsedCuration {
  sessionData: {
    checkpoint: Checkpoint;
    results: VerificationResult[];
    scenarioDefinitions: ScenarioDefinition[];
    scenarioResults: ScenarioExecutionResult[];
  };
  sourceMetadata: { checkpointName: string; jobId: string; kareninaVersion: string };
}

/** Restructure flat judgment arrays into store-shaped nested maps. */
function parseJudgmentsFromExport(data: {
  curators: Curator[];
  judgments: CurationExport['judgments'];
  scenario_judgments: CurationExport['scenario_judgments'];
}): ParsedCuration {
  const templateJudgments: ParsedCuration['templateJudgments'] = {};
  const rubricJudgments: ParsedCuration['rubricJudgments'] = {};
  const curatedFlags: ParsedCuration['curatedFlags'] = {};
  const scenarioTemplateJudgments: ParsedCuration['scenarioTemplateJudgments'] = {};
  const scenarioRubricJudgments: ParsedCuration['scenarioRubricJudgments'] = {};
  const scenarioCuratedFlags: ParsedCuration['scenarioCuratedFlags'] = {};

  for (const j of data.judgments) {
    const cId = j.curator_id;
    const rId = j.result_id;
    if (!templateJudgments[cId]) templateJudgments[cId] = {};
    if (!rubricJudgments[cId]) rubricJudgments[cId] = {};
    if (!curatedFlags[cId]) curatedFlags[cId] = {};

    if (Object.keys(j.template_judgments).length > 0) {
      templateJudgments[cId][rId] = j.template_judgments;
    }
    if (Object.keys(j.rubric_judgments).length > 0) {
      rubricJudgments[cId][rId] = j.rubric_judgments;
    }
    if (j.curated) {
      curatedFlags[cId][rId] = true;
    }
  }

  for (const sj of data.scenario_judgments) {
    const cId = sj.curator_id;
    const sId = sj.scenario_id;
    if (!scenarioTemplateJudgments[cId]) scenarioTemplateJudgments[cId] = {};
    if (!scenarioRubricJudgments[cId]) scenarioRubricJudgments[cId] = {};
    if (!scenarioCuratedFlags[cId]) scenarioCuratedFlags[cId] = {};

    if (!scenarioTemplateJudgments[cId][sId]) scenarioTemplateJudgments[cId][sId] = {};
    if (!scenarioRubricJudgments[cId][sId]) scenarioRubricJudgments[cId][sId] = {};

    for (const [nodeId, nodeJ] of Object.entries(sj.node_judgments)) {
      const nj = nodeJ as {
        result_id: string;
        template_judgments: Record<string, TraitJudgment>;
        rubric_judgments: Record<string, TraitJudgment>;
      };
      if (Object.keys(nj.template_judgments).length > 0) {
        scenarioTemplateJudgments[cId][sId][nodeId] = nj.template_judgments;
      }
      if (Object.keys(nj.rubric_judgments).length > 0) {
        scenarioRubricJudgments[cId][sId][nodeId] = nj.rubric_judgments;
      }
    }
    if (sj.curated) {
      scenarioCuratedFlags[cId][sId] = true;
    }
  }

  return {
    curators: data.curators,
    templateJudgments,
    rubricJudgments,
    curatedFlags,
    scenarioTemplateJudgments,
    scenarioRubricJudgments,
    scenarioCuratedFlags,
  };
}

/** Parse a v1.0 or v2.0 curation file, extracting only judgment data. */
export function parseCurationJSON(jsonString: string): ParsedCuration {
  const data = JSON.parse(jsonString);
  if (!isCurationExport(data)) {
    throw new Error(
      'Invalid curation file: expected format_version "1.0" or "2.0" with curators, judgments, and scenario_judgments arrays.'
    );
  }
  return parseJudgmentsFromExport(data);
}

/** Parse a v2.0 session file, extracting session data and judgments. */
export function parseSessionJSON(jsonString: string): ParsedSession {
  const data = JSON.parse(jsonString);
  if (!isSessionExport(data)) {
    throw new Error('Invalid session file: expected format_version "2.0" with session_data.');
  }

  const judgments = parseJudgmentsFromExport(data);

  return {
    ...judgments,
    sessionData: {
      checkpoint: data.session_data.checkpoint,
      results: data.session_data.results,
      scenarioDefinitions: data.session_data.scenario_definitions,
      scenarioResults: data.session_data.scenario_results,
    },
    sourceMetadata: {
      checkpointName: data.metadata.source_checkpoint,
      jobId: data.metadata.source_results_job_id,
      kareninaVersion: data.metadata.karenina_version,
    },
  };
}
