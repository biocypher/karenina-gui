import { describe, it, expect } from 'vitest';
import { generatePreview } from '../previewGenerator';

describe('generatePreview', () => {
  it('generates BooleanMatch preview with true ground truth', () => {
    const result = generatePreview('BooleanMatch', true, {});
    expect(result.pass.output).toBe('Yes');
    expect(result.pass.verdict).toBe('pass');
    expect(result.fail.output).toBe('No');
    expect(result.fail.verdict).toBe('fail');
  });

  it('generates BooleanMatch preview with false ground truth', () => {
    const result = generatePreview('BooleanMatch', false, {});
    expect(result.pass.output).toBe('No');
    expect(result.fail.output).toBe('Yes');
  });

  it('generates ExactMatch preview for string', () => {
    const result = generatePreview('ExactMatch', 'aspirin', {});
    expect(result.expected).toBe('"aspirin"');
    expect(result.pass.output).toContain('aspirin');
    expect(result.pass.verdict).toBe('pass');
    expect(result.fail.verdict).toBe('fail');
  });

  it('generates NumericTolerance preview', () => {
    const result = generatePreview('NumericTolerance', 3.14, { tolerance: 0.05 });
    expect(result.expected).toBe('3.14');
    expect(result.pass.verdict).toBe('pass');
    expect(result.pass.explanation).toContain('0.05');
    expect(result.fail.verdict).toBe('fail');
  });

  it('generates SetContainment preview', () => {
    const result = generatePreview('SetContainment', ['BRCA1', 'TP53'], {});
    expect(result.pass.verdict).toBe('pass');
    expect(result.fail.verdict).toBe('fail');
    expect(result.fail.explanation).toContain('missing');
  });

  it('generates LiteralMatch preview', () => {
    const result = generatePreview('LiteralMatch', 'high', { literal_values: ['low', 'medium', 'high'] });
    expect(result.pass.output).toContain('high');
    expect(result.fail.verdict).toBe('fail');
  });

  it('generates DateMatch preview', () => {
    const result = generatePreview('DateMatch', '2025-01-15', {});
    expect(result.pass.output).toContain('2025-01-15');
    expect(result.fail.verdict).toBe('fail');
  });

  it('generates SemanticMatch preview with hypothetical scores', () => {
    const result = generatePreview('SemanticMatch', 'heart attack', { threshold: 0.8 });
    expect(result.pass.explanation).toContain('similarity');
    expect(result.fail.explanation).toContain('similarity');
  });

  it('returns placeholder preview when ground truth is empty', () => {
    const result = generatePreview('ExactMatch', '', {});
    expect(result.expected).toBeTruthy();
    expect(result.pass.verdict).toBe('pass');
    expect(result.fail.verdict).toBe('fail');
  });

  it('returns placeholder preview for unknown primitive', () => {
    const result = generatePreview('UnknownPrimitive', 'test', {});
    expect(result.pass.verdict).toBe('pass');
    expect(result.fail.verdict).toBe('fail');
  });
});
