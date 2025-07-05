/**
 * Test fixtures and data for E2E tests
 */

export const TEST_DATA = {
  sampleQuestions: [
    'What is the capital of France?',
    'How do you calculate the area of a circle?',
    'What are the benefits of renewable energy?',
  ],

  sampleFile: {
    name: 'test-questions.csv',
    content: `question,category
What is the capital of France?,Geography
How do you calculate the area of a circle?,Mathematics
What are the benefits of renewable energy?,Environment`,
  },

  llmModels: ['gpt-3.5-turbo', 'gpt-4', 'claude-3-sonnet'],
};

export const SELECTORS = {
  navigation: {
    extractorTab: 'button:has-text("Question Extractor")',
    generatorTab: 'button:has-text("Template Generator")',
    curatorTab: 'button:has-text("Template Curator")',
    chatTab: 'button:has-text("LLM Chat")',
    benchmarkTab: 'button:has-text("Benchmark")',
  },

  fileUpload: {
    dropZone: '[data-testid="file-drop-zone"]',
    fileInput: 'input[type="file"]',
    uploadButton: '[data-testid="upload-button"]',
  },

  forms: {
    submitButton: '[data-testid="submit-button"]',
    cancelButton: '[data-testid="cancel-button"]',
  },
};

export const TIMEOUTS = {
  short: 2000,
  medium: 5000,
  long: 10000,
  veryLong: 15000,
};
