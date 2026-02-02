/**
 * Summary Statistics types
 * Data structures for verification result summaries and statistics
 */

export interface TokenUsage {
  total_input: number;
  total_input_std: number;
  total_output: number;
  total_output_std: number;
  template_input: number;
  template_input_std: number;
  template_output: number;
  template_output_std: number;
  rubric_input: number;
  rubric_input_std: number;
  rubric_output: number;
  rubric_output_std: number;
  deep_judgment_input?: number;
  deep_judgment_input_std?: number;
  deep_judgment_output?: number;
  deep_judgment_output_std?: number;
  // Median tokens per question (aggregated over questions and replicates)
  median_per_question_input: number;
  median_per_question_input_std: number;
  median_per_question_output: number;
  median_per_question_output_std: number;
}

export interface PassRateStats {
  total: number;
  passed: number;
  pass_pct: number;
}

export interface ReplicatePassRate {
  total: number;
  passed: number;
  pass_pct: number;
  pass_rate: number;
}

export interface ReplicateStats {
  replicate_pass_rates: Record<number, ReplicatePassRate>;
  replicate_summary: {
    mean: number;
    std: number;
  };
}

export interface TraitBreakdown {
  count: number;
  names: string[];
}

export interface RubricTraitStats {
  global_traits: {
    llm: TraitBreakdown;
    regex: TraitBreakdown;
    callable: TraitBreakdown;
    metric: TraitBreakdown;
  };
  question_specific_traits: {
    llm: TraitBreakdown;
    regex: TraitBreakdown;
    callable: TraitBreakdown;
    metric: TraitBreakdown;
  };
}

// Tool usage statistics for summary
export interface ToolUsageStats {
  tools: Record<
    string,
    {
      total_calls: number;
      traces_using: number;
      avg_calls_per_trace: number;
    }
  >;
  total_traces_with_tools: number;
  total_tool_calls: number;
}

export interface TraceLengthStats {
  median_iterations: number;
  mean_iterations: number;
  std_iterations: number;
  min_iterations: number;
  max_iterations: number;
  num_traces: number;
}

export interface SummaryStats {
  // Basic counts
  num_results: number;
  num_completed: number;
  num_with_template: number;
  num_with_rubric: number;
  num_with_judgment: number;
  num_questions: number;
  num_models: number;
  num_parsing_models: number;
  num_replicates: number;

  // Execution
  total_execution_time: number;

  // Token usage
  tokens: TokenUsage;
  tokens_by_combo: Record<
    string,
    {
      input: number;
      output: number;
      total: number;
    }
  >;

  // Completion status
  completion_by_combo: Record<
    string,
    {
      total: number;
      completed: number;
      completion_pct: number;
    }
  >;

  // Template pass rates
  template_pass_by_combo: Record<string, PassRateStats>;
  template_pass_overall: PassRateStats;

  // Rubric traits (optional)
  rubric_traits?: RubricTraitStats;

  // Replicate statistics (optional)
  replicate_stats?: ReplicateStats;

  // Tool usage statistics (optional - only present when agents are used)
  tool_usage_stats?: ToolUsageStats;

  // Trace length statistics
  trace_length_stats?: TraceLengthStats;
}

export interface SummaryRequest {
  results: Record<string, import('./verification').VerificationResult>;
  run_name?: string | null;
}
