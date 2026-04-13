import type { CurationExport, Curator, TraitJudgment } from '../../types/curation';

export function isCurationExport(data: unknown): data is CurationExport {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.format_version === '1.0' &&
    typeof obj.metadata === 'object' &&
    Array.isArray(obj.curators) &&
    Array.isArray(obj.judgments) &&
    Array.isArray(obj.scenario_judgments)
  );
}

interface ParsedCuration {
  curators: Curator[];
  templateJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  rubricJudgments: Record<string, Record<string, Record<string, TraitJudgment>>>;
  curatedFlags: Record<string, Record<string, boolean>>;
  scenarioTemplateJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioRubricJudgments: Record<string, Record<string, Record<string, Record<string, TraitJudgment>>>>;
  scenarioCuratedFlags: Record<string, Record<string, boolean>>;
}

export function parseCurationJSON(jsonString: string): ParsedCuration {
  const data = JSON.parse(jsonString);
  if (!isCurationExport(data)) {
    throw new Error(
      'Invalid curation file: expected format_version "1.0" with curators, judgments, and scenario_judgments arrays.'
    );
  }

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
