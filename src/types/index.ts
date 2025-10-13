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
  additionalType: 'GlobalRubricTrait' | 'QuestionSpecificRubricTrait';
  ratingExplanation?: string;
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
  rubricTrait: RubricTrait;
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
  interface: 'langchain' | 'openrouter' | 'manual';
}

export interface TemplateGenerationProgress {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  percentage: number;
  current_question: string;
  processed_count: number;
  total_count: number;
  estimated_time_remaining?: number; // in seconds
  error?: string;
  result?: TemplateGenerationResult;
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
}

export interface VerificationConfig {
  answering_models: ModelConfiguration[];
  parsing_models: ModelConfiguration[];
  replicate_count: number;
  rubric_enabled?: boolean;
  rubric_trait_names?: string[];
  abstention_enabled?: boolean; // Enable abstention/refusal detection
  few_shot_enabled?: boolean;
  few_shot_mode?: 'all' | 'k-shot' | 'custom';
  few_shot_k?: number;
}

export interface VerificationResult {
  question_id: string;
  success: boolean;
  error?: string;
  question_text: string;
  raw_llm_response: string;
  parsed_gt_response?: Record<string, unknown>; // Ground truth from 'correct' field
  parsed_llm_response?: Record<string, unknown>; // LLM extracted fields (excluding 'id' and 'correct')
  verify_result?: VerificationOutcome;
  verify_granular_result?: GranularVerificationResult;
  verify_rubric?: Record<string, number | boolean>;
  evaluation_rubric?: Rubric; // The merged rubric used for evaluation (global + question-specific)
  keywords?: string[]; // Keywords associated with the question
  answering_model: string;
  parsing_model: string;
  execution_time: number;
  timestamp: string;
  answering_system_prompt?: string;
  parsing_system_prompt?: string;
  run_name?: string;
  job_id?: string;
  answering_model_id?: string;
  parsing_model_id?: string;
  answering_replicate?: number;
  parsing_replicate?: number;
  // Embedding check metadata
  embedding_check_performed?: boolean;
  embedding_similarity_score?: number;
  embedding_override_applied?: boolean;
  embedding_model_used?: string;
  // Regex validation metadata
  regex_validations_performed?: boolean;
  regex_validation_results?: Record<string, boolean>;
  regex_validation_details?: Record<string, Record<string, unknown>>;
  regex_overall_success?: boolean;
  regex_extraction_results?: Record<string, unknown>;
  // Abstention detection metadata
  abstention_check_performed?: boolean;
  abstention_detected?: boolean | null;
  abstention_override_applied?: boolean;
  abstention_reasoning?: string | null;
  // MCP server metadata
  answering_mcp_servers?: string[];
  // Deep-judgment metadata (multi-stage parsing with excerpts and reasoning)
  deep_judgment_enabled?: boolean;
  deep_judgment_performed?: boolean;
  extracted_excerpts?: Record<string, Array<{ text: string; confidence: string; similarity_score: number }>>;
  attribute_reasoning?: Record<string, string>;
  deep_judgment_stages_completed?: string[];
  deep_judgment_model_calls?: number;
  deep_judgment_excerpt_retry_count?: number;
  attributes_without_excerpts?: string[];
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
  estimated_time_remaining?: number;
  error?: string;
  results?: Record<string, VerificationResult>;
}

// Rubric Types
export type TraitKind = 'boolean' | 'score';

export interface RubricTrait {
  name: string;
  description?: string;
  kind: TraitKind;
  min_score?: number; // For score traits
  max_score?: number; // For score traits
}

export interface ManualRubricTrait {
  name: string;
  description?: string;
  pattern?: string; // Regex pattern (mutually exclusive with callable_name)
  callable_name?: string; // Callable function name (mutually exclusive with pattern)
  case_sensitive?: boolean; // Whether pattern matching should be case sensitive (default: true)
  invert_result?: boolean; // Whether to invert the boolean result (default: false)
}

export interface Rubric {
  traits: RubricTrait[];
  manual_traits?: ManualRubricTrait[];
}

// Rubric Trait Generation Configuration
export interface RubricTraitGenerationConfig {
  model_provider: string;
  model_name: string;
  temperature: number;
  interface: 'langchain' | 'openrouter' | 'manual';
}

export interface RubricTraitGenerationRequest {
  questions: QuestionData;
  system_prompt?: string;
  user_suggestions?: string[];
  config: RubricTraitGenerationConfig;
}

export interface RubricTraitGenerationResponse {
  traits: RubricTrait[];
  job_id?: string;
}

export interface RubricEvaluation {
  trait_scores: Record<string, number | boolean>;
}

// Enhanced type definitions for verification results
export interface ParsedAnswerResponse {
  [key: string]: string | number | boolean | null;
}

export interface VerificationOutcome {
  success: boolean;
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
