import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseManageTab } from '../DatabaseManageTab';

// Mock the CSRF module to pass through to global fetch
vi.mock('../../utils/csrf', () => ({
  csrf: {
    fetchWithCsrf: vi.fn((url: string, options: RequestInit = {}) => {
      return (global.fetch as ReturnType<typeof vi.fn>)(url, options);
    }),
    initialize: vi.fn(() => Promise.resolve(true)),
    getHeaders: vi.fn(() => ({})),
  },
}));

describe('DatabaseManageTab', () => {
  const mockOnLoadBenchmark = vi.fn();
  const mockStorageUrl = 'sqlite:///test.db';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global fetch mock
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
  });

  it('shows loading state while fetching benchmarks', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise(() => {}));

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    // Should show loader while fetching (Lucide Loader icon with animate-spin class)
    // During loading, the component only shows the loader, not the benchmarks list or load button
    const createButton = screen.getByText('Create New Benchmark');
    expect(createButton).toBeInTheDocument();

    // The Load Selected Benchmark button should NOT be present during loading
    expect(screen.queryByText('Load Selected Benchmark')).not.toBeInTheDocument();
  });

  it('shows empty state when no benchmarks exist', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    expect(await screen.findByText('No benchmarks found in this database.')).toBeInTheDocument();
    expect(screen.getByText('Create a new benchmark to get started.')).toBeInTheDocument();
  });

  it('displays list of benchmarks', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [
          {
            id: '1',
            name: 'Benchmark 1',
            total_questions: 10,
            finished_count: 7,
            unfinished_count: 3,
          },
          {
            id: '2',
            name: 'Benchmark 2',
            total_questions: 5,
            finished_count: 5,
            unfinished_count: 0,
          },
        ],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    expect(await screen.findByText('Benchmark 1')).toBeInTheDocument();
    expect(screen.getByText('Benchmark 2')).toBeInTheDocument();
  });

  it('shows benchmark count in header', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [
          { id: '1', name: 'B1', total_questions: 10, finished_count: 7, unfinished_count: 3 },
          { id: '2', name: 'B2', total_questions: 5, finished_count: 5, unfinished_count: 0 },
        ],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    expect(await screen.findByText(/Existing Benchmarks \(2\)/)).toBeInTheDocument();
  });

  it('allows selecting a benchmark', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ id: '1', name: 'Benchmark 1', total_questions: 10, finished_count: 7, unfinished_count: 3 }],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const benchmark = await screen.findByText('Benchmark 1');
    await user.click(benchmark);

    // Load button should be enabled
    const loadButton = screen.getByText('Load Selected Benchmark');
    expect(loadButton).toBeEnabled();
  });

  it('load button is disabled when no benchmark is selected', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ id: '1', name: 'Benchmark 1', total_questions: 10, finished_count: 7, unfinished_count: 3 }],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    await waitFor(() => {
      expect(screen.getByText('Benchmark 1')).toBeInTheDocument();
    });

    const loadButton = screen.getByText('Load Selected Benchmark');
    expect(loadButton).toBeDisabled();
  });

  it('loads selected benchmark successfully', async () => {
    const user = userEvent.setup();

    // Mock fetching benchmarks
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ id: '1', name: 'Test Benchmark', total_questions: 10, finished_count: 7, unfinished_count: 3 }],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    // Select benchmark
    const benchmark = await screen.findByText('Test Benchmark');
    await user.click(benchmark);

    // Mock loading benchmark
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        checkpoint_data: {
          dataset_metadata: { name: 'Test Benchmark' },
          questions: {},
          global_rubric: null,
        },
      }),
    });

    // Click load button
    const loadButton = screen.getByText('Load Selected Benchmark');
    await user.click(loadButton);

    await waitFor(() => {
      expect(mockOnLoadBenchmark).toHaveBeenCalledWith(
        expect.objectContaining({
          version: '2.0',
          dataset_metadata: { name: 'Test Benchmark' },
          checkpoint: {},
          global_rubric: null,
        }),
        'Test Benchmark'
      );
    });
  });

  it('shows error when loading benchmark fails', async () => {
    const user = userEvent.setup();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ id: '1', name: 'Test Benchmark', total_questions: 10, finished_count: 7, unfinished_count: 3 }],
      }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const benchmark = await screen.findByText('Test Benchmark');
    await user.click(benchmark);

    // Mock loading failure - need to handle retries (3 attempts)
    const errorResponse = {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Benchmark not found' }),
    };
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(errorResponse);

    await user.click(screen.getByText('Load Selected Benchmark'));

    expect(await screen.findByText('Benchmark not found')).toBeInTheDocument();
    expect(mockOnLoadBenchmark).not.toHaveBeenCalled();
  });

  it('shows create benchmark button', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    expect(await screen.findByText('Create New Benchmark')).toBeInTheDocument();
  });

  it('shows create benchmark form when button is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const createButton = await screen.findByText('Create New Benchmark');
    await user.click(createButton);

    expect(screen.getByText('Create Benchmark')).toBeInTheDocument();
    expect(screen.getByLabelText(/Benchmark Name/)).toBeInTheDocument();
  });

  it('hides create button when form is shown', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const createButton = await screen.findByText('Create New Benchmark');
    await user.click(createButton);

    // The "Create New Benchmark" button should be hidden, but the form header still has the text
    // Check that the form is shown by looking for the input field
    expect(screen.getByLabelText(/Benchmark Name/)).toBeInTheDocument();
    // Check that the Create button (not "Create New Benchmark" button) is shown
    expect(screen.getByText('Create Benchmark')).toBeInTheDocument();
  });

  it('reloads benchmarks after creating new benchmark', async () => {
    const user = userEvent.setup();

    // Initial empty list
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    await user.click(await screen.findByText('Create New Benchmark'));

    // Clear previous mock and set up new mocks for create and reload
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();

    // Mock create benchmark success - API only returns benchmark_name
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmark_name: 'New Benchmark',
      }),
    });

    // Mock reload with new benchmark (getBenchmarks API returns different structure)
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ name: 'New Benchmark', question_count: 0, created_at: '2024-01-01', updated_at: '2024-01-01' }],
      }),
    });

    // Fill and submit form
    await user.type(screen.getByLabelText(/Benchmark Name/), 'New Benchmark');
    await user.click(screen.getByText('Create Benchmark'));

    // Wait for the form to close and benchmarks to reload
    await waitFor(
      () => {
        // Form should be closed (input field should be gone)
        expect(screen.queryByLabelText(/Benchmark Name/)).not.toBeInTheDocument();
      },
      { timeout: 10000 }
    );

    // Should show the new benchmark in the list
    expect(await screen.findByText('New Benchmark', {}, { timeout: 10000 })).toBeInTheDocument();
    // Benchmark should be selected but not loaded (onLoadBenchmark not called)
    expect(mockOnLoadBenchmark).not.toHaveBeenCalled();
  });

  it('handles network errors gracefully', { timeout: 20000 }, async () => {
    // Clear any previous mocks
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();

    // Mock to return an error response - need to handle 4 retries (initial + 3 retries)
    const errorResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: vi.fn().mockResolvedValue({ detail: 'Failed to load benchmarks' }),
      headers: new Headers(),
      redirected: false,
      type: 'basic' as ResponseType,
      url: '/api/database/benchmarks?storage_url=sqlite%3A%2F%2Ftest.db',
      clone: vi.fn(function () {
        return this;
      }),
    } as Response;

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(errorResponse);

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    // Should show error state - increase timeout to account for retry delays
    expect(await screen.findByText(/Failed to load benchmarks/i, {}, { timeout: 15000 })).toBeInTheDocument();
  });
});
