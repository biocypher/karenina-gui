import { describe, it, expect } from 'vitest';
import { computeResultStatus, computeStatusCounts } from '../../utils/curation/statusComputer';
import type { TraitJudgment } from '../../types/curation';

const judgment: TraitJudgment = { judgment: 'agree', confidence: null, note: null };

describe('computeResultStatus', () => {
  it('returns pending when no judgments exist', () => {
    expect(computeResultStatus('r1', 'c1', {}, {}, {})).toBe('pending');
  });

  it('returns partial when template judgments exist but not curated', () => {
    const tj = { c1: { r1: { field1: judgment } } };
    expect(computeResultStatus('r1', 'c1', tj, {}, {})).toBe('partial');
  });

  it('returns partial when rubric judgments exist but not curated', () => {
    const rj = { c1: { r1: { trait1: judgment } } };
    expect(computeResultStatus('r1', 'c1', {}, rj, {})).toBe('partial');
  });

  it('returns curated when flag is set', () => {
    const cf = { c1: { r1: true } };
    expect(computeResultStatus('r1', 'c1', {}, {}, cf)).toBe('curated');
  });
});

describe('computeStatusCounts', () => {
  it('counts across all results', () => {
    const resultIds = ['r1', 'r2', 'r3'];
    const tj = { c1: { r2: { f1: judgment } } };
    const cf = { c1: { r3: true } };
    const counts = computeStatusCounts(resultIds, 'c1', tj, {}, cf);
    expect(counts).toEqual({ curated: 1, partial: 1, pending: 1 });
  });
});
