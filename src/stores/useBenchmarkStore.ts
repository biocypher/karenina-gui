import { create } from 'zustand';

/**
 * Benchmark evaluation settings store
 *
 * This store manages evaluation settings for the Benchmark tab that persist
 * across tab switches but reset on page refresh (no persistence middleware).
 */
interface BenchmarkState {
  // Evaluation Settings
  rubricEnabled: boolean;
  correctnessEnabled: boolean;
  fewShotEnabled: boolean;
  fewShotMode: 'all' | 'k-shot' | 'custom';
  fewShotK: number;

  // Actions
  setRubricEnabled: (enabled: boolean) => void;
  setCorrectnessEnabled: (enabled: boolean) => void;
  setFewShotEnabled: (enabled: boolean) => void;
  setFewShotMode: (mode: 'all' | 'k-shot' | 'custom') => void;
  setFewShotK: (k: number) => void;
}

export const useBenchmarkStore = create<BenchmarkState>((set) => ({
  // Initial state - default evaluation settings
  rubricEnabled: false,
  correctnessEnabled: true,
  fewShotEnabled: false,
  fewShotMode: 'all',
  fewShotK: 3,

  // Actions
  setRubricEnabled: (enabled) => set({ rubricEnabled: enabled }),
  setCorrectnessEnabled: (enabled) => set({ correctnessEnabled: enabled }),
  setFewShotEnabled: (enabled) => set({ fewShotEnabled: enabled }),
  setFewShotMode: (mode) => set({ fewShotMode: mode }),
  setFewShotK: (k) => set({ fewShotK: k }),
}));
