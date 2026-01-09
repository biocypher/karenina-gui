import { Rubric } from '../types';

export interface TraitValidationOptions {
  globalRubric: Rubric | null;
  questionRubric: Rubric | null;
}

export interface TraitValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface UseTraitValidationReturn {
  validateTraitName: (name: string, excludeIndex?: number, isRegexTrait?: boolean) => TraitValidationResult;
  isTraitNameUnique: (name: string, excludeIndex?: number, isRegexTrait?: boolean) => boolean;
}

/**
 * Hook for validating rubric traits.
 * Checks for trait name conflicts across global and question rubrics.
 */
export function useTraitValidation({ globalRubric, questionRubric }: TraitValidationOptions): UseTraitValidationReturn {
  const isTraitNameUnique = (name: string, excludeIndex?: number, isRegexTrait?: boolean): boolean => {
    const lowerName = name.toLowerCase();

    // Build list of existing names excluding the current trait being edited
    const existingNames: string[] = [];

    // Global LLM traits
    if (globalRubric?.llm_traits) {
      existingNames.push(...globalRubric.llm_traits.map((t) => t.name.toLowerCase()));
    }

    // Global regex traits
    if (globalRubric?.regex_traits) {
      existingNames.push(...globalRubric.regex_traits.map((t) => t.name.toLowerCase()));
    }

    // Question LLM traits (excluding current if editing)
    if (questionRubric?.llm_traits) {
      existingNames.push(
        ...(questionRubric.llm_traits
          .map((t, i) => (isRegexTrait || i !== excludeIndex ? t.name.toLowerCase() : null))
          .filter(Boolean) as string[])
      );
    }

    // Question regex traits (excluding current if editing)
    if (questionRubric?.regex_traits) {
      existingNames.push(
        ...(questionRubric.regex_traits
          .map((t, i) => (isRegexTrait || i !== excludeIndex ? t.name.toLowerCase() : null))
          .filter(Boolean) as string[])
      );
    }

    return !existingNames.includes(lowerName);
  };

  const validateTraitName = (name: string, excludeIndex?: number, isRegexTrait?: boolean): TraitValidationResult => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Trait name cannot be empty' };
    }

    if (!isTraitNameUnique(name, excludeIndex, isRegexTrait)) {
      return { isValid: false, error: `Trait with name "${name}" already exists` };
    }

    return { isValid: true, error: null };
  };

  return {
    validateTraitName,
    isTraitNameUnique,
  };
}
