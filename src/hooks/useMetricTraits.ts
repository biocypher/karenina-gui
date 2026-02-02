import { MetricRubricTrait, Rubric } from '../types';

type MetricName = 'precision' | 'recall' | 'specificity' | 'accuracy' | 'f1';

// Valid metrics for each evaluation mode
export const VALID_METRICS_TP_ONLY = ['precision', 'recall', 'f1'] as const;
export const VALID_METRICS_FULL_MATRIX = ['precision', 'recall', 'specificity', 'accuracy', 'f1'] as const;

// Metric requirements (which confusion matrix values are needed)
export const METRIC_REQUIREMENTS: Record<MetricName, string[]> = {
  precision: ['tp', 'fp'],
  recall: ['tp', 'fn'],
  specificity: ['tn', 'fp'],
  accuracy: ['tp', 'tn', 'fp', 'fn'],
  f1: ['tp', 'fp', 'fn'],
};

export interface UseMetricTraitsOptions {
  questionId: string;
  questionRubric: Rubric | null;
  setQuestionRubric: (questionId: string, rubric: Rubric) => void;
  setQuestionRubricState: React.Dispatch<React.SetStateAction<Rubric | null>>;
  setLastError: (error: string | null) => void;
}

export interface UseMetricTraitsReturn {
  handleAddMetricTrait: () => void;
  handleRemoveMetricTrait: (index: number) => void;
  handleMetricTraitChange: (index: number, field: keyof MetricRubricTrait, value: string | string[] | boolean) => void;
  getAvailableMetrics: (evaluationMode: 'tp_only' | 'full_matrix') => readonly MetricName[];
  getMetricRequirements: (metric: MetricName) => string[];
}

/**
 * Hook for managing metric traits in rubrics.
 * Handles CRUD operations for metric traits with validation.
 */
export function useMetricTraits({
  questionId,
  questionRubric,
  setQuestionRubric,
  setQuestionRubricState,
  setLastError,
}: UseMetricTraitsOptions): UseMetricTraitsReturn {
  const handleAddMetricTrait = () => {
    if (!questionRubric) return;

    const newMetricTrait: MetricRubricTrait = {
      name: 'Metric Trait',
      description: '',
      evaluation_mode: 'tp_only',
      metrics: ['precision', 'recall', 'f1'],
      instructions: '',
      bucket_requirements: {
        tp: [],
        fp: [],
        tn: [],
        fn: [],
      },
      weight: 1.0,
      repeated_extraction: false,
      repeated_extraction_count: 1,
      aggregations: [],
      aggregation_mode: 'mean',
    };

    const updatedMetricTraits = [...(questionRubric.metric_traits || []), newMetricTrait];
    const updatedRubric = { ...questionRubric, metric_traits: updatedMetricTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleRemoveMetricTrait = (index: number) => {
    if (!questionRubric?.metric_traits || index < 0 || index >= questionRubric.metric_traits.length) return;

    const updatedMetricTraits = (questionRubric.metric_traits || []).filter((_, i) => i !== index);
    const updatedRubric = { ...questionRubric, metric_traits: updatedMetricTraits };

    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const handleMetricTraitChange = (
    index: number,
    field: keyof MetricRubricTrait,
    value: string | string[] | boolean
  ) => {
    if (!questionRubric?.metric_traits || index < 0 || index >= questionRubric.metric_traits.length) return;

    const currentTrait = questionRubric.metric_traits[index];
    const updatedTrait: MetricRubricTrait = { ...currentTrait, [field]: value };

    // If evaluation_mode changes, update available metrics
    if (field === 'evaluation_mode') {
      const evaluationMode = value as 'tp_only' | 'full_matrix';
      const availableMetrics = getAvailableMetrics(evaluationMode);
      updatedTrait.metrics = availableMetrics as string[];
    }

    // Validate bucket requirements when metrics change
    if (field === 'metrics') {
      const metrics = value as string[];
      const missingRequirements: string[] = [];

      metrics.forEach((metric) => {
        const required = METRIC_REQUIREMENTS[metric as MetricName];
        required.forEach((bucket) => {
          if (!updatedTrait.bucket_requirements[bucket as keyof typeof updatedTrait.bucket_requirements]) {
            missingRequirements.push(bucket);
          }
        });
      });

      if (missingRequirements.length > 0) {
        setLastError(`Missing required buckets: ${missingRequirements.join(', ')}`);
        return;
      }
    }

    const updatedMetricTraits = [...questionRubric.metric_traits];
    updatedMetricTraits[index] = updatedTrait;

    const updatedRubric = { ...questionRubric, metric_traits: updatedMetricTraits };
    setQuestionRubricState(updatedRubric);
    setQuestionRubric(questionId, updatedRubric);
    setLastError(null);
  };

  const getAvailableMetrics = (evaluationMode: 'tp_only' | 'full_matrix'): readonly MetricName[] => {
    return evaluationMode === 'tp_only' ? VALID_METRICS_TP_ONLY : VALID_METRICS_FULL_MATRIX;
  };

  const getMetricRequirements = (metric: MetricName): string[] => {
    return METRIC_REQUIREMENTS[metric];
  };

  return {
    handleAddMetricTrait,
    handleRemoveMetricTrait,
    handleMetricTraitChange,
    getAvailableMetrics,
    getMetricRequirements,
  };
}
