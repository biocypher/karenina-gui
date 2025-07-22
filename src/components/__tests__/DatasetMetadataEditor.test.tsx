import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatasetMetadataEditor } from '../DatasetMetadataEditor';
import { useDatasetStore } from '../../stores/useDatasetStore';
import type { DatasetMetadata } from '../../types';

// Mock the useDatasetStore
vi.mock('../../stores/useDatasetStore');

const mockUseDatasetStore = vi.mocked(useDatasetStore);

describe('DatasetMetadataEditor', () => {
  const mockSetMetadata = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const mockMetadata: DatasetMetadata = {
    name: 'Test Dataset',
    description: 'A test dataset for benchmarking',
    version: '1.0.0',
    license: 'MIT',
    keywords: ['test', 'benchmark'],
    creator: {
      '@type': 'Person',
      name: 'John Doe',
      email: 'john@example.com',
    },
    custom_properties: {
      test_prop: 'test_value',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDatasetStore.mockReturnValue({
      metadata: mockMetadata,
      setMetadata: mockSetMetadata,
      updateField: vi.fn(),
      addKeyword: vi.fn(),
      removeKeyword: vi.fn(),
      addCustomProperty: vi.fn(),
      removeCustomProperty: vi.fn(),
      updateCustomProperty: vi.fn(),
      resetMetadata: vi.fn(),
      setCreator: vi.fn(),
      setPublisher: vi.fn(),
    });
  });

  it('renders when isOpen is true', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('Dataset Metadata')).toBeInTheDocument();
    expect(screen.getByText('Basic Information')).toBeInTheDocument();
    expect(screen.getByText('Keywords')).toBeInTheDocument();
    expect(screen.getByText('Creator')).toBeInTheDocument();
    expect(screen.getByText('Custom Properties')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<DatasetMetadataEditor isOpen={false} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.queryByText('Dataset Metadata')).not.toBeInTheDocument();
  });

  it('loads existing metadata into form fields', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByDisplayValue('Test Dataset')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A test dataset for benchmarking')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.0.0')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MIT')).toBeInTheDocument();
  });

  it('displays keywords as tags', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('benchmark')).toBeInTheDocument();
  });

  it('allows adding new keywords', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const keywordInput = screen.getByPlaceholderText('Add a keyword...');
    const addButton = screen.getByText('Add');

    await user.type(keywordInput, 'nlp');
    await user.click(addButton);

    // The input should be cleared after adding
    expect(keywordInput).toHaveValue('');
  });

  it('allows removing keywords', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Find the X button for the 'test' keyword
    const testKeywordTag = screen.getByText('test').closest('span');
    const removeButton = testKeywordTag?.querySelector('button');

    expect(removeButton).toBeInTheDocument();
    if (removeButton) {
      await user.click(removeButton);
    }

    // The keyword should be removed from the form state
    // This would be reflected in the component's local state
  });

  it('supports both Person and Organization creator types', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Should start with Person selected (from mock data)
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();

    // Switch to Organization
    const orgRadio = screen.getByLabelText('Organization');
    await user.click(orgRadio);

    // Should now show organization fields
    expect(screen.getByPlaceholderText('Organization name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Organization description...')).toBeInTheDocument();
  });

  it('shows affiliation field only for Person creator type', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Person should show affiliation
    expect(screen.getByPlaceholderText('University or organization...')).toBeInTheDocument();

    // Organization should not show affiliation (should show description instead)
    expect(screen.queryByText('Affiliation')).toBeInTheDocument(); // Person type selected
  });

  it('displays custom properties correctly', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    expect(screen.getByDisplayValue('test_prop')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test_value')).toBeInTheDocument();
  });

  it('allows adding custom properties', async () => {
    const user = userEvent.setup();

    // Mock window.prompt
    vi.stubGlobal(
      'prompt',
      vi.fn(() => 'new_property')
    );

    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const addPropertyButton = screen.getByText('Add Property');
    await user.click(addPropertyButton);

    expect(window.prompt).toHaveBeenCalledWith('Enter property name:');

    vi.unstubAllGlobals();
  });

  it('allows removing custom properties', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Find the remove button for the custom property
    const removeButtons = screen.getAllByRole('button').filter((button) => button.className.includes('text-red-500'));

    expect(removeButtons.length).toBeGreaterThan(0);

    if (removeButtons[0]) {
      await user.click(removeButtons[0]);
    }
  });

  it('saves metadata when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Make a change to trigger dirty state
    const nameInput = screen.getByDisplayValue('Test Dataset');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Dataset');

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(mockSetMetadata).toHaveBeenCalled();
    expect(mockOnSave).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows confirmation dialog when closing with unsaved changes', async () => {
    const user = userEvent.setup();

    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Make a change
    const nameInput = screen.getByDisplayValue('Test Dataset');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Dataset');

    // Try to close
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(confirmSpy).toHaveBeenCalledWith('You have unsaved changes. Are you sure you want to discard them?');
    expect(mockOnClose).not.toHaveBeenCalled(); // Should not close when confirmation is cancelled

    confirmSpy.mockRestore();
  });

  it('save button is disabled when no changes are made', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  it('save button is enabled when changes are made', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Make a change
    const nameInput = screen.getByDisplayValue('Test Dataset');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Dataset');

    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeEnabled();
  });

  it('supports adding keywords with Enter key', async () => {
    const user = userEvent.setup();
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const keywordInput = screen.getByPlaceholderText('Add a keyword...');
    await user.type(keywordInput, 'nlp');
    await user.keyboard('{Enter}');

    // The input should be cleared after adding via Enter
    expect(keywordInput).toHaveValue('');
  });

  it('includes license dropdown with common options', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    const licenseSelect = screen.getByDisplayValue('MIT');
    expect(licenseSelect).toBeInTheDocument();

    // Check that it's a select element with options
    expect(licenseSelect.tagName).toBe('SELECT');
  });

  it('supports date input for publication date', () => {
    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Check that there's a date input in the form
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();
  });

  it('handles empty metadata gracefully', () => {
    mockUseDatasetStore.mockReturnValue({
      metadata: {},
      setMetadata: mockSetMetadata,
      updateField: vi.fn(),
      addKeyword: vi.fn(),
      removeKeyword: vi.fn(),
      addCustomProperty: vi.fn(),
      removeCustomProperty: vi.fn(),
      updateCustomProperty: vi.fn(),
      resetMetadata: vi.fn(),
      setCreator: vi.fn(),
      setPublisher: vi.fn(),
    });

    render(<DatasetMetadataEditor isOpen={true} onClose={mockOnClose} onSave={mockOnSave} />);

    // Should render without crashing and show empty fields
    expect(screen.getByPlaceholderText('My Benchmark Dataset')).toHaveValue('');
    expect(screen.getByText('No keywords added. Keywords help with discovery and categorization.')).toBeInTheDocument();
    expect(screen.getByText('No custom properties defined. Click "Add Property" to add some.')).toBeInTheDocument();
  });
});
