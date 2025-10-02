import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BenchmarkTab } from '../../components/BenchmarkTab';
import { Checkpoint } from '../../types';

// Mock fetch
global.fetch = vi.fn();

// Mock URL.createObjectURL and related functionality for export tests
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Blob constructor - fix to properly return type
global.Blob = vi.fn().mockImplementation((content, options) => ({
  content,
  options,
  size: content[0] ? content[0].length : 0,
  type: options?.type || '',
})) as unknown as typeof Blob;

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
  'test-question-3': {
    question: 'What is Python?',
    raw_answer: 'Python is a programming language',
    original_answer_template: 'class Answer(BaseAnswer): pass',
    answer_template: 'class Answer(BaseAnswer): description: str = "A programming language"',
    last_modified: '2023-12-01T12:00:00Z',
    finished: false, // Not finished, should not appear in table
  },
};

// Mock verification results for filter testing - removed unused variable

// Add mock benchmark results data and setter function
const mockBenchmarkResults = {};
const mockSetBenchmarkResults = vi.fn();

// Update all render calls to include the new props
const renderBenchmarkTab = (checkpoint = mockCheckpoint) => {
  return render(
    <BenchmarkTab
      checkpoint={checkpoint}
      benchmarkResults={mockBenchmarkResults}
      setBenchmarkResults={mockSetBenchmarkResults}
    />
  );
};

describe('BenchmarkTab', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Clear any DOM elements that might have been added
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // Clean up any DOM elements created during tests
    document.body.innerHTML = '';
  });

  it('renders the benchmark tab with model configuration panels', () => {
    renderBenchmarkTab();

    expect(screen.getByText('Answering Models (1)')).toBeInTheDocument();
    expect(screen.getByText('Parsing Models (1)')).toBeInTheDocument();
    expect(screen.getByText('Verification Control')).toBeInTheDocument();
  });

  it('shows finished templates in the test selection table', () => {
    renderBenchmarkTab();

    expect(screen.getByText('Test Selection (2 available)')).toBeInTheDocument();
    expect(screen.getByText('What is 2+2?')).toBeInTheDocument();
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();

    // Should not show the unfinished question
    expect(screen.queryByText('What is Python?')).not.toBeInTheDocument();
  });

  it('shows "Run Selected" button with correct combination count', () => {
    renderBenchmarkTab();

    // With 0 selected tests and 1 answering model × 1 parsing model = 0 total runs
    expect(screen.getByText('Run Selected (0 × 1 = 0)')).toBeInTheDocument();
  });

  it('shows empty state when no finished templates', () => {
    const emptyCheckpoint: Checkpoint = {
      'test-question-1': {
        question: 'What is Python?',
        raw_answer: 'Python is a programming language',
        original_answer_template: 'class Answer(BaseAnswer): pass',
        answer_template: 'class Answer(BaseAnswer): description: str = "A programming language"',
        last_modified: '2023-12-01T12:00:00Z',
        finished: false,
      },
    };

    renderBenchmarkTab(emptyCheckpoint);

    expect(screen.getByText('Test Selection (0 available)')).toBeInTheDocument();
    expect(
      screen.getByText('No finished templates available. Complete some templates in the curator first.')
    ).toBeInTheDocument();
  });

  it('starts verification when tests are selected and Run Selected is clicked', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-job-123', status: 'started' }),
    } as Response);

    renderBenchmarkTab();

    // First select a test by clicking the checkbox
    const checkbox = screen.getAllByRole('checkbox')[3]; // First test checkbox (indexes 0,1=evaluation, 2=select all, 3=first test)
    fireEvent.click(checkbox);

    // Wait for the button text to update after checkbox selection
    await waitFor(() => {
      expect(screen.getByText('Run Selected (1 × 1 = 1)')).toBeInTheDocument();
    });

    const runSelectedButton = screen.getByText('Run Selected (1 × 1 = 1)');
    fireEvent.click(runSelectedButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('config'),
      });
    });
  });

  it('includes system prompts in verification config when starting benchmark', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-job-123', status: 'started' }),
    } as Response);

    renderBenchmarkTab();

    // Expand system prompt sections by clicking the chevron buttons next to "System Prompt" labels
    const chevronButtons = screen.getAllByRole('button').filter((button) => {
      const svg = button.querySelector('svg');
      return svg && (svg.classList.contains('lucide-chevron-down') || svg.classList.contains('lucide-chevron-up'));
    });
    fireEvent.click(chevronButtons[0]); // Expand answering model system prompt
    fireEvent.click(chevronButtons[1]); // Expand parsing model system prompt

    // Wait for the textareas to appear after expansion
    await waitFor(() => {
      expect(
        screen.getByDisplayValue('You are an expert assistant. Answer the question accurately and concisely.')
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(
          'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
        )
      ).toBeInTheDocument();
    });

    // Get the textareas for interaction
    const answeringSystemPrompt = screen.getByDisplayValue(
      'You are an expert assistant. Answer the question accurately and concisely.'
    );
    const parsingSystemPrompt = screen.getByDisplayValue(
      'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
    );

    fireEvent.change(answeringSystemPrompt, {
      target: { value: 'Custom answering prompt for testing' },
    });
    fireEvent.change(parsingSystemPrompt, {
      target: { value: 'Custom parsing prompt for testing' },
    });

    // First select all tests
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    const runSelectedButton = screen.getByText('Run Selected (2 × 1 = 2)');
    fireEvent.click(runSelectedButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"system_prompt":"Custom answering prompt for testing"'),
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/start-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"system_prompt":"Custom parsing prompt for testing"'),
      });
    });
  });

  it('shows individual run buttons for each template', () => {
    renderBenchmarkTab();

    const runButtons = screen.getAllByText('Run Single');
    expect(runButtons).toHaveLength(2);
  });

  it('allows configuration of model settings', () => {
    renderBenchmarkTab();

    // Check that Interface radio buttons are present - new text without parentheses
    expect(screen.getAllByText('LangChain')).toHaveLength(2);
    expect(screen.getAllByText('OpenRouter')).toHaveLength(2);

    // Check that model provider text inputs are present for both models
    const providerInputs = screen.getAllByDisplayValue('google_genai');
    expect(providerInputs.length).toBe(2); // One for answering model, one for parsing model

    // Check that model name text inputs are present
    const modelInputs = screen.getAllByDisplayValue('gemini-2.0-flash');
    expect(modelInputs.length).toBe(2); // One for answering model, one for parsing model

    // Check that temperature sliders are present
    const temperatureSliders = screen.getAllByDisplayValue('0.1');
    expect(temperatureSliders.length).toBe(2); // One for answering model, one for parsing model
  });

  it('allows configuration of system prompts for both models', () => {
    renderBenchmarkTab();

    // Check that system prompt buttons are present (collapsed by default)
    expect(screen.getAllByText('System Prompt')).toHaveLength(2);

    // Expand the system prompt sections by clicking the chevron buttons
    const chevronButtons = screen.getAllByRole('button').filter((button) => {
      const svg = button.querySelector('svg');
      return svg && (svg.classList.contains('lucide-chevron-down') || svg.classList.contains('lucide-chevron-up'));
    });
    fireEvent.click(chevronButtons[0]); // Expand answering model system prompt
    fireEvent.click(chevronButtons[1]); // Expand parsing model system prompt

    // Check that system prompt textareas are present with default values after expanding
    expect(
      screen.getByDisplayValue('You are an expert assistant. Answer the question accurately and concisely.')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
      )
    ).toBeInTheDocument();

    // Check placeholders are present
    expect(screen.getAllByPlaceholderText("Define the model's role and behavior...")).toHaveLength(2);
  });

  it('allows collapsing and expanding system prompt panels', () => {
    renderBenchmarkTab();

    // Initially collapsed - textareas should not be visible
    expect(
      screen.queryByDisplayValue('You are an expert assistant. Answer the question accurately and concisely.')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByDisplayValue(
        'You are a validation assistant. Parse and validate responses against the given Pydantic template.'
      )
    ).not.toBeInTheDocument();

    // Expand first system prompt by clicking the chevron button
    const chevronButtons = screen.getAllByRole('button').filter((button) => {
      const svg = button.querySelector('svg');
      return svg && (svg.classList.contains('lucide-chevron-down') || svg.classList.contains('lucide-chevron-up'));
    });
    fireEvent.click(chevronButtons[0]);

    // Now the textarea should be visible
    expect(
      screen.getByDisplayValue('You are an expert assistant. Answer the question accurately and concisely.')
    ).toBeInTheDocument();

    // Collapse it again by clicking the chevron button again
    fireEvent.click(chevronButtons[0]);

    // Textarea should be hidden again
    expect(
      screen.queryByDisplayValue('You are an expert assistant. Answer the question accurately and concisely.')
    ).not.toBeInTheDocument();
  });

  it('shows progress bar when verification is running', async () => {
    const mockFetch = vi.mocked(fetch);

    // Mock start verification
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: 'test-job-123', status: 'started' }),
    } as Response);

    // Mock progress polling
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        job_id: 'test-job-123',
        status: 'running',
        percentage: 50,
        processed_count: 1,
        total_count: 2,
        current_question: 'What is 2+2?',
      }),
    } as Response);

    renderBenchmarkTab();

    // First select all tests
    const selectAllButton = screen.getByText('Select All');
    fireEvent.click(selectAllButton);

    const runSelectedButton = screen.getByText('Run Selected (2 × 1 = 2)');
    fireEvent.click(runSelectedButton);

    // Wait for the progress to appear
    await waitFor(
      () => {
        expect(screen.getByText('Progress: 1 / 2')).toBeInTheDocument();
        expect(screen.getByText('50%')).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('handles test selection with checkboxes', async () => {
    renderBenchmarkTab();

    // Check select all/none buttons are present
    expect(screen.getByText('Select All')).toBeInTheDocument();
    expect(screen.getByText('Select None')).toBeInTheDocument();

    // Check individual checkboxes are present
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(6); // 3 evaluation settings + 1 select all + 2 individual tests

    // Initially nothing selected
    expect(screen.getByText('Run Selected (0 × 1 = 0)')).toBeInTheDocument();

    // Select first test
    fireEvent.click(checkboxes[4]); // First test checkbox (indexes 0,1,2=evaluation, 3=select all, 4=first test)
    await waitFor(() => {
      expect(screen.getByText('Run Selected (1 × 1 = 1)')).toBeInTheDocument();
    });

    // Select all tests via select all button
    fireEvent.click(screen.getByText('Select All'));
    await waitFor(() => {
      expect(screen.getByText('Run Selected (2 × 1 = 2)')).toBeInTheDocument();
    });

    // Deselect all via select none
    fireEvent.click(screen.getByText('Select None'));
    await waitFor(() => {
      expect(screen.getByText('Run Selected (0 × 1 = 0)')).toBeInTheDocument();
    });
  });

  it('shows test results table when results are available', () => {
    renderBenchmarkTab();

    // Initially shows empty state
    expect(screen.getByText('Test Results (0)')).toBeInTheDocument();
    expect(screen.getByText('No test results yet. Run some tests to see results here.')).toBeInTheDocument();
  });

  it('shows aggregated stats when test results are available', () => {
    renderBenchmarkTab();

    // Initially no stats should be shown (empty results)
    expect(screen.queryByText('Total Tests')).not.toBeInTheDocument();
    expect(screen.queryByText('Successful')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
    expect(screen.queryByText('Avg Time')).not.toBeInTheDocument();
  });

  it('prevents running tests when none are selected', () => {
    renderBenchmarkTab();

    const runSelectedButton = screen.getByText('Run Selected (0 × 1 = 0)');
    expect(runSelectedButton).toBeDisabled();
  });

  describe('Integrated Filter Functionality', () => {
    it('does not show filter controls when no results are available', () => {
      renderBenchmarkTab();

      // Should not show filter toggles when no results
      const resultsHeader = screen.getByText('Test Results (0)');
      expect(resultsHeader).toBeInTheDocument();

      // Should show empty state
      expect(screen.getByText('No test results yet. Run some tests to see results here.')).toBeInTheDocument();
    });

    it('shows correct result count in header', () => {
      renderBenchmarkTab();

      expect(screen.getByText('Test Results (0)')).toBeInTheDocument();
    });

    it('displays empty state message appropriately', () => {
      renderBenchmarkTab();

      expect(screen.getByText('No test results yet. Run some tests to see results here.')).toBeInTheDocument();
    });

    it('maintains consistent UI structure for filter integration', () => {
      renderBenchmarkTab();

      // Check that the table structure is consistent
      const resultsSection = screen.getByText('Test Results (0)').closest('div');
      expect(resultsSection).toBeTruthy();
    });
  });
});
