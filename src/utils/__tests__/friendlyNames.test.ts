import { describe, it, expect } from 'vitest';
import {
  FRIENDLY_TYPE_NAMES,
  FRIENDLY_PRIMITIVE_NAMES,
  getFriendlyTypeName,
  getFriendlyPrimitiveName,
} from '../friendlyNames';

describe('FRIENDLY_TYPE_NAMES', () => {
  it('maps all 7 field types', () => {
    expect(Object.keys(FRIENDLY_TYPE_NAMES)).toHaveLength(7);
  });

  it.each([
    ['bool', 'Yes / No'],
    ['str', 'Text'],
    ['int', 'Whole Number'],
    ['float', 'Decimal Number'],
    ['list_str', 'List of Items'],
    ['literal', 'Pick One Option'],
    ['date', 'Date'],
  ])('maps %s to %s', (key, label) => {
    expect(FRIENDLY_TYPE_NAMES[key].label).toBe(label);
    expect(FRIENDLY_TYPE_NAMES[key].programmatic).toBe(key);
  });
});

describe('FRIENDLY_PRIMITIVE_NAMES', () => {
  it('maps all 18 primitives', () => {
    expect(Object.keys(FRIENDLY_PRIMITIVE_NAMES)).toHaveLength(18);
  });

  it.each([
    ['ExactMatch', 'Exact Match'],
    ['BooleanMatch', 'Yes/No Match'],
    ['NumericTolerance', 'Close Enough'],
    ['SetContainment', 'Contains All Items'],
    ['SemanticMatch', 'Similar Meaning'],
  ])('maps %s to %s', (key, label) => {
    expect(FRIENDLY_PRIMITIVE_NAMES[key].label).toBe(label);
  });
});

describe('getFriendlyTypeName', () => {
  it('returns friendly name for known type', () => {
    expect(getFriendlyTypeName('bool')).toBe('Yes / No');
  });

  it('returns raw type for unknown type', () => {
    expect(getFriendlyTypeName('unknown_type')).toBe('unknown_type');
  });
});

describe('getFriendlyPrimitiveName', () => {
  it('returns friendly name for known primitive', () => {
    expect(getFriendlyPrimitiveName('NumericTolerance')).toBe('Close Enough');
  });

  it('returns raw name for unknown primitive', () => {
    expect(getFriendlyPrimitiveName('CustomPrimitive')).toBe('CustomPrimitive');
  });
});
