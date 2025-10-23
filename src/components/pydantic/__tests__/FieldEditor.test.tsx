import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { FieldEditor, FieldEditorRef } from '../FieldEditor';
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
  });

  it('does not call onChange immediately when field name is updated', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    const nameInput = screen.getByDisplayValue('test_field');
    fireEvent.change(nameInput, { target: { value: 'new_field_name' } });

    // Should not be called immediately - only when saveChanges is called via ref
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('calls onChange when saveChanges is called via ref after field changes', () => {
    const ref = createRef<FieldEditorRef>();
    render(<FieldEditor ref={ref} field={defaultField} onChange={mockOnChange} />);

    // Change field name
    const nameInput = screen.getByDisplayValue('test_field');
    fireEvent.change(nameInput, { target: { value: 'new_field_name' } });

    // Change field type
    const typeSelect = screen.getByDisplayValue('String');
    fireEvent.change(typeSelect, { target: { value: 'int' } });

    // Should not be called yet
    expect(mockOnChange).not.toHaveBeenCalled();

    // Call saveChanges via ref
    ref.current?.saveChanges();

    // Now it should be called with all changes
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'new_field_name',
        type: 'int',
        pythonType: 'int',
        required: true,
      })
    );
  });

  it('tracks unsaved changes via ref', () => {
    const ref = createRef<FieldEditorRef>();
    render(<FieldEditor ref={ref} field={defaultField} onChange={mockOnChange} />);

    // Should have no unsaved changes initially
    expect(ref.current?.hasUnsavedChanges()).toBe(false);

    // Change field name
    const nameInput = screen.getByDisplayValue('test_field');
    fireEvent.change(nameInput, { target: { value: 'new_field_name' } });

    // Should now have unsaved changes
    expect(ref.current?.hasUnsavedChanges()).toBe(true);
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

  it('description field is always visible', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Description should always be visible now
    expect(screen.getByDisplayValue('A test field')).toBeInTheDocument();
  });

  it('updates description when saveChanges is called via ref', () => {
    const ref = createRef<FieldEditorRef>();
    render(<FieldEditor ref={ref} field={defaultField} onChange={mockOnChange} />);

    // Update description
    const descriptionTextarea = screen.getByDisplayValue('A test field');
    fireEvent.change(descriptionTextarea, { target: { value: 'Updated description' } });

    // Should not be called immediately
    expect(mockOnChange).not.toHaveBeenCalled();

    // Call saveChanges via ref
    ref.current?.saveChanges();

    expect(mockOnChange).toHaveBeenCalledWith({
      ...defaultField,
      description: 'Updated description',
    });
  });

  it('shows literal values editor for literal type fields (always visible)', () => {
    const literalField: PydanticFieldDefinition = {
      name: 'status',
      type: 'literal',
      pythonType: 'Literal["active", "inactive"]',
      required: true,
      literalValues: ['active', 'inactive'],
    };

    render(<FieldEditor field={literalField} onChange={mockOnChange} />);

    // Literal values should be visible immediately (no expand needed)
    expect(screen.getByDisplayValue('active')).toBeInTheDocument();
    expect(screen.getByDisplayValue('inactive')).toBeInTheDocument();
    expect(screen.getByText('Add Choice Option')).toBeInTheDocument();
  });

  it('adds new literal value when Add Choice Option button is clicked', () => {
    const literalField: PydanticFieldDefinition = {
      name: 'status',
      type: 'literal',
      pythonType: 'Literal["active"]',
      required: true,
      literalValues: ['active'],
    };

    const ref = createRef<FieldEditorRef>();
    render(<FieldEditor ref={ref} field={literalField} onChange={mockOnChange} />);

    // Click Add Choice Option (no need to expand - always visible)
    const addButton = screen.getByText('Add Choice Option');
    fireEvent.click(addButton);

    // Call saveChanges via ref
    ref.current?.saveChanges();

    // The component adds an empty string and then filters it, so result should be original value
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

    // List options are always visible now
    expect(screen.getByText('List Item Type')).toBeInTheDocument();
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

    const ref = createRef<FieldEditorRef>();
    render(<FieldEditor ref={ref} field={listField} onChange={mockOnChange} />);

    // Find the item type selector by looking for the one under "List Item Type" label
    const itemTypeLabel = screen.getByText('List Item Type');
    const itemTypeContainer = itemTypeLabel.closest('div');
    const itemTypeSelector = itemTypeContainer?.querySelector('select');

    expect(itemTypeSelector).toBeTruthy();
    fireEvent.change(itemTypeSelector!, { target: { value: 'int' } });

    // Call saveChanges via ref
    ref.current?.saveChanges();

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        listItemType: 'int',
        pythonType: 'List[int]',
      })
    );
  });

  it('displays correct python type in field editor', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Python type should be visible (no expand needed)
    expect(screen.getByText('Generated Python Type')).toBeInTheDocument();
    // Look for all str texts and verify at least one exists (there should be multiple now with the type badge)
    const strElements = screen.getAllByText('str');
    expect(strElements.length).toBeGreaterThan(0);
  });

  it('always generates required field types (no Optional)', () => {
    render(<FieldEditor field={defaultField} onChange={mockOnChange} />);

    // Python type should always be required (no Optional wrapper)
    expect(screen.getByText('Generated Python Type')).toBeInTheDocument();
    const strElements = screen.getAllByText('str');
    expect(strElements.length).toBeGreaterThan(0);
    expect(screen.queryByText('Optional[str]')).not.toBeInTheDocument();
  });
});
