import type { VerificationResult, VerificationResultMetadata } from '../types/verification';
import { makeMetadata } from './metadata';

/**
 * Minimal factory for a VerificationResult keyed on metadata overrides.
 *
 * Metadata overrides land on the metadata subobject; template/rubric/etc
 * can be passed through separately by merging the returned object.
 */
export function makeResult(
  overrides: Partial<VerificationResultMetadata> & {
    template?: VerificationResult['template'];
    rubric?: VerificationResult['rubric'];
    raw_answer?: string;
  } = {}
): VerificationResult {
  const { template, rubric, raw_answer, ...metadataOverrides } = overrides;
  const result: VerificationResult = {
    metadata: makeMetadata(metadataOverrides),
  };
  if (template) result.template = template;
  if (rubric) result.rubric = rubric;
  if (raw_answer !== undefined) result.raw_answer = raw_answer;
  return result;
}
