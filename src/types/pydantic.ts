/**
 * Pydantic Model Editor types
 * Data structures for Pydantic class definition editing
 */

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
