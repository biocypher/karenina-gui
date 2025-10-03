import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseManageTab } from '../DatabaseManageTab';

// Mock fetch globally
global.fetch = vi.fn();

describe('DatabaseManageTab', () => {
  const mockOnLoadBenchmark = vi.fn();
  const mockStorageUrl = 'sqlite:///test.db';

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it('shows loading state while fetching benchmarks', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise(() => {}));

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    // Should show loader while fetching
    const loader = screen.getByRole('img', { hidden: true }); // Lucide icons have role="img"
    expect(loader).toBeInTheDocument();
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
          dataset_metadata: { name: 'Test Benchmark' },
          questions: {},
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

    // Mock loading failure
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Benchmark not found' }),
    });

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

    expect(await screen.findByText('Create New Benchmark in Database')).toBeInTheDocument();
  });

  it('shows create benchmark form when button is clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const createButton = await screen.findByText('Create New Benchmark in Database');
    await user.click(createButton);

    expect(screen.getByText('Create New Benchmark')).toBeInTheDocument();
    expect(screen.getByLabelText(/Benchmark Name/)).toBeInTheDocument();
  });

  it('hides create button when form is shown', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    const createButton = await screen.findByText('Create New Benchmark in Database');
    await user.click(createButton);

    expect(screen.queryByText('Create New Benchmark in Database')).not.toBeInTheDocument();
  });

  it('reloads benchmarks after creating new benchmark', async () => {
    const user = userEvent.setup();

    // Initial empty list
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    await user.click(await screen.findByText('Create New Benchmark in Database'));

    // Mock create benchmark success
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmark_name: 'New Benchmark',
        checkpoint_data: {
          dataset_metadata: { name: 'New Benchmark' },
          questions: {},
          global_rubric: null,
        },
      }),
    });

    // Mock reload with new benchmark
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        benchmarks: [{ id: '1', name: 'New Benchmark', total_questions: 0, finished_count: 0, unfinished_count: 0 }],
      }),
    });

    // Mock load benchmark
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        checkpoint_data: {
          dataset_metadata: { name: 'New Benchmark' },
          questions: {},
          global_rubric: null,
        },
      }),
    });

    // Fill and submit form
    await user.type(screen.getByLabelText(/Benchmark Name/), 'New Benchmark');
    await user.click(screen.getByText('Create Benchmark'));

    // Should load the new benchmark and call onLoadBenchmark
    await waitFor(() => {
      expect(mockOnLoadBenchmark).toHaveBeenCalled();
    });
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    render(<DatabaseManageTab storageUrl={mockStorageUrl} onLoadBenchmark={mockOnLoadBenchmark} />);

    // Should show error state - actual error message varies
    await waitFor(() => {
      expect(screen.getByText(/Network error|Failed to load/i)).toBeInTheDocument();
    });
  });
});
