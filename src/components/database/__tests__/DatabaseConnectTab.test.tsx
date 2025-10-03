import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseConnectTab } from '../DatabaseConnectTab';

// Mock fetch globally
global.fetch = vi.fn();

describe('DatabaseConnectTab', () => {
  const mockOnConnect = vi.fn();

  const mockListDatabasesResponse = {
    success: true,
    databases: [
      { name: 'test1.db', path: '/db/path/test1.db', size: 1024 },
      { name: 'test2.db', path: '/db/path/test2.db', size: 2048 },
    ],
    db_directory: '/db/path',
    is_default_directory: false,
  };

  const mockEmptyListResponse = {
    success: true,
    databases: [],
    db_directory: '/current/directory',
    is_default_directory: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it('loads and displays available databases on mount', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockListDatabasesResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/database/list-databases');
    });

    expect(await screen.findByText('test1.db')).toBeInTheDocument();
    expect(screen.getByText('test2.db')).toBeInTheDocument();
    expect(screen.getByText('/db/path')).toBeInTheDocument();
  });

  it('shows database directory and indicates if default', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyListResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    expect(await screen.findByText('/current/directory')).toBeInTheDocument();
    expect(screen.getByText(/set DB_PATH environment variable to change/)).toBeInTheDocument();
  });

  it('shows "No databases found" when list is empty', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyListResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    expect(await screen.findByText('No databases found')).toBeInTheDocument();
    expect(screen.getByText('Create a new database to get started')).toBeInTheDocument();
  });

  it('allows selecting a database from the list', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockListDatabasesResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    expect(db1Button.closest('button')).toHaveClass('border-blue-500');
  });

  it('enables Connect button only when database is selected', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockListDatabasesResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const connectButton = await screen.findByRole('button', { name: /^Connect$/i });
    expect(connectButton).toBeDisabled();

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    expect(connectButton).toBeEnabled();
  });

  it('connects to selected database successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockListDatabasesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, benchmark_count: 3 }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    const connectButton = screen.getByRole('button', { name: /^Connect$/i });
    await user.click(connectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database/connect',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storage_url: 'sqlite:////db/path/test1.db',
            create_if_missing: false,
          }),
        })
      );
    });

    expect(await screen.findByText(/Connected successfully!/)).toBeInTheDocument();
    expect(screen.getByText(/Found 3 benchmarks in database/)).toBeInTheDocument();
    expect(mockOnConnect).toHaveBeenCalledWith('sqlite:////db/path/test1.db');
  });

  it('shows create new database form when button clicked', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyListResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const createButton = await screen.findByRole('button', { name: /Create New Database/i });
    await user.click(createButton);

    expect(screen.getByText('Create New Database')).toBeInTheDocument();
    expect(screen.getByLabelText('Database Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Database Name')).toBeInTheDocument();
  });

  it('creates new SQLite database successfully', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyListResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, benchmark_count: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockEmptyListResponse,
          databases: [{ name: 'new_db.db', path: '/current/directory/new_db.db', size: 0 }],
        }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const createButton = await screen.findByRole('button', { name: /Create New Database/i });
    await user.click(createButton);

    const nameInput = screen.getByLabelText('Database Name');
    await user.type(nameInput, 'new_db');

    const submitButton = screen.getByRole('button', { name: /Create & Connect/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database/connect',
        expect.objectContaining({
          body: JSON.stringify({
            storage_url: 'sqlite:////current/directory/new_db.db',
            create_if_missing: true,
          }),
        })
      );
    });

    expect(await screen.findByText(/Connected successfully!/)).toBeInTheDocument();
    expect(mockOnConnect).toHaveBeenCalledWith('sqlite:////current/directory/new_db.db');
  });

  it('creates new PostgreSQL database with credentials', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockEmptyListResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, benchmark_count: 0 }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /Create New Database/i });
    await user.click(createButton);

    // Change to PostgreSQL
    const typeSelect = screen.getByLabelText('Database Type');
    await user.selectOptions(typeSelect, 'postgresql');

    // Fill in fields
    await user.type(screen.getByLabelText('Host'), 'db.example.com');
    await user.type(screen.getByLabelText('Database Name'), 'mydb');
    await user.type(screen.getByLabelText('Username'), 'user');
    await user.type(screen.getByLabelText('Password'), 'pass123');

    const submitButton = screen.getByRole('button', { name: /Create & Connect/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/database/connect',
        expect.objectContaining({
          body: JSON.stringify({
            storage_url: 'postgresql://user:pass123@db.example.com:5432/mydb',
            create_if_missing: true,
          }),
        })
      );
    });
  });

  it('can cancel create database form', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyListResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const createButton = await screen.findByRole('button', { name: /Create New Database/i });
    await user.click(createButton);

    expect(screen.getByText('Create New Database')).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(screen.queryByLabelText('Database Name')).not.toBeInTheDocument();
  });

  it('shows error when connection fails', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockListDatabasesResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Connection failed' }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    const connectButton = screen.getByRole('button', { name: /^Connect$/i });
    await user.click(connectButton);

    expect(await screen.findByText('Connection failed')).toBeInTheDocument();
    expect(mockOnConnect).not.toHaveBeenCalled();
  });

  it('shows loading state while connecting', async () => {
    const user = userEvent.setup();
    let resolveConnectPromise: (value: unknown) => void;
    const connectPromise = new Promise((resolve) => {
      resolveConnectPromise = resolve;
    });

    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockListDatabasesResponse,
      })
      .mockReturnValueOnce(connectPromise);

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    const connectButton = screen.getByRole('button', { name: /^Connect$/i });
    await user.click(connectButton);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();

    // Resolve to clean up
    resolveConnectPromise!({
      ok: true,
      json: async () => ({ success: true, benchmark_count: 0 }),
    });

    await waitFor(() => {
      expect(mockOnConnect).toHaveBeenCalled();
    });
  });

  it('displays connection guide with DB_PATH information', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyListResponse,
    });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    expect(await screen.findByText(/DB_PATH/)).toBeInTheDocument();
    expect(screen.getByText(/environment variable to specify where databases are stored/)).toBeInTheDocument();
  });

  it('shows plural/singular benchmark count correctly', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockListDatabasesResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, benchmark_count: 1 }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    const connectButton = screen.getByRole('button', { name: /^Connect$/i });
    await user.click(connectButton);

    expect(await screen.findByText(/Found 1 benchmark in database/)).toBeInTheDocument();
  });

  it('clears error when selecting different database', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockListDatabasesResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ detail: 'Connection error' }),
      });

    render(<DatabaseConnectTab onConnect={mockOnConnect} />);

    const db1Button = await screen.findByText('test1.db');
    await user.click(db1Button.closest('button')!);

    const connectButton = screen.getByRole('button', { name: /^Connect$/i });
    await user.click(connectButton);

    expect(await screen.findByText('Connection error')).toBeInTheDocument();

    // Select different database
    const db2Button = screen.getByText('test2.db');
    await user.click(db2Button.closest('button')!);

    expect(screen.queryByText('Connection error')).not.toBeInTheDocument();
  });
});
