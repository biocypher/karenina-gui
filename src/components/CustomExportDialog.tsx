import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ExportableResult, Rubric } from '../utils/export';
import { EXPORT_FIELD_GROUPS } from '../types/exportFields';

interface CustomExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  results: ExportableResult[];
  globalRubric?: Rubric;
  onExport: (selectedFields: string[], format: 'json' | 'csv') => void;
}

// Field groups are now imported from types/exportFields.ts as single source of truth
// When adding new fields, update EXPORT_FIELD_GROUPS in exportFields.ts only

// Re-export type from exportFields for convenience
type FieldGroup = (typeof EXPORT_FIELD_GROUPS)[number];

export const CustomExportDialog: React.FC<CustomExportDialogProps> = ({
  isOpen,
  onClose,
  results,
  globalRubric: _globalRubric, // eslint-disable-line @typescript-eslint/no-unused-vars
  onExport,
}) => {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(EXPORT_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => field.key)))
  );
  const [format, setFormat] = useState<'json' | 'csv'>('csv');

  if (!isOpen) return null;

  const handleFieldToggle = (fieldKey: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(fieldKey)) {
      newSelected.delete(fieldKey);
    } else {
      newSelected.add(fieldKey);
    }
    setSelectedFields(newSelected);
  };

  const handleGroupToggle = (group: FieldGroup) => {
    const groupFields = group.fields.map((f) => f.key);
    const allSelected = groupFields.every((field) => selectedFields.has(field));

    const newSelected = new Set(selectedFields);
    if (allSelected) {
      groupFields.forEach((field) => newSelected.delete(field));
    } else {
      groupFields.forEach((field) => newSelected.add(field));
    }
    setSelectedFields(newSelected);
  };

  const handleSelectAll = () => {
    const allFields = EXPORT_FIELD_GROUPS.flatMap((group) => group.fields.map((field) => field.key));
    setSelectedFields(new Set(allFields));
  };

  const handleSelectNone = () => {
    setSelectedFields(new Set());
  };

  const handleExport = () => {
    const selectedFieldsArray = Array.from(selectedFields);
    onExport(selectedFieldsArray, format);
    onClose();
  };

  const selectedCount = selectedFields.size;
  const totalCount = EXPORT_FIELD_GROUPS.flatMap((group) => group.fields).length;
  const canExport = selectedCount > 0 && results.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-slate-800">Customize Export</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-4 mb-3">
              <span className="text-sm text-slate-600">
                {selectedCount} of {totalCount} fields selected • {results.length} results
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                >
                  Select None
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {EXPORT_FIELD_GROUPS.map((group, groupIndex) => {
              const groupFields = group.fields.map((f) => f.key);
              const selectedInGroup = groupFields.filter((field) => selectedFields.has(field)).length;
              const allGroupSelected = selectedInGroup === groupFields.length;
              const someGroupSelected = selectedInGroup > 0 && selectedInGroup < groupFields.length;

              return (
                <div key={groupIndex} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allGroupSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someGroupSelected;
                        }}
                        onChange={() => handleGroupToggle(group)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                      />
                      <span className="font-medium text-slate-800">{group.name}</span>
                    </label>
                    <span className="ml-2 text-xs text-slate-500">
                      ({selectedInGroup}/{groupFields.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-6">
                    {group.fields.map((field) => (
                      <label key={field.key} className="flex items-start cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(field.key)}
                          onChange={() => handleFieldToggle(field.key)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded mt-0.5 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors">
                            {field.label}
                          </div>
                          {field.description && (
                            <div className="text-xs text-slate-500 mt-0.5">{field.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">Export Format:</label>
              <div className="flex gap-3">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={format === 'csv'}
                    onChange={(e) => setFormat(e.target.value as 'csv')}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700">CSV</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="json"
                    checked={format === 'json'}
                    onChange={(e) => setFormat(e.target.value as 'json')}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span className="text-sm text-slate-700">JSON</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={!canExport}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export {selectedCount > 0 ? `${selectedCount} Fields` : 'Selection'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
