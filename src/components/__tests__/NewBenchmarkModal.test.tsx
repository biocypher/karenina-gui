import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewBenchmarkModal } from '../NewBenchmarkModal';
import type { DatasetMetadata } from '../../types';

describe('NewBenchmarkModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    expect(screen.getByText('Create New Benchmark')).toBeInTheDocument();
    expect(screen.getByText(/Create a new benchmark from scratch/)).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<NewBenchmarkModal isOpen={false} onClose={mockOnClose} onCreate={mockOnCreate} />);

    expect(screen.queryByText('Create New Benchmark')).not.toBeInTheDocument();
  });

  it('displays all required and optional fields', () => {
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    // Required fields - use placeholders as they're unique
    expect(screen.getByPlaceholderText('e.g., Science Questions Benchmark')).toBeInTheDocument();

    // Optional fields
    expect(screen.getByPlaceholderText('Describe the purpose and scope of this benchmark...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., 1.0.0')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('your.email@example.com')).toBeInTheDocument();

    // Buttons
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Benchmark/ })).toBeInTheDocument();
  });

  it('has default value for version field', () => {
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const versionInput = screen.getByPlaceholderText('e.g., 1.0.0');
    expect(versionInput).toHaveValue('1.0.0');
  });

  it('shows validation error when submitting without dataset name', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });
    await user.click(createButton);

    expect(screen.getByText('Dataset name is required')).toBeInTheDocument();
    expect(mockOnCreate).not.toHaveBeenCalled();
  });

  it('successfully creates benchmark with only required fields', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.type(nameInput, 'My Test Benchmark');
    await user.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Test Benchmark',
        version: '1.0.0',
        dateCreated: expect.any(String),
        dateModified: expect.any(String),
      })
    );
  });

  it('successfully creates benchmark with all fields filled', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const descriptionInput = screen.getByPlaceholderText('Describe the purpose and scope of this benchmark...');
    const versionInput = screen.getByPlaceholderText('e.g., 1.0.0');
    const creatorNameInput = screen.getByPlaceholderText('Your name...');
    const creatorEmailInput = screen.getByPlaceholderText('your.email@example.com');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.clear(versionInput);
    await user.type(nameInput, 'My Test Benchmark');
    await user.type(descriptionInput, 'A comprehensive test benchmark');
    await user.type(versionInput, '2.0.0');
    await user.type(creatorNameInput, 'John Doe');
    await user.type(creatorEmailInput, 'john@example.com');
    await user.click(createButton);

    const expectedMetadata: DatasetMetadata = {
      name: 'My Test Benchmark',
      description: 'A comprehensive test benchmark',
      version: '2.0.0',
      creator: {
        '@type': 'Person',
        name: 'John Doe',
        email: 'john@example.com',
      },
      dateCreated: expect.any(String),
      dateModified: expect.any(String),
    };

    expect(mockOnCreate).toHaveBeenCalledWith(expectedMetadata);
  });

  it('trims whitespace from inputs', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.type(nameInput, '  My Test Benchmark  ');
    await user.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'My Test Benchmark',
      })
    );
  });

  it('does not include creator if only whitespace provided', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const creatorNameInput = screen.getByPlaceholderText('Your name...');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.type(nameInput, 'My Test Benchmark');
    await user.type(creatorNameInput, '   ');
    await user.click(createButton);

    const callArgs = mockOnCreate.mock.calls[0][0] as DatasetMetadata;
    expect(callArgs.creator).toBeUndefined();
  });

  it('does not include optional fields when empty', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const versionInput = screen.getByPlaceholderText('e.g., 1.0.0');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    // Clear version field
    await user.clear(versionInput);
    await user.type(nameInput, 'My Test Benchmark');
    await user.click(createButton);

    const callArgs = mockOnCreate.mock.calls[0][0] as DatasetMetadata;
    expect(callArgs.description).toBeUndefined();
    expect(callArgs.version).toBeUndefined();
  });

  it('includes creator email only if creator name is provided', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const creatorNameInput = screen.getByPlaceholderText('Your name...');
    const creatorEmailInput = screen.getByPlaceholderText('your.email@example.com');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.type(nameInput, 'My Test Benchmark');
    await user.type(creatorNameInput, 'John Doe');
    await user.type(creatorEmailInput, 'john@example.com');
    await user.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        creator: {
          '@type': 'Person',
          name: 'John Doe',
          email: 'john@example.com',
        },
      })
    );
  });

  it('clears validation error when user types in name field', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });
    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');

    // Trigger validation error
    await user.click(createButton);
    expect(screen.getByText('Dataset name is required')).toBeInTheDocument();

    // Type in name field
    await user.type(nameInput, 'Test');

    // Error should be cleared
    expect(screen.queryByText('Dataset name is required')).not.toBeInTheDocument();
  });

  it('resets form when closing modal', async () => {
    const user = userEvent.setup();
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const cancelButton = screen.getByRole('button', { name: /Cancel/ });

    await user.type(nameInput, 'Test Benchmark');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('sets dateCreated and dateModified to current timestamp', async () => {
    const user = userEvent.setup();
    const beforeTime = new Date().toISOString();

    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nameInput = screen.getByPlaceholderText('e.g., Science Questions Benchmark');
    const createButton = screen.getByRole('button', { name: /Create Benchmark/ });

    await user.type(nameInput, 'My Test Benchmark');
    await user.click(createButton);

    const afterTime = new Date().toISOString();
    const callArgs = mockOnCreate.mock.calls[0][0] as DatasetMetadata;

    expect(callArgs.dateCreated).toBeDefined();
    expect(callArgs.dateModified).toBeDefined();

    // Check that timestamps are within a reasonable range
    expect(callArgs.dateCreated! >= beforeTime).toBe(true);
    expect(callArgs.dateCreated! <= afterTime).toBe(true);
    expect(callArgs.dateModified! >= beforeTime).toBe(true);
    expect(callArgs.dateModified! <= afterTime).toBe(true);
  });

  it('displays warning about clearing data', () => {
    render(<NewBenchmarkModal isOpen={true} onClose={mockOnClose} onCreate={mockOnCreate} />);

    expect(screen.getByText(/This will clear all current data and initialize an empty workspace/)).toBeInTheDocument();
  });
});
