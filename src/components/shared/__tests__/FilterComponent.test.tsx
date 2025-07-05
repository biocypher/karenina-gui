import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FilterComponent } from '../FilterComponent';

describe('FilterComponent', () => {
  const createMockColumn = (filterValue: unknown = '') => ({
    id: 'testColumn',
    getFilterValue: vi.fn(() => filterValue),
    setFilterValue: vi.fn(),
  });

  const createMockTable = (firstValue: unknown = 'string value') => ({
    getPreFilteredRowModel: vi.fn(() => ({
      flatRows: [
        {
          getValue: vi.fn(() => firstValue),
        },
      ],
    })),
  });

  it('renders text input for string columns', () => {
    const mockColumn = createMockColumn('test filter');
    const mockTable = createMockTable('string value');

    render(<FilterComponent column={mockColumn as never} table={mockTable as never} />);

    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('test filter');
  });

  it('renders number inputs for numeric columns', () => {
    const mockColumn = createMockColumn([10, 20]);
    const mockTable = createMockTable(42);

    render(<FilterComponent column={mockColumn as never} table={mockTable as never} />);

    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');

    expect(minInput).toBeInTheDocument();
    expect(maxInput).toBeInTheDocument();
    expect(minInput).toHaveValue(10);
    expect(maxInput).toHaveValue(20);
  });

  it('handles text filter changes', () => {
    const mockColumn = createMockColumn('');
    const mockTable = createMockTable('string');

    render(<FilterComponent column={mockColumn as never} table={mockTable as never} />);

    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'new filter' } });

    expect(mockColumn.setFilterValue).toHaveBeenCalledWith('new filter');
  });

  it('handles numeric filter changes', () => {
    const mockColumn = createMockColumn([null, null]);
    const mockTable = createMockTable(100);

    render(<FilterComponent column={mockColumn as never} table={mockTable as never} />);

    const minInput = screen.getByPlaceholderText('Min');
    const maxInput = screen.getByPlaceholderText('Max');

    fireEvent.change(minInput, { target: { value: '5' } });
    expect(mockColumn.setFilterValue).toHaveBeenCalled();
    // Verify the function was called with a function
    const minCall = mockColumn.setFilterValue.mock.calls[0][0];
    expect(typeof minCall).toBe('function');
    // Test the function behavior
    expect(minCall([10, 20])).toEqual(['5', 20]);

    fireEvent.change(maxInput, { target: { value: '50' } });
    expect(mockColumn.setFilterValue).toHaveBeenCalledTimes(2);
    const maxCall = mockColumn.setFilterValue.mock.calls[1][0];
    expect(typeof maxCall).toBe('function');
    expect(maxCall([10, 20])).toEqual([10, '50']);
  });

  it('handles empty table data gracefully', () => {
    const mockColumn = createMockColumn('');
    const mockTable = {
      getPreFilteredRowModel: vi.fn(() => ({
        flatRows: [],
      })),
    };

    render(<FilterComponent column={mockColumn as never} table={mockTable as never} />);

    // Should default to text input when no data to determine type
    const input = screen.getByPlaceholderText('Search...');
    expect(input).toBeInTheDocument();
  });
});
