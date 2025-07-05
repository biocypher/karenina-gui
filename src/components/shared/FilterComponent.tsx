import React from 'react';
import { Column, Table } from '@tanstack/react-table';

interface FilterComponentProps<T = unknown> {
  column: Column<T, unknown>;
  table: Table<T>;
}

export function FilterComponent({ column, table }: FilterComponentProps) {
  const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id);
  const columnFilterValue = column.getFilterValue();

  if (typeof firstValue === 'number') {
    return (
      <div className="flex space-x-2">
        <input
          type="number"
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={e => {
            const value = e.target.value;
            column.setFilterValue((old: [number, number]) => [value, old?.[1]]);
          }}
          placeholder={`Min`}
          className="w-16 border-gray-300 rounded shadow-sm text-xs"
        />
        <input
          type="number"
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={e => {
            const value = e.target.value;
            column.setFilterValue((old: [number, number]) => [old?.[0], value]);
          }}
          placeholder={`Max`}
          className="w-16 border-gray-300 rounded shadow-sm text-xs"
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      value={(columnFilterValue ?? '') as string}
      onChange={e => column.setFilterValue(e.target.value)}
      placeholder={`Search...`}
      className="w-full border-gray-300 rounded shadow-sm text-xs p-1"
    />
  );
}