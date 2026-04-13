import type { VerificationResult } from '../../types/verification';

/**
 * Resolve the verify_result to a boolean or null.
 *
 * verify_result is typed as VerificationOutcome | null but in practice
 * the backend may send a plain boolean. Handle both shapes.
 */
export function resolveVerdict(result: VerificationResult): boolean | null {
  const vr = result.template?.verify_result;
  if (vr == null) return null;
  if (typeof vr === 'boolean') return vr;
  if (typeof vr === 'object' && 'completed_without_errors' in vr) {
    return vr.completed_without_errors;
  }
  return null;
}
