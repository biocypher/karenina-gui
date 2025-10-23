import { useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import type { PydanticFieldDefinition, PydanticFieldType } from '../../types';
import { quickValidateField, validatePythonIdentifier, validateFieldType } from '../../utils/pydanticValidator';

interface FieldEditorProps {
  field: PydanticFieldDefinition;
  fieldNumber?: number;
  onChange: (updatedField: PydanticFieldDefinition) => void;
  onRemove?: () => void;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

export interface FieldEditorRef {
  saveChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

export const FieldEditor = forwardRef<FieldEditorRef, FieldEditorProps>(
  ({ field, fieldNumber, onChange, onRemove, onUnsavedChangesChange }, ref) => {
    // Local state for field editing
    const [localField, setLocalField] = useState<PydanticFieldDefinition>(field);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Real-time validation based on local field state
    const quickValidation = quickValidateField(localField);
    const nameValidation = validatePythonIdentifier(localField.name);
    const typeValidation = validateFieldType(localField);

    // Update local state when field prop changes (external updates)
    useEffect(() => {
      setLocalField(field);
      setHasUnsavedChanges(false);
    }, [field]);

    // Handle local field changes (UI updates only)
    const handleLocalFieldChange = (updates: Partial<PydanticFieldDefinition>) => {
      const updatedField = { ...localField, ...updates };
      setLocalField(updatedField);
      setHasUnsavedChanges(true);
    };

    // Save changes to parent component
    const handleSaveChanges = useCallback(() => {
      // Filter out empty literal values before saving
      const fieldToSave = { ...localField };
      if (fieldToSave.literalValues) {
        fieldToSave.literalValues = fieldToSave.literalValues.filter((v) => v.trim());
      }
      onChange(fieldToSave);
      setHasUnsavedChanges(false);
    }, [localField, onChange]);

    // Notify parent when unsaved changes state changes
    useEffect(() => {
      onUnsavedChangesChange?.(hasUnsavedChanges);
    }, [hasUnsavedChanges]); // Removed onUnsavedChangesChange from deps to prevent infinite loops from inline functions

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        saveChanges: handleSaveChanges,
        hasUnsavedChanges: () => hasUnsavedChanges,
      }),
      [hasUnsavedChanges, handleSaveChanges]
    );

    const handleTypeChange = (newType: PydanticFieldType) => {
      const updates: Partial<PydanticFieldDefinition> = {
        type: newType,
        // Reset type-specific properties when type changes
        literalValues: undefined,
        listItemType: undefined,
      };

      // Set defaults for specific types
      if (newType === 'literal') {
        updates.literalValues = ['value1', 'value2'];
      } else if (newType === 'list') {
        updates.listItemType = 'str';
      }

      // Update pythonType based on the new type
      updates.pythonType = generatePythonTypeFromField({ ...localField, ...updates });

      handleLocalFieldChange(updates);
    };

    const handleLiteralValuesChange = (values: string[]) => {
      // Keep all values during editing (including empty ones)
      // Filter will happen when saving to parent component
      handleLocalFieldChange({
        literalValues: values,
        pythonType: generatePythonTypeFromField({
          ...localField,
          literalValues: values.filter((v) => v.trim()), // Generate type based on non-empty values
        }),
      });
    };

    const addLiteralValue = () => {
      const currentValues = localField.literalValues || [];
      handleLiteralValuesChange([...currentValues, '']);
    };

    const removeLiteralValue = (index: number) => {
      const currentValues = localField.literalValues || [];
      const newValues = currentValues.filter((_, i) => i !== index);
      handleLiteralValuesChange(newValues);
    };

    const updateLiteralValue = (index: number, value: string) => {
      const currentValues = localField.literalValues || [];
      const newValues = [...currentValues];
      newValues[index] = value;
      handleLiteralValuesChange(newValues);
    };

    const handleCorrectValueChange = (value: string | number | boolean | string[] | null) => {
      handleLocalFieldChange({ correctValue: value });
    };

    const renderCorrectValueInput = () => {
      switch (localField.type) {
        case 'str':
          return (
            <input
              type="text"
              value={typeof localField.correctValue === 'string' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(e.target.value)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
              placeholder="Enter the correct string value..."
            />
          );

        case 'int':
          return (
            <input
              type="number"
              value={typeof localField.correctValue === 'number' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(parseInt(e.target.value) || 0)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
              placeholder="Enter the correct integer value..."
            />
          );

        case 'float':
          return (
            <input
              type="number"
              step="any"
              value={typeof localField.correctValue === 'number' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(parseFloat(e.target.value) || 0.0)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
              placeholder="Enter the correct float value..."
            />
          );

        case 'bool':
          return (
            <select
              value={localField.correctValue?.toString() || 'true'}
              onChange={(e) => handleCorrectValueChange(e.target.value === 'true')}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          );

        case 'literal':
          return (
            <select
              value={typeof localField.correctValue === 'string' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(e.target.value)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            >
              <option value="">Select the correct option...</option>
              {(localField.literalValues || []).map((value, index) => (
                <option key={index} value={value}>
                  {value}
                </option>
              ))}
            </select>
          );

        case 'list':
          return (
            <div className="space-y-3">
              <textarea
                value={Array.isArray(localField.correctValue) ? localField.correctValue.join('\n') : ''}
                onChange={(e) => {
                  const lines = e.target.value.split('\n');
                  handleCorrectValueChange(lines);
                }}
                rows={4}
                className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
                placeholder="Enter each correct list item on a new line..."
              />
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Enter one item per line. These will be converted to the appropriate type.
              </p>
            </div>
          );

        case 'date':
          return (
            <input
              type="date"
              value={typeof localField.correctValue === 'string' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(e.target.value)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            />
          );

        default:
          return (
            <input
              type="text"
              value={typeof localField.correctValue === 'string' ? localField.correctValue : ''}
              onChange={(e) => handleCorrectValueChange(e.target.value)}
              className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
              placeholder="Enter the correct value..."
            />
          );
      }
    };

    return (
      <div className="relative border border-slate-200/60 dark:border-slate-700/60 rounded-2xl p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-md hover:shadow-lg transition-all duration-200">
        {/* Field Number Badge */}
        {fieldNumber && (
          <div className="absolute -top-3 -left-3 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
            {fieldNumber}
          </div>
        )}

        {/* Enhanced Field Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Field {fieldNumber ? `${fieldNumber}: ` : ''}
              {localField.name || 'Unnamed'}
            </h4>
            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-md text-xs font-medium capitalize">
              {localField.type}
            </span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">• Unsaved changes</span>
          )}
        </div>

        <div className="space-y-6">
          {/* Basic Field Information */}
          <div className="space-y-6">
            {/* Field Name and Type - Row Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Field Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Field Name
                  {quickValidation.hasErrors && (
                    <span className="ml-2 text-red-500 text-xs font-medium">
                      ⚠ {quickValidation.errorCount} error{quickValidation.errorCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {!quickValidation.hasErrors && quickValidation.hasWarnings && (
                    <span className="ml-2 text-yellow-500 text-xs font-medium">
                      ⚠ {quickValidation.warningCount} warning{quickValidation.warningCount > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  value={localField.name}
                  onChange={(e) => handleLocalFieldChange({ name: e.target.value })}
                  className={`block w-full rounded-xl shadow-sm text-sm transition-colors px-4 py-3 ${
                    quickValidation.hasErrors
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-900/20'
                      : quickValidation.hasWarnings
                        ? 'border-yellow-300 dark:border-yellow-600 focus:border-yellow-500 focus:ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                        : 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500 bg-white dark:bg-slate-700'
                  } text-slate-900 dark:text-slate-100`}
                  placeholder="field_name"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Field Type
                </label>
                <select
                  value={localField.type}
                  onChange={(e) => handleTypeChange(e.target.value as PydanticFieldType)}
                  className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                >
                  <option value="str">String</option>
                  <option value="int">Integer</option>
                  <option value="float">Float</option>
                  <option value="bool">Boolean</option>
                  <option value="date">Date</option>
                  <option value="literal">Multiple Choice</option>
                  <option value="list">List</option>
                  <option value="regex">Regex Validation</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description Field - Full Width (Hidden for regex fields) */}
          {localField.type !== 'regex' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Field Description
              </label>
              <textarea
                value={localField.description || ''}
                onChange={(e) => handleLocalFieldChange({ description: e.target.value })}
                rows={3}
                className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                placeholder="Describe what this field represents..."
              />
            </div>
          )}

          {/* Type-Specific Configuration */}
          {localField.type === 'literal' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                Multiple Choice Options
              </label>
              <div className="space-y-4">
                {(localField.literalValues || []).map((value, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => updateLiteralValue(index, e.target.value)}
                        className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                        placeholder="Enter choice option..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLiteralValue(index)}
                      className="p-3 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-700"
                      title="Remove this option"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLiteralValue}
                  className="inline-flex items-center px-4 py-3 text-sm font-medium rounded-xl text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors border border-indigo-200 dark:border-indigo-700"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Choice Option
                </button>
              </div>
            </div>
          )}

          {localField.type === 'regex' && (
            <div className="space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-semibold mb-1">Regex Validation</p>
                    <p>
                      This validates patterns against the full LLM response text during verification. It does not create
                      a Pydantic field - only the pattern matching logic is added to the template.
                    </p>
                  </div>
                </div>
              </div>

              {/* Regex Pattern */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Regex Pattern
                </label>
                <input
                  type="text"
                  value={localField.regexPattern || ''}
                  onChange={(e) => handleLocalFieldChange({ regexPattern: e.target.value })}
                  className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3 font-mono"
                  placeholder="Enter regex pattern (e.g., \\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b)"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Regular expression to match against the full LLM response text
                </p>
              </div>

              {/* Match Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Match Type
                </label>
                <select
                  value={localField.regexMatchType || 'exact'}
                  onChange={(e) =>
                    handleLocalFieldChange({ regexMatchType: e.target.value as 'exact' | 'contains' | 'count' | 'all' })
                  }
                  className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                >
                  <option value="exact">Exact - Find one specific match</option>
                  <option value="contains">Contains - Pattern found somewhere</option>
                  <option value="count">Count - Specific number of matches</option>
                  <option value="all">All - All expected items must be present</option>
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  How to evaluate the regex matches against expected results
                </p>
              </div>

              {/* Expected Value (dynamic based on match type) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Expected Result
                </label>
                {(localField.regexMatchType === 'exact' ||
                  localField.regexMatchType === 'contains' ||
                  !localField.regexMatchType) && (
                  <input
                    type="text"
                    value={typeof localField.regexExpected === 'string' ? localField.regexExpected : ''}
                    onChange={(e) => handleLocalFieldChange({ regexExpected: e.target.value })}
                    className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                    placeholder="Expected match text"
                  />
                )}
                {localField.regexMatchType === 'count' && (
                  <input
                    type="number"
                    min="0"
                    value={typeof localField.regexExpected === 'number' ? localField.regexExpected : 0}
                    onChange={(e) => handleLocalFieldChange({ regexExpected: parseInt(e.target.value) || 0 })}
                    className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                    placeholder="Expected number of matches"
                  />
                )}
                {localField.regexMatchType === 'all' && (
                  <div className="space-y-3">
                    <textarea
                      value={Array.isArray(localField.regexExpected) ? localField.regexExpected.join('\n') : ''}
                      onChange={(e) => {
                        const lines = e.target.value.split('\n').filter((line) => line.trim());
                        handleLocalFieldChange({ regexExpected: lines });
                      }}
                      rows={4}
                      className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
                      placeholder="Enter each expected match on a new line"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      All of these items must be found in the regex matches
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {localField.type === 'list' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                List Item Type
              </label>
              <select
                value={localField.listItemType || 'str'}
                onChange={(e) =>
                  handleLocalFieldChange({
                    listItemType: e.target.value,
                    pythonType: generatePythonTypeFromField({
                      ...localField,
                      listItemType: e.target.value,
                    }),
                  })
                }
                className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
              >
                <option value="str">String</option>
                <option value="int">Integer</option>
                <option value="float">Float</option>
                <option value="bool">Boolean</option>
              </select>
            </div>
          )}

          {/* Correct Value Section (Hidden for regex fields) */}
          {localField.type !== 'regex' && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
              <label className="block text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
                Correct Answer Value
                <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                  (This value will be used in model_post_init for verification)
                </span>
              </label>
              {renderCorrectValueInput()}
            </div>
          )}

          {/* Python Type Display (Hidden for regex fields) */}
          {localField.type !== 'regex' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Generated Python Type
              </label>
              <code className="block w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200">
                {localField.pythonType}
              </code>
            </div>
          )}

          {/* Validation Messages */}
          {(nameValidation.errors.length > 0 ||
            nameValidation.warnings.length > 0 ||
            typeValidation.errors.length > 0 ||
            typeValidation.warnings.length > 0) && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                Validation Issues
              </label>
              <div className="space-y-4">
                {/* Name validation errors */}
                {nameValidation.errors.map((error, index) => (
                  <div
                    key={`name-error-${index}`}
                    className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm"
                  >
                    <span className="text-red-500 font-medium text-lg">✗</span>
                    <div>
                      <p className="text-red-700 dark:text-red-300 font-medium">{error.message}</p>
                      {error.suggestion && (
                        <p className="text-red-600 dark:text-red-400 text-xs mt-2">💡 {error.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Type validation errors */}
                {typeValidation.errors.map((error, index) => (
                  <div
                    key={`type-error-${index}`}
                    className="flex items-start space-x-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm"
                  >
                    <span className="text-red-500 font-medium text-lg">✗</span>
                    <div>
                      <p className="text-red-700 dark:text-red-300 font-medium">{error.message}</p>
                      {error.suggestion && (
                        <p className="text-red-600 dark:text-red-400 text-xs mt-2">💡 {error.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Name validation warnings */}
                {nameValidation.warnings.map((warning, index) => (
                  <div
                    key={`name-warning-${index}`}
                    className="flex items-start space-x-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl text-sm"
                  >
                    <span className="text-yellow-500 font-medium text-lg">⚠</span>
                    <div>
                      <p className="text-yellow-700 dark:text-yellow-300 font-medium">{warning.message}</p>
                      {warning.suggestion && (
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2">💡 {warning.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Type validation warnings */}
                {typeValidation.warnings.map((warning, index) => (
                  <div
                    key={`type-warning-${index}`}
                    className="flex items-start space-x-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl text-sm"
                  >
                    <span className="text-yellow-500 font-medium text-lg">⚠</span>
                    <div>
                      <p className="text-yellow-700 dark:text-yellow-300 font-medium">{warning.message}</p>
                      {warning.suggestion && (
                        <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-2">💡 {warning.suggestion}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {onRemove && (
            <div className="flex items-center justify-end pt-6 border-t border-slate-200 dark:border-slate-600">
              <button
                type="button"
                onClick={onRemove}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-red-200 dark:border-red-700"
                title="Remove field"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Remove Field
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

/**
 * Generate Python type annotation from field properties
 */
function generatePythonTypeFromField(field: PydanticFieldDefinition): string {
  let baseType = '';

  switch (field.type) {
    case 'str':
      baseType = 'str';
      break;
    case 'int':
      baseType = 'int';
      break;
    case 'float':
      baseType = 'float';
      break;
    case 'bool':
      baseType = 'bool';
      break;
    case 'date':
      baseType = 'date';
      break;
    case 'literal':
      if (field.literalValues && field.literalValues.length > 0) {
        const values = field.literalValues.map((v) => `"${v}"`).join(', ');
        baseType = `Literal[${values}]`;
      } else {
        baseType = 'Literal[""]';
      }
      break;
    case 'list':
      baseType = `List[${field.listItemType || 'str'}]`;
      break;
    case 'regex':
      baseType = 'regex'; // Not used for actual Python type, just for display
      break;
    default:
      baseType = 'str';
  }

  // Wrap with Optional if not required
  if (!field.required && !baseType.startsWith('Optional[')) {
    return `Optional[${baseType}]`;
  }

  return baseType;
}
