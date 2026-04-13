import { describe, it, expect } from 'vitest';
import { buildCurationExport } from '../../utils/curation/exportCuration';
import type { Curator, TraitJudgment } from '../../types/curation';

const curator: Curator = { id: 'c1', name: 'Dr. Smith', metadata: {} };
const judgment: TraitJudgment = { judgment: 'agree', confidence: 4, note: 'ok' };

describe('buildCurationExport', () => {
  it('builds valid export with correct format_version', () => {
    const result = buildCurationExport({
      curators: [curator],
      templateJudgments: { c1: { r1: { field1: judgment } } },
      rubricJudgments: { c1: { r1: { trait1: judgment } } },
      curatedFlags: { c1: { r1: true } },
      scenarioTemplateJudgments: {},
      scenarioRubricJudgments: {},
      scenarioCuratedFlags: {},
      sourceMetadata: { checkpointName: 'test', jobId: 'job1', kareninaVersion: '0.42.0' },
    });

    expect(result.format_version).toBe('1.0');
    expect(result.curators).toHaveLength(1);
    expect(result.judgments).toHaveLength(1);
    expect(result.judgments[0].result_id).toBe('r1');
    expect(result.judgments[0].template_judgments.field1.judgment).toBe('agree');
    expect(result.judgments[0].rubric_judgments.trait1.judgment).toBe('agree');
    expect(result.judgments[0].curated).toBe(true);
  });

  it('produces entries for all curators', () => {
    const c2: Curator = { id: 'c2', name: 'Dr. Jones', metadata: {} };
    const result = buildCurationExport({
      curators: [curator, c2],
      templateJudgments: {
        c1: { r1: { f1: judgment } },
        c2: { r1: { f1: { judgment: 'disagree', confidence: null, note: null } } },
      },
      rubricJudgments: {},
      curatedFlags: {},
      scenarioTemplateJudgments: {},
      scenarioRubricJudgments: {},
      scenarioCuratedFlags: {},
      sourceMetadata: { checkpointName: 'test', jobId: 'job1', kareninaVersion: '0.42.0' },
    });

    expect(result.judgments).toHaveLength(2);
    expect(result.judgments.map((j) => j.curator_id).sort()).toEqual(['c1', 'c2']);
  });
});
