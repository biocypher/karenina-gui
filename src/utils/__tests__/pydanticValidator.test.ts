import { describe, it, expect } from 'vitest';
import {
  validatePythonIdentifier,
  validateFieldType,
  validatePydanticClassDefinition,
  getFieldImprovementSuggestions,
  quickValidateField,
} from '../pydanticValidator';
import type { PydanticFieldDefinition, PydanticClassDefinition } from '../../types';

describe('pydanticValidator', () => {
  describe('validatePythonIdentifier', () => {
    it('should accept valid Python identifiers', () => {
      const validNames = ['field_name', 'user_id', 'data', 'value_123', '_private', 'CamelCase'];

      validNames.forEach((name) => {
        const result = validatePythonIdentifier(name);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject empty or whitespace names', () => {
      const result = validatePythonIdentifier('');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('cannot be empty');
    });

    it('should reject names starting with numbers', () => {
      const result = validatePythonIdentifier('123invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('cannot start with a number'))).toBe(true);
    });

    it('should reject Python keywords', () => {
      const keywords = ['def', 'class', 'if', 'for', 'while', 'True', 'False', 'None'];

      keywords.forEach((keyword) => {
        const result = validatePythonIdentifier(keyword);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('reserved keyword'))).toBe(true);
      });
    });

    it('should reject Pydantic reserved attributes', () => {
      const reserved = ['model_config', 'model_fields', 'model_dump'];

      reserved.forEach((attr) => {
        const result = validatePythonIdentifier(attr);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('reserved by Pydantic'))).toBe(true);
      });
    });

    it('should reject BaseAnswer reserved attributes', () => {
      const reserved = ['id', 'correct', 'verify'];

      reserved.forEach((attr) => {
        const result = validatePythonIdentifier(attr);
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.message.includes('reserved by BaseAnswer'))).toBe(true);
      });
    });

    it('should warn about potentially confusing names', () => {
      const confusing = ['type', 'class', 'str', 'int', 'list'];

      confusing.forEach((name) => {
        const result = validatePythonIdentifier(name);
        expect(result.warnings.some((w) => w.message.includes('might be confusing'))).toBe(true);
      });
    });

    it('should warn about non-snake_case names', () => {
      const result = validatePythonIdentifier('CamelCase');
      expect(result.warnings.some((w) => w.message.includes('snake_case'))).toBe(true);
    });

    it('should warn about double underscores', () => {
      const result = validatePythonIdentifier('field__name');
      expect(result.warnings.some((w) => w.message.includes('Double underscores'))).toBe(true);
    });

    it('should suggest improvements for single character names', () => {
      const result = validatePythonIdentifier('x');
      expect(result.suggestions.some((s) => s.message.includes('Single character'))).toBe(true);
    });
  });

  describe('validateFieldType', () => {
    it('should validate literal fields correctly', () => {
      const validLiteral: PydanticFieldDefinition = {
        name: 'status',
        type: 'literal',
        pythonType: 'Literal["active", "inactive"]',
        required: true,
        literalValues: ['active', 'inactive'],
      };

      const result = validateFieldType(validLiteral);
      expect(result.isValid).toBe(true);
    });

    it('should error on literal fields without values', () => {
      const invalidLiteral: PydanticFieldDefinition = {
        name: 'status',
        type: 'literal',
        pythonType: 'Literal[]',
        required: true,
        literalValues: [],
      };

      const result = validateFieldType(invalidLiteral);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('at least one possible value'))).toBe(true);
    });

    it('should warn about duplicate literal values', () => {
      const duplicateLiteral: PydanticFieldDefinition = {
        name: 'status',
        type: 'literal',
        pythonType: 'Literal["active", "active"]',
        required: true,
        literalValues: ['active', 'active', 'inactive'],
      };

      const result = validateFieldType(duplicateLiteral);
      expect(result.warnings.some((w) => w.message.includes('Duplicate literal values'))).toBe(true);
    });

    it('should warn about missing list item type', () => {
      const listField: PydanticFieldDefinition = {
        name: 'items',
        type: 'list',
        pythonType: 'List[str]',
        required: true,
      };

      const result = validateFieldType(listField);
      expect(result.warnings.some((w) => w.message.includes('item type not specified'))).toBe(true);
    });

    it('should error on union types with fewer than 2 types', () => {
      const invalidUnion: PydanticFieldDefinition = {
        name: 'value',
        type: 'union',
        pythonType: 'Union[str]',
        required: true,
        unionTypes: ['str'],
      };

      const result = validateFieldType(invalidUnion);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('at least 2 types'))).toBe(true);
    });

    it('should warn about Union with None on required fields', () => {
      const unionWithNone: PydanticFieldDefinition = {
        name: 'value',
        type: 'union',
        pythonType: 'Union[str, None]',
        required: true,
        unionTypes: ['str', 'None'],
      };

      const result = validateFieldType(unionWithNone);
      expect(result.warnings.some((w) => w.message.includes('Union with None should typically be optional'))).toBe(
        true
      );
    });

    it('should suggest adding descriptions for fields without them', () => {
      const fieldWithoutDesc: PydanticFieldDefinition = {
        name: 'value',
        type: 'str',
        pythonType: 'str',
        required: true,
      };

      const result = validateFieldType(fieldWithoutDesc);
      expect(result.suggestions.some((s) => s.message.includes('no description'))).toBe(true);
    });

    it('should suggest more detail for short descriptions', () => {
      const fieldWithShortDesc: PydanticFieldDefinition = {
        name: 'value',
        type: 'str',
        pythonType: 'str',
        required: true,
        description: 'A value',
      };

      const result = validateFieldType(fieldWithShortDesc);
      expect(result.suggestions.some((s) => s.message.includes('quite short'))).toBe(true);
    });
  });

  describe('validatePydanticClassDefinition', () => {
    const validClass: PydanticClassDefinition = {
      className: 'Answer',
      baseClass: 'BaseAnswer',
      imports: [],
      fields: [
        {
          name: 'field1',
          type: 'str',
          pythonType: 'str',
          required: true,
          description: 'A test field',
        },
      ],
      methods: [
        { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
        { name: 'verify', code: 'def verify(self) -> bool: pass' },
      ],
    };

    it('should validate a correct class definition', () => {
      const result = validatePydanticClassDefinition(validClass);
      expect(result.isValid).toBe(true);
    });

    it('should error on missing required methods', () => {
      const classWithoutMethods: PydanticClassDefinition = {
        ...validClass,
        methods: [],
      };

      const result = validatePydanticClassDefinition(classWithoutMethods);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('model_post_init'))).toBe(true);
      expect(result.errors.some((e) => e.message.includes('verify'))).toBe(true);
    });

    it('should warn about missing verify_granular for multiple fields', () => {
      const multiFieldClass: PydanticClassDefinition = {
        ...validClass,
        fields: [
          ...validClass.fields,
          {
            name: 'field2',
            type: 'int',
            pythonType: 'int',
            required: true,
          },
        ],
      };

      const result = validatePydanticClassDefinition(multiFieldClass);
      expect(result.warnings.some((w) => w.message.includes('verify_granular'))).toBe(true);
    });

    it('should error on duplicate field names', () => {
      const duplicateFieldClass: PydanticClassDefinition = {
        ...validClass,
        fields: [
          ...validClass.fields,
          {
            name: 'field1', // Duplicate name
            type: 'int',
            pythonType: 'int',
            required: true,
          },
        ],
      };

      const result = validatePydanticClassDefinition(duplicateFieldClass);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Duplicate field name'))).toBe(true);
    });

    it('should warn about classes with no fields', () => {
      const emptyClass: PydanticClassDefinition = {
        ...validClass,
        fields: [],
      };

      const result = validatePydanticClassDefinition(emptyClass);
      expect(result.warnings.some((w) => w.message.includes('no fields'))).toBe(true);
    });

    it('should suggest breaking up large classes', () => {
      const manyFields = Array.from({ length: 25 }, (_, i) => ({
        name: `field_${i}`,
        type: 'str' as const,
        pythonType: 'str',
        required: true,
      }));

      const largeClass: PydanticClassDefinition = {
        ...validClass,
        fields: manyFields,
      };

      const result = validatePydanticClassDefinition(largeClass);
      expect(result.suggestions.some((s) => s.message.includes('many fields'))).toBe(true);
    });

    it('should suggest PascalCase for class names', () => {
      const lowerCaseClass: PydanticClassDefinition = {
        ...validClass,
        className: 'answerClass',
      };

      const result = validatePydanticClassDefinition(lowerCaseClass);
      expect(result.suggestions.some((s) => s.message.includes('PascalCase'))).toBe(true);
    });
  });

  describe('getFieldImprovementSuggestions', () => {
    it('should suggest validation for string fields', () => {
      const stringField: PydanticFieldDefinition = {
        name: 'text',
        type: 'str',
        pythonType: 'str',
        required: true,
      };

      const suggestions = getFieldImprovementSuggestions(stringField);
      expect(suggestions.some((s) => s.includes('string length validation'))).toBe(true);
      expect(suggestions.some((s) => s.includes('regex pattern'))).toBe(true);
    });

    it('should suggest validation for numeric fields', () => {
      const intField: PydanticFieldDefinition = {
        name: 'count',
        type: 'int',
        pythonType: 'int',
        required: true,
      };

      const suggestions = getFieldImprovementSuggestions(intField);
      expect(suggestions.some((s) => s.includes('numeric range validation'))).toBe(true);
    });

    it('should suggest Set for large literal fields', () => {
      const largeLiteralField: PydanticFieldDefinition = {
        name: 'choice',
        type: 'literal',
        pythonType: 'Literal[...]',
        required: true,
        literalValues: Array.from({ length: 15 }, (_, i) => `option_${i}`),
      };

      const suggestions = getFieldImprovementSuggestions(largeLiteralField);
      expect(suggestions.some((s) => s.includes('string field with validation'))).toBe(true);
    });

    it('should suggest Set type for list fields', () => {
      const listField: PydanticFieldDefinition = {
        name: 'tags',
        type: 'list',
        pythonType: 'List[str]',
        required: true,
      };

      const suggestions = getFieldImprovementSuggestions(listField);
      expect(suggestions.some((s) => s.includes('Set type'))).toBe(true);
    });

    it('should suggest better descriptions', () => {
      const fieldWithShortDesc: PydanticFieldDefinition = {
        name: 'x',
        type: 'str',
        pythonType: 'str',
        required: true,
        description: 'A field',
      };

      const suggestions = getFieldImprovementSuggestions(fieldWithShortDesc);
      expect(suggestions.some((s) => s.includes('detailed description'))).toBe(true);
      expect(suggestions.some((s) => s.includes('descriptive field name'))).toBe(true);
    });
  });

  describe('quickValidateField', () => {
    it('should quickly identify fields with errors', () => {
      const invalidField: PydanticFieldDefinition = {
        name: 'class', // Reserved keyword
        type: 'literal',
        pythonType: 'Literal[]',
        required: true,
        literalValues: [], // Invalid for literal
      };

      const result = quickValidateField(invalidField);
      expect(result.hasErrors).toBe(true);
      expect(result.errorCount).toBeGreaterThan(0);
    });

    it('should quickly identify fields with warnings', () => {
      const warningField: PydanticFieldDefinition = {
        name: 'str', // Potentially confusing
        type: 'str',
        pythonType: 'str',
        required: true,
      };

      const result = quickValidateField(warningField);
      expect(result.hasWarnings).toBe(true);
      expect(result.warningCount).toBeGreaterThan(0);
    });

    it('should identify clean fields', () => {
      const cleanField: PydanticFieldDefinition = {
        name: 'user_name',
        type: 'str',
        pythonType: 'str',
        required: true,
        description: 'The name of the user as provided in the response',
      };

      const result = quickValidateField(cleanField);
      expect(result.hasErrors).toBe(false);
      expect(result.errorCount).toBe(0);
    });
  });
});
