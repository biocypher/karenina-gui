import type { PydanticClassDefinition, PydanticFieldDefinition, PydanticMethod } from '../types';

/**
 * Generate Python code from a Pydantic class definition
 */
export function generatePydanticCode(classDef: PydanticClassDefinition): string {
  const lines: string[] = [];

  // Generate imports (if needed - usually these are handled externally)
  // Skip imports in the generated code as they're managed by the template system

  // Generate class definition
  lines.push(`class ${classDef.className}(${classDef.baseClass || 'BaseAnswer'}):`);

  // Add docstring if present
  if (classDef.docstring) {
    lines.push(`    """${classDef.docstring}"""`);
  }

  // Generate fields
  if (classDef.fields.length === 0 && classDef.methods.length === 0) {
    lines.push('    pass');
  } else {
    // Add fields
    for (const field of classDef.fields) {
      const fieldLine = generateFieldDefinition(field);
      lines.push(fieldLine);
    }

    // Add blank line between fields and methods if both exist
    if (classDef.fields.length > 0 && classDef.methods.length > 0) {
      lines.push('');
    }

    // Add methods
    for (const method of classDef.methods) {
      const methodLines = generateMethodDefinition(method);
      lines.push(...methodLines);
      // Add blank line between methods
      if (classDef.methods.indexOf(method) < classDef.methods.length - 1) {
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Generate a field definition line
 */
function generateFieldDefinition(field: PydanticFieldDefinition): string {
  const parts: string[] = [`    ${field.name}: ${field.pythonType}`];

  // Check if we need Field()
  if (field.description || field.validationRules) {
    const fieldArgs: string[] = [];

    if (field.description) {
      // Escape quotes in description
      const escapedDesc = field.description.replace(/"/g, '\\"');
      fieldArgs.push(`description="${escapedDesc}"`);
    }

    // Add validation rules if present
    if (field.validationRules) {
      if (field.validationRules.minLength !== undefined) {
        fieldArgs.push(`min_length=${field.validationRules.minLength}`);
      }
      if (field.validationRules.maxLength !== undefined) {
        fieldArgs.push(`max_length=${field.validationRules.maxLength}`);
      }
      if (field.validationRules.min !== undefined) {
        fieldArgs.push(`ge=${field.validationRules.min}`);
      }
      if (field.validationRules.max !== undefined) {
        fieldArgs.push(`le=${field.validationRules.max}`);
      }
      if (field.validationRules.pattern) {
        fieldArgs.push(`regex="${field.validationRules.pattern}"`);
      }
    }

    // Format Field() call
    const totalLength = parts[0].length + fieldArgs.join(', ').length + 12; // 12 for " = Field()"

    if (fieldArgs.length === 1 && totalLength < 80) {
      // Single line if short enough
      parts.push(` = Field(${fieldArgs.join(', ')})`);
    } else {
      // Multi-line for readability
      parts.push(' = Field(');
      const formattedArgs = fieldArgs.map((arg) => `        ${arg}`);
      parts.push('\n' + formattedArgs.join(',\n') + '\n    )');
    }
  } else if (field.defaultValue !== undefined) {
    // Simple default value
    parts.push(` = ${formatDefaultValue(field.defaultValue)}`);
  }

  return parts.join('');
}

/**
 * Format a default value for Python
 */
function formatDefaultValue(value: string | number | boolean | null | string[] | Record<string, unknown>): string {
  if (value === null) {
    return 'None';
  }
  if (typeof value === 'string') {
    // Escape quotes and format as Python string
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => formatDefaultValue(v));
    return `[${items.join(', ')}]`;
  }
  if (typeof value === 'object') {
    // Format as dict
    const pairs = Object.entries(value).map(([k, v]) => `"${k}": ${formatDefaultValue(v)}`);
    return `{${pairs.join(', ')}}`;
  }
  return String(value);
}

/**
 * Generate method definition lines
 */
function generateMethodDefinition(method: PydanticMethod): string[] {
  const lines: string[] = [];

  // Add decorator if present
  if (method.decorator) {
    lines.push(`    ${method.decorator}`);
  }

  // If method.code is provided, use it directly (preserving formatting)
  if (method.code) {
    // Ensure proper indentation
    const methodLines = method.code.split('\n');
    for (const line of methodLines) {
      if (line.trim()) {
        // Make sure the line has proper class method indentation
        if (!line.startsWith('    ')) {
          lines.push('    ' + line);
        } else {
          lines.push(line);
        }
      } else {
        lines.push('');
      }
    }
  } else {
    // Generate a stub method (shouldn't happen in practice)
    lines.push(`    def ${method.name}(self):`);
    lines.push('        pass');
  }

  return lines;
}

/**
 * Generate the correct Python type annotation based on field definition
 */
export function generatePythonType(field: PydanticFieldDefinition): string {
  // If pythonType is already specified, use it
  if (field.pythonType && field.pythonType !== field.type) {
    return field.pythonType;
  }

  // Generate based on field type - all fields are required
  switch (field.type) {
    case 'str':
      return 'str';

    case 'int':
      return 'int';

    case 'float':
      return 'float';

    case 'bool':
      return 'bool';

    case 'date':
      return 'date';

    case 'literal':
      if (field.literalValues && field.literalValues.length > 0) {
        const values = field.literalValues.map((v) => `"${v}"`).join(', ');
        return `Literal[${values}]`;
      }
      return 'str'; // Fallback

    case 'list': {
      const itemType = field.listItemType || 'str';
      return `List[${itemType}]`;
    }

    default:
      return 'Any';
  }
}

/**
 * Generate a model_post_init method based on field definitions
 */
export function generateModelPostInit(
  fields: PydanticFieldDefinition[],
  correctValuePattern?: 'single' | 'multiple'
): string {
  const lines: string[] = ['    def model_post_init(self, __context):'];

  if (fields.length === 0) {
    lines.push('        self.correct = {}');
  } else if (correctValuePattern === 'single' || (correctValuePattern === undefined && fields.length === 1)) {
    // Single field pattern: self.correct = value
    const field = fields[0];
    const correctValue = field.correctValue !== undefined ? field.correctValue : getDefaultCorrectValue(field);
    lines.push(`        self.correct = ${formatCorrectValue(correctValue, field)}`);
  } else {
    // Multiple field pattern: self.correct = {"field": value, ...}
    lines.push('        self.correct = {');
    for (const field of fields) {
      const correctValue = field.correctValue !== undefined ? field.correctValue : getDefaultCorrectValue(field);
      lines.push(`            "${field.name}": ${formatCorrectValue(correctValue, field)},`);
    }
    lines.push('        }');
  }

  return lines.join('\n');
}

/**
 * Get a default correct value for a field based on its type
 */
function getDefaultCorrectValue(field: PydanticFieldDefinition): string | number | boolean | null | string[] {
  switch (field.type) {
    case 'bool':
      return true;
    case 'int':
      return 0;
    case 'float':
      return 0.0;
    case 'str':
      return 'correct_answer';
    case 'literal':
      return field.literalValues?.[0] || 'value';
    case 'list':
      return [];
    case 'date':
      return '2024-01-01';
    default:
      return null;
  }
}

/**
 * Format a list item value based on its type
 */
function formatListItemValue(item: string | number | boolean, itemType: string): string {
  switch (itemType) {
    case 'str':
      return `"${String(item).replace(/"/g, '\\"')}"`;
    case 'int':
      return String(parseInt(String(item)) || 0);
    case 'float':
      return String(parseFloat(String(item)) || 0.0);
    case 'bool':
      return String(item).toLowerCase() === 'true' ? 'True' : 'False';
    default:
      return `"${String(item).replace(/"/g, '\\"')}"`;
  }
}

/**
 * Format a correct value for Python based on field type
 */
function formatCorrectValue(
  value: string | number | boolean | string[] | null | undefined,
  field: PydanticFieldDefinition
): string {
  if (value === undefined || value === null) {
    return 'None';
  }

  switch (field.type) {
    case 'str':
    case 'literal':
    case 'date':
      return `"${String(value).replace(/"/g, '\\"')}"`;
    case 'bool':
      return value ? 'True' : 'False';
    case 'int':
      return String(parseInt(String(value)) || 0);
    case 'float':
      return String(parseFloat(String(value)) || 0.0);
    case 'list':
      if (Array.isArray(value)) {
        const items = value.map((item) => formatListItemValue(item, field.listItemType || 'str'));
        return `[${items.join(', ')}]`;
      }
      return '[]';
    default:
      return formatDefaultValue(value);
  }
}

/**
 * Generate a verify method based on field definitions
 */
export function generateVerifyMethod(
  fields: PydanticFieldDefinition[],
  correctValuePattern?: 'single' | 'multiple'
): string {
  const lines: string[] = ['    def verify(self) -> bool:'];

  if (fields.length === 0) {
    lines.push('        return True');
  } else if (correctValuePattern === 'single' || (correctValuePattern === undefined && fields.length === 1)) {
    // Single field pattern: compare with self.correct directly
    const field = fields[0];
    lines.push(`        return self.${field.name} == self.correct`);
  } else {
    // Multiple field pattern: compare with self.correct dict
    const conditions: string[] = [];
    for (const field of fields) {
      conditions.push(`self.${field.name} == self.correct["${field.name}"]`);
    }
    lines.push(`        return ${conditions.join(' and ')}`);
  }

  return lines.join('\n');
}

/**
 * Generate a verify_granular method for multiple fields
 */
export function generateVerifyGranularMethod(
  fields: PydanticFieldDefinition[],
  correctValuePattern?: 'single' | 'multiple'
): string {
  if (fields.length <= 1) {
    return ''; // Not needed for single field
  }

  const lines: string[] = ['    def verify_granular(self) -> float:', '        score = 0', '        n_params = 0'];

  if (correctValuePattern === 'single') {
    // Single field pattern - can't do granular scoring with single correct value
    lines.push('        # Granular scoring not applicable for single field pattern');
    lines.push('        return 1.0 if self.verify() else 0.0');
  } else {
    // Multiple field pattern: iterate through self.correct dict
    for (const field of fields) {
      lines.push(`        if self.${field.name} == self.correct["${field.name}"]:`);
      lines.push('            score += 1');
      lines.push('        n_params += 1');
    }
    lines.push('        return score / n_params if n_params > 0 else 0');
  }

  return lines.join('\n');
}
