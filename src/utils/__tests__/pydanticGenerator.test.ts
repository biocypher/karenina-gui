import { describe, it, expect } from 'vitest';
import {
  generatePydanticCode,
  generatePythonType,
  generateModelPostInit,
  generateVerifyMethod,
  generateVerifyGranularMethod,
} from '../pydanticGenerator';
import type { PydanticClassDefinition, PydanticFieldDefinition } from '../../types';

describe('pydanticGenerator', () => {
  describe('generatePydanticCode', () => {
    it('should generate a simple boolean Answer class', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'bool',
            pythonType: 'bool',
            description: 'Answer contains whether rofecoxib is withdrawn - true or false',
            required: true,
          },
        ],
        methods: [
          {
            name: 'model_post_init',
            code: `def model_post_init(self, __context):
        self.correct = True`,
          },
          {
            name: 'verify',
            code: `def verify(self) -> bool:
        return bool(self.answer) is bool(self.correct)`,
          },
        ],
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('class Answer(BaseAnswer):');
      expect(code).toContain('answer: bool = Field(');
      expect(code).toContain('description="Answer contains whether rofecoxib is withdrawn - true or false"');
      expect(code).toContain('def model_post_init(self, __context):');
      expect(code).toContain('def verify(self) -> bool:');
    });

    it('should generate multi-line Field() for long descriptions', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str',
            pythonType: 'str',
            description:
              'This is a very long description that should cause the Field definition to be split across multiple lines for better readability',
            required: true,
          },
        ],
        methods: [],
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('answer: str = Field(');
      expect(code).toContain('        description=');
    });

    it('should generate literal fields correctly', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'phase',
            type: 'literal',
            pythonType: 'Literal["Phase I", "Phase II", "Phase III", "Phase IV"]',
            description: 'Maximum trial phase',
            required: true,
            literalValues: ['Phase I', 'Phase II', 'Phase III', 'Phase IV'],
          },
        ],
        methods: [],
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('phase: Literal["Phase I", "Phase II", "Phase III", "Phase IV"]');
      expect(code).toContain('description="Maximum trial phase"');
    });

    it('should handle multiple fields', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'has_drugs',
            type: 'bool',
            pythonType: 'bool',
            description: 'Whether there are drugs',
            required: true,
          },
          {
            name: 'drugs',
            type: 'list',
            pythonType: 'List[str]',
            description: 'List of drugs',
            required: true,
            listItemType: 'str',
          },
        ],
        methods: [],
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('has_drugs: bool = Field(description="Whether there are drugs")');
      expect(code).toContain('drugs: List[str] = Field(description="List of drugs")');
    });

    it('should handle optional fields', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'optional_field',
            type: 'str',
            pythonType: 'Optional[str]',
            required: false,
            defaultValue: null,
          },
        ],
        methods: [],
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('optional_field: Optional[str] = None');
    });

    it('should include docstring when present', () => {
      const classDef: PydanticClassDefinition = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [],
        methods: [],
        docstring: 'This is a test Answer class',
      };

      const code = generatePydanticCode(classDef);

      expect(code).toContain('"""This is a test Answer class"""');
    });
  });

  describe('generatePythonType', () => {
    it('should generate correct types for required fields', () => {
      expect(generatePythonType({ name: 'test', type: 'str', pythonType: '', required: true })).toBe('str');
      expect(generatePythonType({ name: 'test', type: 'int', pythonType: '', required: true })).toBe('int');
      expect(generatePythonType({ name: 'test', type: 'bool', pythonType: '', required: true })).toBe('bool');
      expect(generatePythonType({ name: 'test', type: 'float', pythonType: '', required: true })).toBe('float');
    });

    it('should generate required types (no Optional) regardless of required flag', () => {
      // All fields are now always required in the GUI editor
      expect(generatePythonType({ name: 'test', type: 'str', pythonType: '', required: false })).toBe('str');
      expect(generatePythonType({ name: 'test', type: 'int', pythonType: '', required: false })).toBe('int');
    });

    it('should generate Literal types correctly', () => {
      const field: PydanticFieldDefinition = {
        name: 'status',
        type: 'literal',
        pythonType: '',
        required: true,
        literalValues: ['Active', 'Completed', 'Failed'],
      };

      expect(generatePythonType(field)).toBe('Literal["Active", "Completed", "Failed"]');
    });

    it('should generate List types correctly', () => {
      expect(
        generatePythonType({
          name: 'items',
          type: 'list',
          pythonType: '',
          required: true,
          listItemType: 'str',
        })
      ).toBe('List[str]');

      expect(
        generatePythonType({
          name: 'numbers',
          type: 'list',
          pythonType: '',
          required: false,
          listItemType: 'int',
        })
      ).toBe('List[int]');
    });
  });

  describe('generateModelPostInit', () => {
    it('should generate for single field', () => {
      const fields: PydanticFieldDefinition[] = [
        {
          name: 'answer',
          type: 'bool',
          pythonType: 'bool',
          required: true,
        },
      ];

      const method = generateModelPostInit(fields);

      expect(method).toContain('def model_post_init(self, __context):');
      expect(method).toContain('self.correct = True');
    });

    it('should generate dict for multiple fields', () => {
      const fields: PydanticFieldDefinition[] = [
        { name: 'field1', type: 'str', pythonType: 'str', required: true },
        { name: 'field2', type: 'int', pythonType: 'int', required: true },
      ];

      const method = generateModelPostInit(fields);

      expect(method).toContain('self.correct = {');
      expect(method).toContain('"field1": "correct_answer"');
      expect(method).toContain('"field2": 0');
    });
  });

  describe('generateVerifyMethod', () => {
    it('should generate for single field', () => {
      const fields: PydanticFieldDefinition[] = [
        {
          name: 'answer',
          type: 'bool',
          pythonType: 'bool',
          required: true,
        },
      ];

      const method = generateVerifyMethod(fields);

      expect(method).toContain('def verify(self) -> bool:');
      expect(method).toContain('return self.answer == self.correct');
    });

    it('should generate for multiple fields', () => {
      const fields: PydanticFieldDefinition[] = [
        { name: 'phase', type: 'str', pythonType: 'str', required: true },
        { name: 'status', type: 'str', pythonType: 'str', required: true },
      ];

      const method = generateVerifyMethod(fields);

      expect(method).toContain('return self.phase == self.correct["phase"] and self.status == self.correct["status"]');
    });
  });

  describe('generateVerifyGranularMethod', () => {
    it('should not generate for single field', () => {
      const fields: PydanticFieldDefinition[] = [
        {
          name: 'answer',
          type: 'bool',
          pythonType: 'bool',
          required: true,
        },
      ];

      const method = generateVerifyGranularMethod(fields);

      expect(method).toBe('');
    });

    it('should generate for multiple fields', () => {
      const fields: PydanticFieldDefinition[] = [
        { name: 'phase', type: 'str', pythonType: 'str', required: true },
        { name: 'status', type: 'str', pythonType: 'str', required: true },
      ];

      const method = generateVerifyGranularMethod(fields);

      expect(method).toContain('def verify_granular(self) -> float:');
      expect(method).toContain('if self.phase == self.correct["phase"]:');
      expect(method).toContain('if self.status == self.correct["status"]:');
      expect(method).toContain('return score / n_params if n_params > 0 else 0');
    });
  });
});
