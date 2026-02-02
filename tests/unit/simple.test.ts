import { describe, it, expect } from 'vitest';

describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to vitest globals', () => {
    expect(vi).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have mocked browser APIs', () => {
    expect(window.localStorage).toBeDefined();
    expect(window.sessionStorage).toBeDefined();
    expect(window.URL.createObjectURL).toBeDefined();
    expect(navigator.clipboard).toBeDefined();
    expect(global.fetch).toBeDefined();
  });
});
