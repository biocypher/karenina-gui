export interface Question {
  question: string;
  raw_answer: string;
  answer_template: string;
  metadata?: {
    author?: SchemaOrgPerson;
    url?: string;
    keywords?: string[];
  };
}

export interface QuestionData {
  [key: string]: Question;
}

// Schema.org compliant types for enhanced metadata
export interface SchemaOrgPerson {
  '@type': 'Person';
  name: string;
  email?: string;
  affiliation?: string;
  url?: string;
}

export interface SchemaOrgOrganization {
  '@type': 'Organization';
  name: string;
  description?: string;
  url?: string;
  email?: string;
}

export interface SchemaOrgCreativeWork {
  '@type': 'CreativeWork' | 'ScholarlyArticle' | 'WebPage';
  name: string;
  author?: SchemaOrgPerson;
  url?: string;
  datePublished?: string;
  publisher?: string;
  identifier?: string; // DOI, ISBN, etc.
  description?: string;
}

export interface CheckpointItem {
  // Original question data
  question: string;
  raw_answer: string;
  original_answer_template: string;

  // Progress data
  answer_template: string;
  date_created?: string; // When the question was first added to the checkpoint
  last_modified: string;
  finished: boolean;

  // Question-specific rubric
  question_rubric?: Rubric;

  // Few-shot examples for improved prompting
  few_shot_examples?: Array<{ question: string; answer: string }>;

  // Custom metadata properties
  custom_metadata?: { [key: string]: string };

  // Schema.org enhanced metadata
  author?: SchemaOrgPerson;
  sources?: SchemaOrgCreativeWork[];
  keywords?: string[];
}

export interface Checkpoint {
  [key: string]: CheckpointItem;
}

// Dataset-level metadata interface
export interface DatasetMetadata {
  // Basic dataset information
  name?: string;
  description?: string;
  version?: string;
  license?: string;
  keywords?: string[];

  // Schema.org compliance
  creator?: SchemaOrgPerson | SchemaOrgOrganization;
  publisher?: SchemaOrgOrganization;
  datePublished?: string;
  dateCreated?: string;
  dateModified?: string;

  // Custom properties
  custom_properties?: { [key: string]: string };
}

// Unified checkpoint structure that includes global rubric and dataset metadata
export interface UnifiedCheckpoint {
  version: '2.0';
  global_rubric: Rubric | null;
  dataset_metadata?: DatasetMetadata;
  checkpoint: Checkpoint;
}

// Duplicate resolution types
export interface DuplicateQuestionInfo {
  question_id: string;
  question_text: string;
  old_version: CheckpointItem & { last_modified: string };
  new_version: CheckpointItem & { last_modified: string };
}

export type DuplicateResolution = 'keep_old' | 'keep_new';

export interface DuplicateResolutions {
  [question_id: string]: DuplicateResolution;
}

// JSON-LD Checkpoint Types (schema.org vocabulary)
export interface JsonLdContext {
  '@context': {
    '@version': number;
    '@vocab': string;
    [key: string]: unknown;
  };
}

export interface SchemaOrgRating {
  '@type': 'Rating';
  '@id'?: string;
  name: string;
  description?: string;
  bestRating: number;
  worstRating: number;
  additionalType:
    | 'GlobalRubricTrait'
    | 'QuestionSpecificRubricTrait'
    | 'GlobalRegexTrait'
    | 'QuestionSpecificRegexTrait'
    | 'GlobalCallableTrait'
    | 'QuestionSpecificCallableTrait'
    | 'GlobalMetricRubricTrait'
    | 'QuestionSpecificMetricRubricTrait';
  ratingExplanation?: string;
  // Deep Judgment configuration (for LLM traits only)
  deep_judgment_enabled?: boolean;
  deep_judgment_excerpt_enabled?: boolean;
  deep_judgment_max_excerpts?: number;
  deep_judgment_fuzzy_match_threshold?: number;
  deep_judgment_excerpt_retry_attempts?: number;
  deep_judgment_search_enabled?: boolean;
}

export interface SchemaOrgPropertyValue {
  '@type': 'PropertyValue';
  name: string;
  value: unknown;
}

export interface SchemaOrgAnswer {
  '@type': 'Answer';
  '@id'?: string;
  text: string;
}

export interface SchemaOrgSoftwareSourceCode {
  '@type': 'SoftwareSourceCode';
  '@id'?: string;
  name?: string;
  text: string; // The Pydantic template code
  programmingLanguage: 'Python';
  codeRepository?: string;
}

export interface SchemaOrgQuestion {
  '@type': 'Question';
  '@id'?: string;
  text: string; // Question text
  acceptedAnswer: SchemaOrgAnswer;
  hasPart: SchemaOrgSoftwareSourceCode; // Pydantic template
  rating?: SchemaOrgRating[]; // Rubric trait evaluations
  additionalProperty?: SchemaOrgPropertyValue[]; // metadata like finished, original_template
}

export interface SchemaOrgDataFeedItem {
  '@type': 'DataFeedItem';
  '@id'?: string;
  dateCreated?: string;
  dateModified: string; // last_modified from v2.0
  item: SchemaOrgQuestion;
  keywords?: string[];
}

export interface SchemaOrgDataFeed extends JsonLdContext {
  '@type': 'DataFeed';
  '@id'?: string;
  name: string;
  description?: string;
  version: string; // '3.0.0-jsonld'
  creator?: string;
  dateCreated?: string;
  dateModified?: string;
  rating?: SchemaOrgRating[]; // Global rubric traits as Rating objects
  dataFeedElement: SchemaOrgDataFeedItem[];
  additionalProperty?: SchemaOrgPropertyValue[]; // format version, conversion metadata
}

// Type alias for the complete JSON-LD checkpoint
export type JsonLdCheckpoint = SchemaOrgDataFeed;

// Conversion mapping types
export interface RubricTraitToRatingMapping {
  rubricTrait: LLMRubricTrait;
  ratingValue?: number; // Set when trait is evaluated
  isEvaluated: boolean;
}

export interface CheckpointConversionMetadata {
  originalVersion: string;
  convertedAt: string;
  totalQuestions: number;
  totalRatings: number;
}

// Template Generation Types
export interface TemplateGenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual' | 'openai_endpoint';
  endpoint_base_url?: string;
  endpoint_api_key?: string;
}

export interface TemplateGenerationProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  start_time?: number; // Unix timestamp for client-side live clock calculation
  duration_seconds?: number;
  last_task_duration?: number;
  error?: string;
  result?: TemplateGenerationResult;
  in_progress_questions?: string[];
}

export interface GeneratedTemplate {
  question_id: string;
  template_code: string;
  generation_time: number; // milliseconds
  success: boolean;
  error_message?: string;
}

export interface TemplateGenerationResult {
  templates: Record<string, GeneratedTemplate>;
  total_templates: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time: number;
  model_info: {
    name: string;
    provider: string;
    temperature: number;
  };
}

// Extend Question interface to support template generation metadata
export interface QuestionWithTemplate extends Question {
  answer_template: string;
  generation_metadata?: {
    model_used: string;
    provider_used: string;
    generation_time: number;
    generated_at: string;
  };
}

// Benchmark Configuration Types
export interface ModelConfiguration {
  id: string;
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual';
  system_prompt: string;
  // MCP (Model Context Protocol) configuration
  mcp_urls_dict?: Record<string, string>;
  mcp_tool_filter?: string[];
  // Extra keyword arguments
  extra_kwargs?: Record<string, unknown>;
}

export interface VerificationConfig {
  answering_models: ModelConfiguration[];
  parsing_models: ModelConfiguration[];
  replicate_count: number;
  rubric_enabled?: boolean;
  evaluation_mode?: 'template_only' | 'template_and_rubric' | 'rubric_only'; // Evaluation mode selection
  rubric_trait_names?: string[];
  rubric_evaluation_strategy?: 'batch' | 'sequential'; // Strategy for evaluating LLM rubric traits
  abstention_enabled?: boolean; // Enable abstention/refusal detection
  few_shot_enabled?: boolean;
  few_shot_mode?: 'all' | 'k-shot' | 'custom';
  few_shot_k?: number;
}

/**
 * Metadata subclass - core identity and tracking fields
 */
export interface VerificationResultMetadata {
  question_id: string;
  template_id: string;
  completed_without_errors: boolean;
  error?: string;
  question_text: string;
  keywords?: string[];
  answering_model: string;
  parsing_model: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  execution_time: number;
  timestamp: string;
  run_name?: string;
  job_id?: string;
  answering_model_id?: string;
  parsing_model_id?: string;
  answering_replicate?: number;
  parsing_replicate?: number;
}

/**
 * Template subclass - answer generation and verification fields
 */
export interface VerificationResultTemplate {
  raw_llm_response: string;
  parsed_gt_response?: Record<string, unknown>;
  parsed_llm_response?: Record<string, unknown>;
  template_verification_performed?: boolean;
  verify_result?: VerificationOutcome | null;
  verify_granular_result?: GranularVerificationResult;
  // Embeddings
  embedding_check_performed?: boolean;
  embedding_similarity_score?: number;
  embedding_override_applied?: boolean;
  embedding_model_used?: string;
  // Regex checks
  regex_validations_performed?: boolean;
  regex_validation_results?: Record<string, boolean>;
  regex_validation_details?: Record<string, Record<string, unknown>>;
  regex_overall_success?: boolean;
  regex_extraction_results?: Record<string, unknown>;
  // Recursion limit
  recursion_limit_reached?: boolean;
  // Abstention
  abstention_check_performed?: boolean;
  abstention_detected?: boolean | null;
  abstention_override_applied?: boolean;
  abstention_reasoning?: string | null;
  // MCP
  answering_mcp_servers?: string[];
  // Usage
  usage_metadata?: Record<string, UsageMetadata>;
  agent_metrics?: {
    iterations?: number;
    tool_calls?: number;
    tools_used?: string[];
    suspect_failed_tool_calls?: number;
    suspect_failed_tools?: string[];
  };
}

/**
 * Rubric subclass - rubric evaluation with split trait types
 */
export interface VerificationResultRubric {
  rubric_evaluation_performed?: boolean;
  // Legacy flat rubric scores (deprecated, use split trait scores below)
  verify_rubric?: Record<string, number | boolean>;
  // Split trait scores by type
  llm_trait_scores?: Record<string, number>; // 1-5 scale
  regex_trait_scores?: Record<string, boolean>; // regex-based
  callable_trait_scores?: Record<string, boolean | number>; // boolean or score (1-5)
  metric_trait_scores?: Record<string, Record<string, number>>; // nested metrics dict
  evaluation_rubric?: Rubric;
  // Metric trait confusion matrices
  metric_trait_confusion_lists?: Record<
    string,
    {
      tp: string[];
      tn: string[];
      fp: string[];
      fn: string[];
    }
  >;
  metric_trait_metrics?: Record<string, Record<string, number>>;
  // Unified rubric results interface (computed property)
  rubric_results?: {
    llm?: Record<string, number>;
    regex?: Record<string, boolean>;
    callable?: Record<string, boolean | number>;
    metric?: Record<
      string,
      {
        metrics: Record<string, number>;
        confusion: {
          tp: string[];
          tn: string[];
          fp: string[];
          fn: string[];
        };
      }
    >;
  };
}

/**
 * Deep-judgment subclass - multi-stage parsing with excerpts
 */
export interface VerificationResultDeepJudgment {
  deep_judgment_enabled?: boolean;
  deep_judgment_performed?: boolean;
  extracted_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      explanation?: string;
      search_results?: SearchResultItem[];
      hallucination_risk?: string;
      hallucination_justification?: string;
    }>
  >;
  attribute_reasoning?: Record<string, string>;
  deep_judgment_stages_completed?: string[];
  deep_judgment_model_calls?: number;
  deep_judgment_excerpt_retry_count?: number;
  attributes_without_excerpts?: string[];
  // Search-enhanced deep-judgment
  deep_judgment_search_enabled?: boolean;
  hallucination_risk_assessment?: Record<string, string>;
}

/**
 * Deep-judgment metadata for rubric trait evaluation.
 *
 * This component stores enhanced evaluation data when deep-judgment is applied to rubric traits,
 * including extracted excerpts, reasoning, and hallucination risk assessments.
 */
export interface VerificationResultDeepJudgmentRubric {
  deep_judgment_rubric_performed: boolean;

  // Per-trait excerpts (only for traits with deep_judgment_excerpt_enabled=True)
  extracted_rubric_excerpts?: Record<
    string,
    Array<{
      text: string;
      confidence: string;
      similarity_score: number;
      search_results?: SearchResultItem[];
      hallucination_risk?: string;
      hallucination_justification?: string;
    }>
  >;

  // Per-trait reasoning (ALL deep-judgment-enabled traits)
  rubric_trait_reasoning?: Record<string, string>;

  // Per-trait scores from deep-judgment evaluation
  deep_judgment_rubric_scores?: Record<string, number | boolean>;

  // Standard evaluation scores (non-deep-judgment traits)
  standard_rubric_scores?: Record<string, number | boolean>;

  // Per-trait metadata
  trait_metadata?: Record<
    string,
    {
      stages_completed: string[];
      model_calls: number;
      had_excerpts: boolean;
      excerpt_retry_count: number;
      excerpt_validation_failed?: boolean;
    }
  >;

  // Auto-fail tracking
  traits_without_valid_excerpts?: string[];

  // Search-enhanced metadata
  rubric_hallucination_risk_assessment?: Record<
    string,
    {
      overall_risk: string;
      per_excerpt_risks: string[];
    }
  >;

  // Aggregated statistics
  total_deep_judgment_model_calls: number;
  total_traits_evaluated: number;
  total_excerpt_retries: number;
}

/**
 * VerificationResult interface with nested structure.
 *
 * MUST mirror backend VerificationResult model exactly.
 *
 * BREAKING CHANGE: Now uses nested composition instead of flat structure.
 * When adding fields: Update the appropriate subinterface.
 * See docs: .agents/dev/recurring-issues.md#issue-1-gui-export-sync-when-adding-verificationresult-fields
 */
export interface VerificationResult {
  metadata: VerificationResultMetadata;
  template?: VerificationResultTemplate;
  rubric?: VerificationResultRubric;
  deep_judgment?: VerificationResultDeepJudgment;
  deep_judgment_rubric?: VerificationResultDeepJudgmentRubric;
}

// Helper interface for LLM usage metadata
export interface UsageMetadata {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  model?: string;
  input_token_details?: {
    audio?: number;
    cache_read?: number;
  };
  output_token_details?: {
    audio?: number;
    reasoning?: number;
  };
}

export interface VerificationProgress {
  job_id: string;
  status: string;
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  successful_count: number;
  failed_count: number;
  start_time?: number; // Unix timestamp for client-side live clock calculation
  duration_seconds?: number;
  last_task_duration?: number;
  error?: string;
  results?: Record<string, VerificationResult>;
  in_progress_questions?: string[];
}

// Rubric Types
export type TraitKind = 'boolean' | 'score';

export interface LLMRubricTrait {
  name: string;
  description?: string;
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
  // Deep Judgment fields
  deep_judgment_enabled?: boolean; // Enable deep judgment for this trait (default: false)
  deep_judgment_excerpt_enabled?: boolean; // Extract excerpts from answer (default: true)
  deep_judgment_max_excerpts?: number; // Maximum excerpts to extract (overrides global default)
  deep_judgment_fuzzy_match_threshold?: number; // Fuzzy matching threshold 0.0-1.0 (overrides global default)
  deep_judgment_excerpt_retry_attempts?: number; // Retry attempts for excerpt extraction (overrides global default)
  deep_judgment_search_enabled?: boolean; // Enable search-enhanced hallucination detection (default: false)
}

export interface RegexTrait {
  name: string;
  description?: string;
  pattern: string; // Regex pattern
  case_sensitive?: boolean; // Whether pattern matching should be case sensitive (default: true)
  invert_result?: boolean; // Whether to invert the boolean result (default: false)
}

export interface CallableTrait {
  name: string;
  description?: string;
  callable_code: string; // Base64-encoded callable code (read-only in GUI)
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
  invert_result?: boolean; // Whether to invert the boolean result (default: false)
}

export interface MetricRubricTrait {
  name: string;
  description?: string;
  evaluation_mode: 'tp_only' | 'full_matrix'; // Evaluation mode: tp_only (only TP defined) or full_matrix (TP+TN defined)
  metrics: string[]; // Available metrics depend on evaluation_mode
  tp_instructions: string[]; // Correct extractions - what SHOULD be in the answer
  tn_instructions: string[]; // Incorrect extractions - what SHOULD NOT be in the answer (only required in full_matrix mode)
  repeated_extraction?: boolean; // Whether to deduplicate excerpts (default: true)
}

export interface Rubric {
  llm_traits: LLMRubricTrait[];
  regex_traits?: RegexTrait[];
  callable_traits?: CallableTrait[];
  metric_traits?: MetricRubricTrait[];
}

export interface RubricEvaluation {
  trait_scores: Record<string, number | boolean>;
}

// Enhanced type definitions for verification results
export interface ParsedAnswerResponse {
  [key: string]: string | number | boolean | null;
}

export interface VerificationOutcome {
  completed_without_errors: boolean;
  score?: number;
  details?: string;
}

export interface GranularVerificationResult {
  score: number;
  breakdown?: Record<string, number>;
  details?: string;
}

// Pydantic Model Editor Types
export type PydanticFieldType = 'str' | 'int' | 'float' | 'bool' | 'date' | 'literal' | 'list' | 'regex';

export interface PydanticFieldDefinition {
  name: string;
  type: PydanticFieldType;
  pythonType: string; // The actual Python type annotation (e.g., "Optional[str]", "List[int]")
  description?: string;
  defaultValue?: string | number | boolean | null;
  required: boolean;
  literalValues?: string[]; // For Literal types
  listItemType?: string; // For List types
  correctValue?: string | number | boolean | string[] | null; // The correct value for this field - what goes into self.correct
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  // Regex-specific properties (only used when type === 'regex')
  regexPattern?: string; // The regex pattern to apply
  regexExpected?: string | number | string[]; // Expected result from regex matching
  regexMatchType?: 'exact' | 'contains' | 'count' | 'all'; // Type of regex matching
}

export interface PydanticMethod {
  name: string;
  code: string;
  decorator?: string; // e.g., "@model_validator"
}

export interface PydanticClassDefinition {
  className: string;
  baseClass?: string; // Usually "BaseModel"
  imports: string[];
  fields: PydanticFieldDefinition[];
  methods: PydanticMethod[];
  docstring?: string;
  correctValuePattern?: 'single' | 'multiple'; // How to structure self.correct in model_post_init
}

export interface PydanticParseResult {
  success: boolean;
  classDefinition?: PydanticClassDefinition;
  error?: string;
  warnings?: string[];
}

export interface PydanticEditorMode {
  mode: 'code' | 'form';
}

// MCP (Model Context Protocol) Types
export interface MCPTool {
  name: string;
  description?: string;
}

export interface MCPServer {
  name: string;
  url: string;
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  tools?: MCPTool[];
  error?: string;
  presetTools?: string[]; // Tools to auto-select from preset configuration
}

export interface MCPConfiguration {
  servers: MCPServer[];
  selectedTools: Set<string>;
}

export interface MCPValidationRequest {
  server_name: string;
  server_url: string;
}

export interface MCPValidationResponse {
  success: boolean;
  tools?: MCPTool[];
  error?: string;
}

export interface MCPPresetConfig {
  name: string;
  url: string;
  tools?: string[];
}

export interface MCPPresetsResponse {
  presets: Record<string, MCPPresetConfig>;
  error?: string;
}

// Search result types for deep-judgment
export interface SearchResultItem {
  title?: string | null; // Optional - will use truncated content if missing
  content: string; // Required - the main text
  url?: string | null; // Optional - will not show clickable link if missing
}

// Summary Statistics Types (from VerificationResultSet.get_summary())
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
}

export interface SummaryRequest {
  results: Record<string, VerificationResult>;
  run_name?: string | null;
}

// Model Comparison Types
export interface ModelConfig {
  answering_model: string;
  mcp_config: string;
}

export interface HeatmapCell {
  passed: boolean | null;
  score: number | null;
  abstained: boolean;
  error: boolean;
}

export interface HeatmapQuestion {
  question_id: string;
  question_text: string;
  results_by_model: Record<string, HeatmapCell>;
}

export interface ModelComparisonRequest {
  results: Record<string, VerificationResult>;
  models: ModelConfig[];
  parsing_model: string;
  replicate?: number;
}

// Per-question token data for bar charts
export interface QuestionTokenModelData {
  model_key: string;
  model_display_name: string;
  input_tokens_median: number;
  input_tokens_std: number;
  output_tokens_median: number;
  output_tokens_std: number;
}

export interface QuestionTokenData {
  question_id: string;
  question_text: string;
  models: QuestionTokenModelData[];
}

export interface ModelComparisonResponse {
  model_summaries: Record<string, SummaryStats>;
  heatmap_data: HeatmapQuestion[];
  question_token_data: QuestionTokenData[];
}
