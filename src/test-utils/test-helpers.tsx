import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { QuestionData, Checkpoint, UnifiedCheckpoint, Rubric } from '../types';
import { ThemeProvider } from '../components/ThemeProvider';

// Custom render function that includes providers if needed
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
  
  return render(ui, { wrapper: Wrapper, ...options });
};

export * from '@testing-library/react';
export { customRender as render };
export { userEvent };

// Mock data generators
export const createMockQuestionData = (count: number = 2): QuestionData => {
  const mockData: QuestionData = {};
  for (let i = 1; i <= count; i++) {
    mockData[`q${i}`] = {
      question: `Sample question ${i}?`,
      raw_answer: `This is the raw answer for question ${i}.`,
      answer_template: `class Answer${i}(BaseModel):\n    field${i}: str = Field(description="Description ${i}")`
    };
  }
  return mockData;
};

export const createMockCheckpoint = (questionData?: QuestionData): Checkpoint => {
  const checkpoint: Checkpoint = {};
  const now = new Date().toISOString();
  
  if (questionData) {
    Object.entries(questionData).forEach(([id, question]) => {
      checkpoint[id] = {
        question: question.question,
        raw_answer: question.raw_answer,
        original_answer_template: question.answer_template,
        answer_template: question.answer_template + ' // Modified',
        last_modified: now,
        finished: false,
        question_rubric: undefined
      };
    });
  }
  
  return checkpoint;
};

export const createMockUnifiedCheckpoint = (
  questionData?: QuestionData, 
  rubric?: Rubric | null
): UnifiedCheckpoint => {
  return {
    version: "2.0",
    global_rubric: rubric || null,
    checkpoint: createMockCheckpoint(questionData)
  };
};

export const createMockRubric = (traitCount: number = 2): Rubric => {
  const traits = [];
  for (let i = 1; i <= traitCount; i++) {
    traits.push({
      name: `Trait ${i}`,
      description: `Description for trait ${i}`,
      kind: i % 2 === 0 ? 'score' as const : 'boolean' as const,
      min_score: i % 2 === 0 ? 0 : undefined,
      max_score: i % 2 === 0 ? 5 : undefined
    });
  }
  return { traits };
};

// File mock helpers
export const createMockFile = (
  name: string = 'test.xlsx',
  size: number = 1024,
  type: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
): File => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', {
    value: size,
    writable: false,
  });
  return file;
};

// Storage mock helpers
export const mockLocalStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

export const mockSessionStorage = () => {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
};

// Async helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};

// Event simulation helpers
export const simulateFileUpload = async (input: HTMLElement, file: File) => {
  const user = userEvent.setup();
  await user.upload(input, file);
};

export const simulateDragAndDrop = async (element: HTMLElement, file: File) => {
  const user = userEvent.setup();
  
  // Create data transfer object
  const dataTransfer = {
    files: [file],
    items: [
      {
        kind: 'file' as const,
        type: file.type,
        getAsFile: () => file,
      },
    ],
    types: ['Files'],
  };

  await user.pointer([
    { target: element, keys: '[MouseLeft>]' },
    { target: element, coords: { x: 100, y: 100 } },
  ]);

  // Simulate drop event
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dataTransfer as DataTransfer,
  });
  
  element.dispatchEvent(dropEvent);
};

// Component testing utilities
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`);
  }
  return element;
};

// Assertion helpers
export const expectElementToBeVisible = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveText = (element: HTMLElement | null, text: string) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(text);
};

// Mock fetch responses
export const mockFetchSuccess = (data: unknown) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
};

export const mockFetchError = (error: string) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error(error));
};

// Prism.js mock for syntax highlighting tests
export const mockPrism = () => {
  return {
    highlight: vi.fn((code: string) => `<span class="highlighted">${code}</span>`),
    languages: {
      python: {},
    },
  };
}; 