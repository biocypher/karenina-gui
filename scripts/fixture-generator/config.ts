/**
 * Configuration for the LLM fixture generator CLI tool
 */

import type { ModelConfiguration } from '../../src/types';

export interface FixtureGeneratorConfig {
  backendUrl: string;
  outputDir: string;
  timeout: number;
  verbose: boolean;
}

export const defaultConfig: FixtureGeneratorConfig = {
  backendUrl: 'http://localhost:5001',
  outputDir: 'src/test-utils/fixtures/llm-responses',
  timeout: 120000,
  verbose: true,
};

/**
 * Default model configuration using Claude Haiku 4.5
 */
export const defaultModelConfig: Partial<ModelConfiguration> = {
  model_provider: 'anthropic',
  model_name: 'claude-haiku-4-5',
  temperature: 0.1,
  interface: 'langchain',
  system_prompt: 'You are a helpful assistant that answers questions accurately and concisely.',
};

/**
 * Sample questions for fixture generation
 */
export const sampleQuestions = [
  {
    id: 'q1',
    question: 'What is the capital of France?',
    raw_answer: 'Paris is the capital of France.',
    answer_template: `class Answer(BaseModel):
    capital: str = Field(description="The capital city name")

    @model_validator(mode='after')
    def check_answer(self):
        self.correct = self.capital.lower() == 'paris'
        return self`,
  },
  {
    id: 'q2',
    question: 'Calculate 15 + 27.',
    raw_answer: '15 plus 27 equals 42.',
    answer_template: `class Answer(BaseModel):
    result: int = Field(description="The sum of the two numbers")

    @model_validator(mode='after')
    def check_answer(self):
        self.correct = self.result == 42
        return self`,
  },
  {
    id: 'q3',
    question: 'Name three primary colors.',
    raw_answer: 'The three primary colors are red, blue, and yellow.',
    answer_template: `class Answer(BaseModel):
    colors: List[str] = Field(description="List of primary colors")

    @model_validator(mode='after')
    def check_answer(self):
        expected = {'red', 'blue', 'yellow'}
        self.correct = set(c.lower() for c in self.colors) == expected
        return self`,
  },
];

/**
 * Sample rubric for testing rubric evaluation
 */
export const sampleRubric = {
  title: 'Test Rubric',
  llm_traits: [
    {
      name: 'accuracy',
      description: 'Is the response factually accurate?',
      kind: 'boolean' as const,
      min_score: null,
      max_score: null,
    },
    {
      name: 'completeness',
      description: 'How complete is the response?',
      kind: 'score' as const,
      min_score: 1,
      max_score: 5,
    },
  ],
  regex_traits: [],
  callable_traits: [],
  metric_traits: [],
};
