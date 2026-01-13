import { describe, it, expect } from 'vitest';
import { generatePydanticCode } from '../../../src/utils/pydanticGenerator';
import { parsePydanticClass } from '../../../src/utils/pydanticParser';
import type { PydanticClassDefinition, PydanticFieldDefinition } from '../../../src/types';

describe('Pydantic Utils - Quote Handling', () => {
  describe('generatePydanticCode', () => {
    it('should properly escape apostrophes in field descriptions', () => {
      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'int',
            pythonType: 'int',
            description: "Number of Crohn's cases reported in Liu Z et al. Nat Genet (2023)",
            required: true,
            correctValue: 20873,
          } as PydanticFieldDefinition,
        ],
        methods: [],
      };

      const generatedCode = generatePydanticCode(classDef);

      // The description should be properly escaped in the generated code
      expect(generatedCode).toContain(
        'description="Number of Crohn\'s cases reported in Liu Z et al. Nat Genet (2023)"'
      );

      // Make sure the generated code doesn't contain unescaped quotes that would break Python
      expect(generatedCode).not.toMatch(/description="[^"]*"[^"]*"/);
    });

    it('should properly escape double quotes in field descriptions', () => {
      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str',
            pythonType: 'str',
            description: 'This is a "quoted" example',
            required: true,
            correctValue: 'test',
          } as PydanticFieldDefinition,
        ],
        methods: [],
      };

      const generatedCode = generatePydanticCode(classDef);

      // The description should have escaped double quotes
      expect(generatedCode).toContain('description="This is a \\"quoted\\" example"');
    });

    it('should properly escape backslashes in field descriptions', () => {
      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str',
            pythonType: 'str',
            description: 'This has a backslash \\ character',
            required: true,
            correctValue: 'test',
          } as PydanticFieldDefinition,
        ],
        methods: [],
      };

      const generatedCode = generatePydanticCode(classDef);

      // The description should have escaped backslashes
      expect(generatedCode).toContain('description="This has a backslash \\\\ character"');
    });

    it('should handle complex descriptions with mixed quotes and special characters', () => {
      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str',
            pythonType: 'str',
            description: 'Complex: "quoted", can\'t, and \\ backslash',
            required: true,
            correctValue: 'test',
          } as PydanticFieldDefinition,
        ],
        methods: [],
      };

      const generatedCode = generatePydanticCode(classDef);

      // The description should have all special characters properly escaped
      expect(generatedCode).toContain('description="Complex: \\"quoted\\", can\'t, and \\\\ backslash"');
    });
  });

  describe('parsePydanticClass', () => {
    it('should properly parse field descriptions with apostrophes', () => {
      const pythonCode = `
class TestAnswer(BaseAnswer):
    answer: int = Field(description="Number of Crohn's cases reported in Liu Z et al. Nat Genet (2023)")
    
    def model_post_init(self, __context):
        self.correct = 20873
        
    def verify(self) -> bool:
        return self.answer == self.correct
`;

      const result = parsePydanticClass(pythonCode);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.classDefinition.fields).toHaveLength(1);
        expect(result.classDefinition.fields[0].description).toBe(
          "Number of Crohn's cases reported in Liu Z et al. Nat Genet (2023)"
        );
      }
    });

    it('should properly parse field descriptions with escaped double quotes', () => {
      const pythonCode = `
class TestAnswer(BaseAnswer):
    answer: str = Field(description="This is a \\"quoted\\" example")
    
    def model_post_init(self, __context):
        self.correct = "test"
        
    def verify(self) -> bool:
        return self.answer == self.correct
`;

      const result = parsePydanticClass(pythonCode);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.classDefinition.fields).toHaveLength(1);
        expect(result.classDefinition.fields[0].description).toBe('This is a "quoted" example');
      }
    });

    it('should properly parse field descriptions with escaped backslashes', () => {
      const pythonCode = `
class TestAnswer(BaseAnswer):
    answer: str = Field(description="This has a backslash \\\\ character")
    
    def model_post_init(self, __context):
        self.correct = "test"
        
    def verify(self) -> bool:
        return self.answer == self.correct
`;

      const result = parsePydanticClass(pythonCode);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.classDefinition.fields).toHaveLength(1);
        expect(result.classDefinition.fields[0].description).toBe('This has a backslash \\ character');
      }
    });
  });

  describe('Round-trip test', () => {
    it('should maintain description integrity through generation and parsing', () => {
      const originalDescription = "Number of Crohn's cases reported in Liu Z et al. Nat Genet (2023)";

      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'int',
            pythonType: 'int',
            description: originalDescription,
            required: true,
            correctValue: 20873,
          } as PydanticFieldDefinition,
        ],
        methods: [
          {
            name: 'model_post_init',
            code: `    def model_post_init(self, __context):
        self.correct = 20873`,
          },
          {
            name: 'verify',
            code: `    def verify(self) -> bool:
        return self.answer == self.correct`,
          },
        ],
      };

      // Generate Python code
      const generatedCode = generatePydanticCode(classDef);

      // Parse it back
      const parseResult = parsePydanticClass(generatedCode);

      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.classDefinition.fields).toHaveLength(1);
        expect(parseResult.classDefinition.fields[0].description).toBe(originalDescription);
      }
    });

    it('should handle complex descriptions with mixed special characters', () => {
      const originalDescription = 'Complex: "quoted", can\'t, and \\ backslash';

      const classDef: PydanticClassDefinition = {
        className: 'TestAnswer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str',
            pythonType: 'str',
            description: originalDescription,
            required: true,
            correctValue: 'test',
          } as PydanticFieldDefinition,
        ],
        methods: [
          {
            name: 'model_post_init',
            code: `    def model_post_init(self, __context):
        self.correct = "test"`,
          },
          {
            name: 'verify',
            code: `    def verify(self) -> bool:
        return self.answer == self.correct`,
          },
        ],
      };

      // Generate Python code
      const generatedCode = generatePydanticCode(classDef);

      // Parse it back
      const parseResult = parsePydanticClass(generatedCode);

      expect(parseResult.success).toBe(true);
      if (parseResult.success) {
        expect(parseResult.classDefinition.fields).toHaveLength(1);
        expect(parseResult.classDefinition.fields[0].description).toBe(originalDescription);
      }
    });
  });
});
