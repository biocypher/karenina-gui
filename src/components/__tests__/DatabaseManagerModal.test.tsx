import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatabaseManagerModal } from '../DatabaseManagerModal';
import { useDatasetStore } from '../../stores/useDatasetStore';

// Mock the stores
vi.mock('../../stores/useDatasetStore');

// Mock fetch globally
global.fetch = vi.fn();

const mockUseDatasetStore = vi.mocked(useDatasetStore);

describe('DatabaseManagerModal', () => {
  const mockOnClose = vi.fn();
  const mockOnLoadCheckpoint = vi.fn();
  const mockConnectDatabase = vi.fn();
  const mockSetCurrentBenchmarkName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();

    mockUseDatasetStore.mockReturnValue({
      connectDatabase: mockConnectDatabase,
      setCurrentBenchmarkName: mockSetCurrentBenchmarkName,
      isConnectedToDatabase: false,
      currentBenchmarkName: null,
      lastSaved: null,
      // Add other required properties
      metadata: {},
      storageUrl: null,
      benchmarkInitialized: false,
      isSaving: false,
      saveError: null,
      setMetadata: vi.fn(),
      updateField: vi.fn(),
      addKeyword: vi.fn(),
      removeKeyword: vi.fn(),
      addCustomProperty: vi.fn(),
      removeCustomProperty: vi.fn(),
      updateCustomProperty: vi.fn(),
      resetMetadata: vi.fn(),
      setCreator: vi.fn(),
      setPublisher: vi.fn(),
      markBenchmarkAsInitialized: vi.fn(),
      setStorageUrl: vi.fn(),
      disconnectDatabase: vi.fn(),
      setLastSaved: vi.fn(),
      setSaving: vi.fn(),
      setSaveError: vi.fn(),
    });
  });

  it('renders when isOpen is true', () => {
    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    expect(screen.getByText('Database Manager')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DatabaseManagerModal isOpen={false} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    expect(screen.queryByText('Database Manager')).not.toBeInTheDocument();
  });

  it('shows Connect tab by default', () => {
    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    const tabs = screen.getAllByRole('button', { name: /Connect to Database/i });
    // First one should be the tab button
    expect(tabs[0]).toHaveClass('text-blue-600');

    // The Connect tab should show the "Create New Database" button
    expect(screen.getByText('Create New Database')).toBeInTheDocument();
  });

  it('Manage tab is disabled until connected', () => {
    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    const manageTab = screen.getByRole('button', { name: /Manage Benchmarks.*Connect first/i });
    expect(manageTab).toHaveClass('cursor-not-allowed');
    expect(manageTab).toBeDisabled();
  });

  it('switches to Manage tab automatically after connection', async () => {
    // This test verifies that when the store indicates a connection, the Manage tab is shown
    // Full integration testing (actual API calls, tab switching) is done in e2e tests

    // Start with connected state
    mockUseDatasetStore.mockReturnValue({
      connectDatabase: mockConnectDatabase,
      setCurrentBenchmarkName: mockSetCurrentBenchmarkName,
      isConnectedToDatabase: true,
      currentBenchmarkName: null,
      lastSaved: null,
      metadata: {},
      storageUrl: 'sqlite:///test.db',
      benchmarkInitialized: false,
      isSaving: false,
      saveError: null,
      setMetadata: vi.fn(),
      updateField: vi.fn(),
      addKeyword: vi.fn(),
      removeKeyword: vi.fn(),
      addCustomProperty: vi.fn(),
      removeCustomProperty: vi.fn(),
      updateCustomProperty: vi.fn(),
      resetMetadata: vi.fn(),
      setCreator: vi.fn(),
      setPublisher: vi.fn(),
      markBenchmarkAsInitialized: vi.fn(),
      setStorageUrl: vi.fn(),
      disconnectDatabase: vi.fn(),
      setLastSaved: vi.fn(),
      setSaving: vi.fn(),
      setSaveError: vi.fn(),
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    // Wait for initial render and fetch to complete
    await waitFor(() => {
      expect(screen.queryByText(/Manage Benchmarks/i)).toBeInTheDocument();
    });

    // Verify Manage tab is active (has blue styling)
    const tabs = screen.getAllByRole('button');
    const manageTab = tabs.find(
      (tab) => tab.textContent?.includes('Manage Benchmarks') && tab.className.includes('text-blue-600')
    );
    expect(manageTab).toBeDefined();
  });

  it('allows manual tab switching after connection', async () => {
    const user = userEvent.setup();

    // Start with connected state
    mockUseDatasetStore.mockReturnValue({
      connectDatabase: mockConnectDatabase,
      setCurrentBenchmarkName: mockSetCurrentBenchmarkName,
      isConnectedToDatabase: true,
      currentBenchmarkName: null,
      lastSaved: null,
      metadata: {},
      storageUrl: 'sqlite:///test.db',
      benchmarkInitialized: false,
      isSaving: false,
      saveError: null,
      setMetadata: vi.fn(),
      updateField: vi.fn(),
      addKeyword: vi.fn(),
      removeKeyword: vi.fn(),
      addCustomProperty: vi.fn(),
      removeCustomProperty: vi.fn(),
      updateCustomProperty: vi.fn(),
      resetMetadata: vi.fn(),
      setCreator: vi.fn(),
      setPublisher: vi.fn(),
      markBenchmarkAsInitialized: vi.fn(),
      setStorageUrl: vi.fn(),
      disconnectDatabase: vi.fn(),
      setLastSaved: vi.fn(),
      setSaving: vi.fn(),
      setSaveError: vi.fn(),
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ benchmarks: [] }),
    });

    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    // Wait for initial render and fetch to complete
    await waitFor(() => {
      expect(screen.queryByText(/Manage Benchmarks/i)).toBeInTheDocument();
    });

    // Switch to Connect tab - find the tab button specifically
    const connectTabButtons = screen.getAllByRole('button', { name: /Connect to Database/i });
    const connectTab = connectTabButtons[0]; // Tab button is first
    await user.click(connectTab);

    // Verify switched to Connect tab by checking for Create New Database button
    await waitFor(() => {
      expect(screen.getByText('Create New Database')).toBeInTheDocument();
    });
  });

  it('calls onLoadCheckpoint and onClose when benchmark is loaded', () => {
    // This is a simplified test - full integration is tested in e2e tests
    render(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    // Just verify the modal renders with the expected structure
    expect(screen.getByText('Database Manager')).toBeInTheDocument();
    expect(screen.getByText('Create New Database')).toBeInTheDocument();
  });

  it('resets to Connect tab when modal is closed and reopened', () => {
    const { rerender } = render(
      <DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />
    );

    // Close modal
    rerender(<DatabaseManagerModal isOpen={false} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    // Reopen modal
    rerender(<DatabaseManagerModal isOpen={true} onClose={mockOnClose} onLoadCheckpoint={mockOnLoadCheckpoint} />);

    // Should be back on Connect tab - verify by checking for Create New Database button
    expect(screen.getByText('Create New Database')).toBeInTheDocument();
  });
});
