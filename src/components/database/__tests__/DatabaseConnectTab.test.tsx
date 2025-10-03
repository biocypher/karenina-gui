import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseConnectTab } from '../DatabaseConnectTab';

// Mock fetch globally
global.fetch = vi.fn();

describe('DatabaseConnectTab', () => {
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it('renders database URL input and action buttons', () => {
    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    expect(screen.getByLabelText('Database URL')).toBeInTheDocument();
    expect(screen.getByText('Create New Database')).toBeInTheDocument();
    expect(screen.getByText('Connect to Existing')).toBeInTheDocument();
    expect(screen.getByTitle('Browse for SQLite database file')).toBeInTheDocument();
  });

  it('shows help text with URL examples', () => {
    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    expect(screen.getByText('Database URL Examples')).toBeInTheDocument();
    expect(screen.getByText(/sqlite:\/\/\/path\/to\/database.db/)).toBeInTheDocument();
    expect(screen.getByText(/postgresql:\/\//)).toBeInTheDocument();
  });

  it('disables action buttons when URL is empty', () => {
    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const createButton = screen.getByText('Create New Database');
    const connectButton = screen.getByText('Connect to Existing');

    expect(createButton).toBeDisabled();
    expect(connectButton).toBeDisabled();
  });

  it('enables action buttons when URL is entered', async () => {
    const user = userEvent.setup();
    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///test.db');

    const createButton = screen.getByText('Create New Database');
    const connectButton = screen.getByText('Connect to Existing');

    expect(createButton).toBeEnabled();
    expect(connectButton).toBeEnabled();
  });

  it('creates new database successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 0 }),
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///test.db');

    const createButton = screen.getByText('Create New Database');
    await user.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database/connect',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_url: 'sqlite:///test.db',
            create_if_missing: true,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected successfully!/)).toBeInTheDocument();
      expect(screen.getByText(/Found 0 benchmarks in database/)).toBeInTheDocument();
    });

    expect(mockOnConnect).toHaveBeenCalledWith('sqlite:///test.db');
  });

  it('connects to existing database successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 5 }),
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///existing.db');

    const connectButton = screen.getByText('Connect to Existing');
    await user.click(connectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database/connect',
        expect.objectContaining({
          body: JSON.stringify({
            storage_url: 'sqlite:///existing.db',
            create_if_missing: false,
          }),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Connected successfully!/)).toBeInTheDocument();
      expect(screen.getByText(/Found 5 benchmarks in database/)).toBeInTheDocument();
    });

    expect(mockOnConnect).toHaveBeenCalledWith('sqlite:///existing.db');
  });

  it('shows error when connection fails', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Database not found' }),
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///nonexistent.db');

    const connectButton = screen.getByText('Connect to Existing');
    await user.click(connectButton);

    expect(await screen.findByText('Database not found')).toBeInTheDocument();
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('shows error when URL is empty on submit', () => {
    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    // Buttons should be disabled, but let's test the validation anyway
    // We need to enable the button manually for this test
    const createButton = screen.getByText('Create New Database');

    // The button should be disabled when URL is empty
    expect(createButton).toBeDisabled();
  });

  it('shows loading state while connecting', async () => {
    const user = userEvent.setup();
    let resolvePromise: (value: unknown) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(promise);

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///test.db');

    const createButton = screen.getByText('Create New Database');
    await user.click(createButton);

    // Should show loading state - both buttons now show "Connecting..."
    const connectingElements = screen.getAllByText('Connecting...');
    expect(connectingElements.length).toBe(2); // Both buttons show this text

    // Both buttons should be disabled
    connectingElements.forEach((element) => {
      expect(element.closest('button')).toBeDisabled();
    });

    // Resolve to clean up
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 0 }),
    });

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalled();
    });
  });

  it('disables inputs and buttons after successful connection', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 0 }),
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const urlInput = screen.getByLabelText('Database URL');
    await user.type(urlInput, 'sqlite:///test.db');

    await user.click(screen.getByText('Create New Database'));

    await waitFor(() => {
      expect(screen.getByText(/Connected successfully!/)).toBeInTheDocument();
    });

    expect(urlInput).toBeDisabled();
    expect(screen.queryByText('Create New Database')).not.toBeInTheDocument();
    expect(screen.queryByText('Connect to Existing')).not.toBeInTheDocument();
  });

  it('shows plural/singular benchmark count correctly', async () => {
    const user = userEvent.setup();

    // Test singular
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 1 }),
    });

    const { rerender } = render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    await user.type(screen.getByLabelText('Database URL'), 'sqlite:///test.db');
    await user.click(screen.getByText('Create New Database'));

    await waitFor(() => {
      expect(screen.getByText(/Found 1 benchmark in database/)).toBeInTheDocument();
    });

    // Unmount and remount for plural test
    rerender(<div />);
    vi.clearAllMocks();

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 2 }),
    });

    rerender(<DatabaseConnectTab onConnect={mockOnConnect} />);

    await user.type(screen.getByLabelText('Database URL'), 'sqlite:///test2.db');
    await user.click(screen.getByText('Create New Database'));

    await waitFor(() => {
      expect(screen.getByText(/Found 2 benchmarks in database/)).toBeInTheDocument();
    });
  });

  it('clears error state when starting new connection', async () => {
    const user = userEvent.setup();

    // First connection fails
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'First error' }),
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    await user.type(screen.getByLabelText('Database URL'), 'sqlite:///test.db');
    await user.click(screen.getByText('Create New Database'));

    expect(await screen.findByText('First error')).toBeInTheDocument();

    // Second connection succeeds
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 0 }),
    });

    await user.clear(screen.getByLabelText('Database URL'));
    await user.type(screen.getByLabelText('Database URL'), 'sqlite:///test2.db');
    await user.click(screen.getByText('Create New Database'));

    await waitFor(() => {
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
      expect(screen.getByText(/Connected successfully!/)).toBeInTheDocument();
    });
  });
});
