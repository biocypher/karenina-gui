import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateBenchmarkForm } from '../CreateBenchmarkForm';

// Mock fetch globally
global.fetch = vi.fn();

describe('CreateBenchmarkForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockStorageUrl = 'sqlite:///test.db';

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it('renders form with all input fields', () => {
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/Benchmark Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Version/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Creator/)).toBeInTheDocument();
  });

  it('shows required indicator for benchmark name', () => {
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const nameLabel = screen.getByText(/Benchmark Name/);
    expect(nameLabel.parentElement?.textContent).toContain('*');
  });

  it('has default version value of 1.0.0', () => {
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const versionInput = screen.getByLabelText(/Version/) as HTMLInputElement;
    expect(versionInput.value).toBe('1.0.0');
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Find the X button in the header
    const closeButton = screen.getByRole('button', { name: '' });
    await user.click(closeButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when name is empty', () => {
    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const submitButton = screen.getByText('Create Benchmark');
    expect(submitButton).toBeDisabled();
  });

  it('submits form with minimal data (name only)', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmark_name: 'Test Benchmark' }),
    });

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/Benchmark Name/);
    await user.type(nameInput, 'Test Benchmark');

    const submitButton = screen.getByText('Create Benchmark');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v2/benchmarks',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_url: mockStorageUrl,
            name: 'Test Benchmark',
            description: undefined,
            version: '1.0.0',
            creator: undefined,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('Test Benchmark');
    });
  });

  it('submits form with all fields filled', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmark_name: 'Complete Benchmark' }),
    });

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Benchmark Name/), 'Complete Benchmark');
    await user.type(screen.getByLabelText(/Description/), 'A comprehensive test benchmark');
    await user.clear(screen.getByLabelText(/Version/));
    await user.type(screen.getByLabelText(/Version/), '2.0.0');
    await user.type(screen.getByLabelText(/Creator/), 'Test User');

    const submitButton = screen.getByText('Create Benchmark');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v2/benchmarks',
        expect.objectContaining({
          body: JSON.stringify({
            storage_url: mockStorageUrl,
            name: 'Complete Benchmark',
            description: 'A comprehensive test benchmark',
            version: '2.0.0',
            creator: 'Test User',
          }),
        })
      );
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith('Complete Benchmark');
    });
  });

  it('shows loading state while creating', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Benchmark Name/), 'Test');
    const submitButton = screen.getByText('Create Benchmark');
    await user.click(submitButton);

    // Should show loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ benchmark_name: 'Test' }),
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles API error gracefully', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Database connection failed' }),
    });

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Benchmark Name/), 'Test Benchmark');
    await user.click(screen.getByText('Create Benchmark'));

    expect(await screen.findByText('Database connection failed')).toBeInTheDocument();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('disables inputs while creating', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Benchmark Name/), 'Test');
    await user.click(screen.getByText('Create Benchmark'));

    // All inputs should be disabled
    expect(screen.getByLabelText(/Benchmark Name/)).toBeDisabled();
    expect(screen.getByLabelText(/Description/)).toBeDisabled();
    expect(screen.getByLabelText(/Version/)).toBeDisabled();
    expect(screen.getByLabelText(/Creator/)).toBeDisabled();

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      json: async () => ({ benchmark_name: 'Test' }),
    });
  });

  it('trims whitespace from input fields', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmark_name: 'Trimmed' }),
    });

    render(<CreateBenchmarkForm storageUrl={mockStorageUrl} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    await user.type(screen.getByLabelText(/Benchmark Name/), '  Trimmed  ');
    await user.type(screen.getByLabelText(/Description/), '  With spaces  ');
    await user.click(screen.getByText('Create Benchmark'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v2/benchmarks',
        expect.objectContaining({
          body: expect.stringContaining('"name":"Trimmed"'),
        })
      );
    });
  });
});
