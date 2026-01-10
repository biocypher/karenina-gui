/**
 * Benchmark Configuration Integration Tests
 *
 * Tests the benchmark configuration settings in the Benchmark tab including:
 * - Evaluation mode configuration (template_only, template_and_rubric, rubric_only)
 * - Correctness and rubric toggle interactions
 *
 * integ-047: Test evaluation mode configuration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, userEvent } from '../../../test-utils/test-helpers';
import { BenchmarkTab } from '../../../components/BenchmarkTab';
import { useBenchmarkStore } from '../../../stores/useBenchmarkStore';
import { useRubricStore } from '../../../stores/useRubricStore';
import { useDatasetStore } from '../../../stores/useDatasetStore';
import { Checkpoint } from '../../../types';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((this: WebSocket, ev: Event) => void) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => void) | null = null;
  onerror: ((this: WebSocket, ev: Event) => void) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send() {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

// Mock the preset store
vi.mock('../../../stores/usePresetStore', () => ({
  usePresetStore: () => ({
    presets: [],
    isLoadingPresets: false,
    loadPresets: vi.fn(() => Promise.resolve()),
    savePreset: vi.fn(() => Promise.resolve()),
    deletePreset: vi.fn(() => Promise.resolve()),
    applyPreset: vi.fn(() => Promise.resolve()),
  }),
}));

// Mock CSRF
vi.mock('../../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn(),
    getCsrfToken: vi.fn(() => 'mock-csrf-token'),
  },
}));

// Mock fetch
vi.mocked(global.fetch).mockImplementation(
  async () =>
    ({
      ok: true,
      json: async () => ({}),
    }) as Response
);

const mockCheckpoint: Checkpoint = {
  'test-question-1': {
    question: 'What is 2+2?',
    raw_answer: 'The answer is 4',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): response: str = "4"',
    last_modified: '2023-12-01T10:00:00Z',
    finished: true,
  },
  'test-question-2': {
    question: 'What is the capital of France?',
    raw_answer: 'The capital of France is Paris',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): city: str = "Paris"',
    last_modified: '2023-12-01T11:00:00Z',
    finished: true,
  },
};

const renderBenchmarkTab = (checkpoint: Checkpoint = mockCheckpoint) => {
  return render(<BenchmarkTab checkpoint={checkpoint} benchmarkResults={{}} setBenchmarkResults={vi.fn()} />);
};

describe('Benchmark Configuration Integration Tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    document.body.innerHTML = '';

    // Reset stores
    useRubricStore.getState().reset();
    useDatasetStore.getState().reset?.();

    // Setup benchmark store with default models and evaluation settings
    const store = useBenchmarkStore.getState();
    store.setAnsweringModels([
      {
        id: 'answering-1',
        model_provider: 'anthropic',
        model_name: 'claude-haiku-4-5',
        temperature: 0.1,
        interface: 'langchain',
        system_prompt: 'You are an expert assistant.',
      },
    ]);
    store.setParsingModels([
      {
        id: 'parsing-1',
        model_provider: 'anthropic',
        model_name: 'claude-haiku-4-5',
        temperature: 0.1,
        interface: 'langchain',
        system_prompt: 'You are a validation assistant.',
      },
    ]);
    store.setEvaluationMode('template_only');
    store.setRubricEnabled(false);
    store.setCorrectnessEnabled(true);
    store.resetExpandedPrompts();
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.body.innerHTML = '';
  });

  // Helper function to find the Rubric checkbox (not the Deep-Judgment Rubrics checkbox)
  const findRubricCheckbox = () => {
    // Find all checkboxes in the document
    const allCheckboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));

    // The Rubric checkbox we want has a sibling span with text "Rubric" followed by
    // another span with "(Qualitative evaluation using defined traits)"
    for (const checkbox of allCheckboxes) {
      const parent = checkbox.closest('label');
      if (parent) {
        const textContent = parent.textContent || '';
        // Check if this label contains "Rubric" and the description text
        // This distinguishes it from the Deep-Judgment "Rubrics" checkbox
        if (textContent.includes('Rubric') && textContent.includes('Qualitative evaluation')) {
          return checkbox as HTMLInputElement;
        }
      }
    }
    return null;
  };

  describe('integ-047: Evaluation mode configuration', () => {
    it('should enable rubric and show evaluation mode options', async () => {
      renderBenchmarkTab();

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Initially, correctness should be enabled, rubric disabled
      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;
      expect(correctnessCheckbox.checked).toBe(true);

      // Find the Rubric checkbox
      const rubricCheckbox = findRubricCheckbox();
      expect(rubricCheckbox).toBeInTheDocument();
      expect(rubricCheckbox?.checked).toBe(false);

      // Enable rubric
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify rubric is now enabled in store
      expect(useBenchmarkStore.getState().rubricEnabled).toBe(true);

      // Verify evaluation mode radio buttons appear
      await waitFor(() => {
        expect(screen.getByLabelText(/Template \+ Rubric/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Rubric Only/i)).toBeInTheDocument();
      });

      // Verify evaluation mode changed to template_and_rubric
      expect(useBenchmarkStore.getState().evaluationMode).toBe('template_and_rubric');
    });

    it('should select template and rubric mode', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Select Template + Rubric mode
      const templateAndRubricRadio = screen.getByLabelText(/Template \+ Rubric/i) as HTMLInputElement;
      await userEvent.click(templateAndRubricRadio);

      // Verify evaluation mode updated in store
      expect(useBenchmarkStore.getState().evaluationMode).toBe('template_and_rubric');
    });

    it('should select rubric only mode', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Select Rubric Only mode
      const rubricOnlyRadio = screen.getByLabelText(/Rubric Only/i) as HTMLInputElement;
      await userEvent.click(rubricOnlyRadio);

      // Verify evaluation mode updated in store
      expect(useBenchmarkStore.getState().evaluationMode).toBe('rubric_only');

      // Verify correctness is still enabled (both can be on)
      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;
      expect(correctnessCheckbox.checked).toBe(true);
    });

    it('should disable rubric and hide evaluation mode options', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      // Enable rubric
      const rubricCheckbox = findRubricCheckbox();
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify evaluation mode options appeared
      await waitFor(() => {
        expect(screen.getByLabelText(/Template \+ Rubric/i)).toBeInTheDocument();
      });

      // Disable rubric
      if (rubricCheckbox) {
        await userEvent.click(rubricCheckbox);
      }

      // Verify rubric disabled in store
      expect(useBenchmarkStore.getState().rubricEnabled).toBe(false);

      // Verify evaluation mode radio buttons are hidden
      await waitFor(() => {
        expect(screen.queryByLabelText(/Template \+ Rubric/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/Rubric Only/i)).not.toBeInTheDocument();
      });
    });

    it('should verify correctness checkbox toggles correctly', async () => {
      renderBenchmarkTab();

      await waitFor(() => {
        expect(screen.getByText(/Evaluation Settings/i)).toBeInTheDocument();
      });

      const correctnessCheckbox = screen.getByLabelText(/Correctness/i) as HTMLInputElement;

      // Initially enabled
      expect(correctnessCheckbox.checked).toBe(true);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(true);

      // Disable correctness
      await userEvent.click(correctnessCheckbox);
      expect(correctnessCheckbox.checked).toBe(false);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(false);

      // Re-enable correctness
      await userEvent.click(correctnessCheckbox);
      expect(correctnessCheckbox.checked).toBe(true);
      expect(useBenchmarkStore.getState().correctnessEnabled).toBe(true);
    });
  });
});
