import { describe, it, expect } from 'vitest';
import { parseCurationJSON, isCurationExport } from '../../utils/curation/importCuration';

describe('isCurationExport', () => {
  it('validates a correct curation export', () => {
    const data = {
      format_version: '1.0',
      metadata: { export_timestamp: '', karenina_version: '', source_checkpoint: '', source_results_job_id: '' },
      curators: [{ id: 'c1', name: 'Test', metadata: {} }],
      judgments: [],
      scenario_judgments: [],
    };
    expect(isCurationExport(data)).toBe(true);
  });

  it('rejects invalid data', () => {
    expect(isCurationExport({})).toBe(false);
    expect(isCurationExport({ format_version: '2.0' })).toBe(false);
    expect(isCurationExport(null)).toBe(false);
  });
});

describe('parseCurationJSON', () => {
  it('parses and restructures judgments into store format', () => {
    const exported = {
      format_version: '1.0',
      metadata: { export_timestamp: '', karenina_version: '', source_checkpoint: '', source_results_job_id: '' },
      curators: [{ id: 'c1', name: 'Test', metadata: {} }],
      judgments: [
        {
          result_id: 'r1',
          curator_id: 'c1',
          curated: true,
          timestamp: '',
          template_judgments: { f1: { judgment: 'agree', confidence: 4, note: null } },
          rubric_judgments: { t1: { judgment: 'disagree', confidence: null, note: 'wrong' } },
        },
      ],
      scenario_judgments: [],
    };

    const result = parseCurationJSON(JSON.stringify(exported));
    expect(result.curators).toHaveLength(1);
    expect(result.templateJudgments['c1']['r1']['f1'].judgment).toBe('agree');
    expect(result.rubricJudgments['c1']['r1']['t1'].judgment).toBe('disagree');
    expect(result.curatedFlags['c1']['r1']).toBe(true);
  });
});
