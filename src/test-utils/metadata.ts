import type { VerificationResultMetadata } from '../types/verification';

/**
 * Minimal factory for a VerificationResultMetadata object.
 *
 * Defaults produce a passing result (failure: null, empty caveats) so tests
 * can focus on the fields that matter. Pass overrides to customize any field.
 */
export function makeMetadata(overrides: Partial<VerificationResultMetadata> = {}): VerificationResultMetadata {
  return {
    question_id: 'q1',
    template_id: 'tpl1',
    failure: null,
    caveats: [],
    question_text: 'What is 2+2?',
    answering: {
      interface: 'claude_sdk',
      model_name: 'claude-3-opus',
      tools: [],
    },
    parsing: {
      interface: 'claude_sdk',
      model_name: 'claude-3-haiku',
      tools: [],
    },
    execution_time: 1.0,
    timestamp: '2026-04-13T00:00:00Z',
    ...overrides,
  };
}
