import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldEditor } from '../FieldEditor';
import type { PydanticFieldDefinition } from '../../../types';

describe('FieldEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnRemove = vi.fn();

  const defaultField: PydanticFieldDefinition = {
    name: 'test_field',
    type: 'str',
    pythonType: 'str',
    description: 'A test field',
    required: true,
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnRemove.mockClear();
  });

  it('renders field editor with basic information', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    expect(screen.getByDisplayValue('test_field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('String')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onChange when field name is updated', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    const nameInput = screen.getByDisplayValue('test_field');
    fireEvent.change(nameInput, { target: { value: 'new_field_name' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultField,
      name: 'new_field_name',
    });
  });

  it('calls onChange when field type is changed', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    const typeSelect = screen.getByDisplayValue('String');
    fireEvent.change(typeSelect, { target: { value: 'int' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_field',
        type: 'int',
        pythonType: 'int',
        required: true,
      })
    );
  });

  it('calls onChange when required checkbox is toggled', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'test_field',
        required: false,
        pythonType: 'Optional[str]',
      })
    );
  });

  it('shows remove button when onRemove prop is provided', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} onRemove={mockOnRemove} />);

    const removeButton = screen.getByTitle('Remove field');
    expect(removeButton).toBeInTheDocument();

    fireEvent.click(removeButton);
    expect(mockOnRemove).toHaveBeenCalled();
  });

  it('does not show remove button when onRemove is not provided', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    expect(screen.queryByTitle('Remove field')).not.toBeInTheDocument();
  });

  it('expands to show description field when expand button is clicked', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Initially collapsed
    expect(screen.queryByDisplayValue('A test field')).not.toBeInTheDocument();

    // Click expand button
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Now description should be visible
    expect(screen.getByDisplayValue('A test field')).toBeInTheDocument();
  });

  it('updates description when changed in expanded view', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Expand first
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Update description
    const descriptionTextarea = screen.getByDisplayValue('A test field');
    fireEvent.change(descriptionTextarea, { target: { value: 'Updated description' } });

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultField,
      description: 'Updated description',
    });
  });

  it('shows literal values editor for literal type fields', () => {
    const literalField: PydanticFieldDefinition = {
      name: 'status',
      type: 'literal',
      pythonType: 'Literal["active", "inactive"]',
      required: true,
      literalValues: ['active', 'inactive'],
    };

    render(<FieldEditor field={literalField} onChange={mockOnChange} />);

    // Expand to see literal values
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Check that literal values are shown
    expect(screen.getByDisplayValue('active')).toBeInTheDocument();
    expect(screen.getByDisplayValue('inactive')).toBeInTheDocument();
    expect(screen.getByText('Add Value')).toBeInTheDocument();
  });

  it('adds new literal value when Add Value button is clicked', () => {
    const literalField: PydanticFieldDefinition = {
      name: 'status',
      type: 'literal',
      pythonType: 'Literal["active"]',
      required: true,
      literalValues: ['active'],
    };

    render(<FieldEditor field={literalField} onChange={mockOnChange} />);

    // Expand and click Add Value
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    const addButton = screen.getByText('Add Value');
    fireEvent.click(addButton);

    // The component filters out empty values, so the result should just be the original value
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        literalValues: ['active'],
        pythonType: 'Literal["active"]',
      })
    );
  });

  it('shows list item type selector for list fields', () => {
    const listField: PydanticFieldDefinition = {
      name: 'tags',
      type: 'list',
      pythonType: 'List[str]',
      required: true,
      listItemType: 'str',
    };

    render(<FieldEditor field={listField} onChange={mockOnChange} />);

    // Expand to see list options
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Check that item type selector is shown
    expect(screen.getByText('Item Type')).toBeInTheDocument();
    expect(screen.getByDisplayValue('String')).toBeInTheDocument();
  });

  it('updates python type when list item type is changed', () => {
    const listField: PydanticFieldDefinition = {
      name: 'numbers',
      type: 'list',
      pythonType: 'List[str]',
      required: true,
      listItemType: 'str',
    };

    render(<FieldEditor field={listField} onChange={mockOnChange} />);

    // Expand and change item type
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Find the item type selector by looking for the one under "Item Type" label
    const itemTypeLabel = screen.getByText('Item Type');
    const itemTypeContainer = itemTypeLabel.closest('div');
    const itemTypeSelector = itemTypeContainer?.querySelector('select');

    expect(itemTypeSelector).toBeTruthy();
    fireEvent.change(itemTypeSelector!, { target: { value: 'int' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        listItemType: 'int',
        pythonType: 'List[int]',
      })
    );
  });

  it('displays correct python type in expanded view', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Expand to see python type
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    // Check that python type is displayed
    expect(screen.getByText('Python Type')).toBeInTheDocument();
    expect(screen.getByText('str')).toBeInTheDocument();
  });

  it('generates correct python type for optional fields', () => {
    const optionalField: PydanticFieldDefinition = {
      name: 'optional_field',
      type: 'str',
      pythonType: 'Optional[str]',
      required: false,
    };

    render(<FieldEditor field={optionalField} onChange={mockOnChange} />);

    // Expand to see python type
    const expandButton = screen.getByTitle('Expand');
    fireEvent.click(expandButton);

    expect(screen.getByText('Optional[str]')).toBeInTheDocument();
  });
});
