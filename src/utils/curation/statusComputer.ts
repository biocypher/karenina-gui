import type { CurationStatus, TraitJudgment } from '../../types/curation';

type JudgmentMap = Record<string, Record<string, Record<string, TraitJudgment>>>;
type FlagMap = Record<string, Record<string, boolean>>;

export function computeResultStatus(
  resultId: string,
  curatorId: string,
  templateJudgments: JudgmentMap,
  rubricJudgments: JudgmentMap,
  curatedFlags: FlagMap
): CurationStatus {
  if (curatedFlags[curatorId]?.[resultId]) return 'curated';
  const hasTemplate = Object.keys(templateJudgments[curatorId]?.[resultId] ?? {}).length > 0;
  const hasRubric = Object.keys(rubricJudgments[curatorId]?.[resultId] ?? {}).length > 0;
  if (hasTemplate || hasRubric) return 'partial';
  return 'pending';
}

export interface StatusCounts {
  curated: number;
  partial: number;
  pending: number;
}

export function computeStatusCounts(
  resultIds: string[],
  curatorId: string,
  templateJudgments: JudgmentMap,
  rubricJudgments: JudgmentMap,
  curatedFlags: FlagMap
): StatusCounts {
  const counts: StatusCounts = { curated: 0, partial: 0, pending: 0 };
  for (const id of resultIds) {
    counts[computeResultStatus(id, curatorId, templateJudgments, rubricJudgments, curatedFlags)]++;
  }
  return counts;
}
