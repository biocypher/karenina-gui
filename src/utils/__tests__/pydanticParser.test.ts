import { describe, it, expect } from 'vitest';
import { parsePydanticClass, validatePydanticClass } from '../pydanticParser';

describe('pydanticParser', () => {
  describe('parsePydanticClass', () => {
    it('should parse a simple boolean Answer class', () => {
      const code = `class Answer(BaseAnswer):
    answer: bool = Field(description="Answer contains whether rofecoxib is withdrawn - true or false")

    def model_post_init(self, __context):
        self.correct = True

    def verify(self) -> bool:
        return bool(self.answer) is bool(self.correct)`;

      const result = parsePydanticClass(code);

      expect(result.success).toBe(true);
      expect(result.classDefinition).toBeDefined();

      const classDef = result.classDefinition!;
      expect(classDef.className).toBe('Answer');
      expect(classDef.baseClass).toBe('BaseAnswer');
      expect(classDef.fields).toHaveLength(1);
      expect(classDef.fields[0]).toEqual({
        name: 'answer',
        type: 'bool',
        pythonType: 'bool',
        description: 'Answer contains whether rofecoxib is withdrawn - true or false',
        required: true,
        literalValues: undefined,
        listItemType: undefined,
        defaultValue: undefined,
        correctValue: true,
      });

      expect(classDef.methods).toHaveLength(2);
      expect(classDef.methods.map((m) => m.name)).toContain('model_post_init');
      expect(classDef.methods.map((m) => m.name)).toContain('verify');
    });

    it('should parse a Literal field Answer class', () => {
      const code = `class Answer(BaseAnswer):
    answer: Literal["Increased risk of cardiovascular side effects", "other"] = Field(
        description="Answer contains evidence that the cause was cardiovascular disease or other reason"
    )

    def model_post_init(self, __context):
        self.correct = "Increased risk of cardiovascular side effects"

    def verify(self) -> bool:
        return str(self.answer).strip().lower() == str(self.correct).strip().lower()`;

      const result = parsePydanticClass(code);

      expect(result.success).toBe(true);
      const classDef = result.classDefinition!;

      expect(classDef.fields).toHaveLength(1);
      expect(classDef.fields[0]).toEqual({
        name: 'answer',
        type: 'literal',
        pythonType: 'Literal["Increased risk of cardiovascular side effects", "other"]',
        description: 'Answer contains evidence that the cause was cardiovascular disease or other reason',
        required: true,
        literalValues: ['Increased risk of cardiovascular side effects', 'other'],
        listItemType: undefined,
        defaultValue: undefined,
        correctValue: 'Increased risk of cardiovascular side effects',
      });
    });

    it('should parse multiple fields with verify_granular', () => {
      const code = `class Answer(BaseAnswer):
    phase: Literal["Phase I", "Phase II", "Phase III", "Phase IV"] = Field(
        description="Maximum trial phase for Ozanezumab described in the answer"
    )
    status: Literal["Completed", "Active", "Terminated", "Withdrawn", "Suspended","Other"] = Field(
        description="Status of the trial described in the answer"
    )

    def model_post_init(self, __context):
        self.correct = {"phase": "Phase II", "status": "Completed"}

    def verify(self) -> bool:
        return self.phase == self.correct["phase"] and self.status == self.correct["status"]

    def verify_granular(self) -> float:
        score = 0
        n_params = 0
        if self.phase == self.correct["phase"]:
            score += 1
            n_params += 1
        if self.status == self.correct["status"]:
            score += 1
            n_params += 1
        return score / n_params`;

      const result = parsePydanticClass(code);

      expect(result.success).toBe(true);
      const classDef = result.classDefinition!;

      expect(classDef.fields).toHaveLength(2);
      expect(classDef.fields[0].name).toBe('phase');
      expect(classDef.fields[0].type).toBe('literal');
      expect(classDef.fields[0].literalValues).toEqual(['Phase I', 'Phase II', 'Phase III', 'Phase IV']);

      expect(classDef.fields[1].name).toBe('status');
      expect(classDef.fields[1].type).toBe('literal');
      expect(classDef.fields[1].literalValues).toEqual([
        'Completed',
        'Active',
        'Terminated',
        'Withdrawn',
        'Suspended',
        'Other',
      ]);

      expect(classDef.methods).toHaveLength(3);
      expect(classDef.methods.map((m) => m.name)).toContain('verify_granular');
    });

    it('should parse integer field', () => {
      const code = `class Answer(BaseAnswer):
    answer: int = Field(description="Number of targets associated with ALS in the answer")

    def model_post_init(self, __context):
        self.correct = 324

    def verify(self) -> bool:
        return int(self.answer) == int(self.correct)`;

      const result = parsePydanticClass(code);

      expect(result.success).toBe(true);
      const classDef = result.classDefinition!;

      expect(classDef.fields[0].type).toBe('int');
      expect(classDef.fields[0].pythonType).toBe('int');
    });

    it('should handle Optional fields', () => {
      const code = `class Answer(BaseAnswer):
    answer: Optional[str] = Field(description="Optional answer field")
    count: Optional[int] = None

    def model_post_init(self, __context):
        self.correct = "test"

    def verify(self) -> bool:
        return self.answer == self.correct`;

      const result = parsePydanticClass(code);

      expect(result.success).toBe(true);
      const classDef = result.classDefinition!;

      expect(classDef.fields).toHaveLength(2);
      expect(classDef.fields[0].required).toBe(false);
      expect(classDef.fields[1].required).toBe(false);
      expect(classDef.fields[1].defaultValue).toBe(null);
    });

    it('should handle parsing errors gracefully', () => {
      const invalidCode = `not a valid class`;

      const result = parsePydanticClass(invalidCode);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Could not find class definition');
    });
  });

  describe('validatePydanticClass', () => {
    it('should validate a correct class definition', () => {
      const classDef = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'bool' as const,
            pythonType: 'bool',
            required: true,
          },
        ],
        methods: [
          { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
          { name: 'verify', code: 'def verify(self) -> bool: pass' },
        ],
      };

      const errors = validatePydanticClass(classDef);
      expect(errors).toHaveLength(0);
    });

    it('should require verify_granular for multiple fields', () => {
      const classDef = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'field1',
            type: 'str' as const,
            pythonType: 'str',
            required: true,
          },
          {
            name: 'field2',
            type: 'int' as const,
            pythonType: 'int',
            required: true,
          },
        ],
        methods: [
          { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
          { name: 'verify', code: 'def verify(self) -> bool: pass' },
        ],
      };

      const errors = validatePydanticClass(classDef);
      expect(errors).toContain('verify_granular method is required when there are multiple fields');
    });

    it('should detect invalid field names', () => {
      const classDef = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: '123invalid',
            type: 'str' as const,
            pythonType: 'str',
            required: true,
          },
        ],
        methods: [
          { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
          { name: 'verify', code: 'def verify(self) -> bool: pass' },
        ],
      };

      const errors = validatePydanticClass(classDef);
      expect(errors.some((e) => e.includes('Invalid field name'))).toBe(true);
    });

    it('should detect duplicate field names', () => {
      const classDef = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'answer',
            type: 'str' as const,
            pythonType: 'str',
            required: true,
          },
          {
            name: 'answer',
            type: 'int' as const,
            pythonType: 'int',
            required: true,
          },
        ],
        methods: [
          { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
          { name: 'verify', code: 'def verify(self) -> bool: pass' },
        ],
      };

      const errors = validatePydanticClass(classDef);
      expect(errors).toContain('Duplicate field name: answer');
    });

    it('should validate literal fields have values', () => {
      const classDef = {
        className: 'Answer',
        baseClass: 'BaseAnswer',
        imports: [],
        fields: [
          {
            name: 'choice',
            type: 'literal' as const,
            pythonType: 'Literal[]',
            required: true,
            literalValues: [],
          },
        ],
        methods: [
          { name: 'model_post_init', code: 'def model_post_init(self, __context): pass' },
          { name: 'verify', code: 'def verify(self) -> bool: pass' },
        ],
      };

      const errors = validatePydanticClass(classDef);
      expect(errors).toContain('Literal field choice must have at least one value');
    });
  });
});
