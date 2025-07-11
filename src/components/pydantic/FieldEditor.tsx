import { useState, useEffect } from 'react';
import type { PydanticFieldDefinition, PydanticFieldType } from '../../types';
import { quickValidateField, validatePythonIdentifier, validateFieldType } from '../../utils/pydanticValidator';
import { useDebouncedCallback } from '../../hooks/useDebouncedCallback';

interface FieldEditorProps {
  field: PydanticFieldDefinition;
  onChange: (updatedField: PydanticFieldDefinition) => void;
  onRemove?: () => void;
}

export function FieldEditor({ field, onChange, onRemove }: FieldEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localName, setLocalName] = useState(field.name);
  const [localDescription, setLocalDescription] = useState(field.description || '');

  // Real-time validation
  const quickValidation = quickValidateField(field);
  const nameValidation = validatePythonIdentifier(field.name);
  const typeValidation = validateFieldType(field);

  const handleFieldChange = (updates: Partial<PydanticFieldDefinition>) => {
    onChange({ ...field, ...updates });
  };

  // Debounced handlers for performance-sensitive changes
  const debouncedNameChange = useDebouncedCallback((name: string) => {
    handleFieldChange({ name });
  }, 500);

  const debouncedDescriptionChange = useDebouncedCallback((description: string) => {
    handleFieldChange({ description });
  }, 300);

  const handleNameChange = (name: string) => {
    setLocalName(name);
    debouncedNameChange(name);
  };

  const handleDescriptionChange = (description: string) => {
    setLocalDescription(description);
    debouncedDescriptionChange(description);
  };

  // Sync local state when field prop changes
  useEffect(() => {
    setLocalName(field.name);
  }, [field.name]);

  useEffect(() => {
    setLocalDescription(field.description || '');
  }, [field.description]);

  const handleTypeChange = (newType: PydanticFieldType) => {
    const updates: Partial<PydanticFieldDefinition> = {
      type: newType,
      // Reset type-specific properties when type changes
      literalValues: undefined,
      listItemType: undefined,
      unionTypes: undefined,
    };

    // Set defaults for specific types
    if (newType === 'literal') {
      updates.literalValues = ['value1', 'value2'];
    } else if (newType === 'list') {
      updates.listItemType = 'str';
    } else if (newType === 'set') {
      updates.listItemType = 'str';
    } else if (newType === 'union') {
      updates.unionTypes = ['str', 'int'];
    }

    // Update pythonType based on the new type
    updates.pythonType = generatePythonTypeFromField({ ...field, ...updates });

    handleFieldChange(updates);
  };

  const handleLiteralValuesChange = (values: string[]) => {
    const nonEmptyValues = values.filter((v) => v.trim());
    handleFieldChange({
      literalValues: nonEmptyValues,
      pythonType: generatePythonTypeFromField({
        ...field,
        literalValues: nonEmptyValues,
      }),
    });
  };

  const addLiteralValue = () => {
    const currentValues = field.literalValues || [];
    handleLiteralValuesChange([...currentValues, '']);
  };

  const removeLiteralValue = (index: number) => {
    const currentValues = field.literalValues || [];
    const newValues = currentValues.filter((_, i) => i !== index);
    handleLiteralValuesChange(newValues);
  };

  const updateLiteralValue = (index: number, value: string) => {
    const currentValues = field.literalValues || [];
    const newValues = [...currentValues];
    newValues[index] = value;
    handleLiteralValuesChange(newValues);
  };

  const handleCorrectValueChange = (value: string | number | boolean | string[] | null) => {
    handleFieldChange({ correctValue: value });
  };

  const renderCorrectValueInput = () => {
    switch (field.type) {
      case 'str':
        return (
          <input
            type="text"
            value={field.correctValue || ''}
            onChange={(e) => handleCorrectValueChange(e.target.value)}
            className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            placeholder="Enter the correct string value..."
          />
        );

      case 'int':
        return (
          <input
            type="number"
            value={field.correctValue || ''}
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
            value={field.correctValue || ''}
            onChange={(e) => handleCorrectValueChange(parseFloat(e.target.value) || 0.0)}
            className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            placeholder="Enter the correct float value..."
          />
        );

      case 'bool':
        return (
          <select
            value={field.correctValue?.toString() || 'true'}
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
            value={field.correctValue || ''}
            onChange={(e) => handleCorrectValueChange(e.target.value)}
            className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
          >
            <option value="">Select the correct option...</option>
            {(field.literalValues || []).map((value, index) => (
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
              value={Array.isArray(field.correctValue) ? field.correctValue.join('\n') : ''}
              onChange={(e) => {
                const lines = e.target.value.split('\n').filter((line) => line.trim());
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
            value={field.correctValue || ''}
            onChange={(e) => handleCorrectValueChange(e.target.value)}
            className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
          />
        );

      default:
        return (
          <input
            type="text"
            value={field.correctValue || ''}
            onChange={(e) => handleCorrectValueChange(e.target.value)}
            className="block w-full rounded-xl border-emerald-300 dark:border-emerald-600 bg-white dark:bg-emerald-950 text-slate-900 dark:text-slate-100 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 text-sm px-4 py-3"
            placeholder="Enter the correct value..."
          />
        );
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-8 bg-white dark:bg-slate-800 shadow-lg">
      <div className="space-y-8">
        {/* Main Field Configuration */}
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
                value={localName}
                onChange={(e) => handleNameChange(e.target.value)}
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
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Field Type</label>
              <select
                value={field.type}
                onChange={(e) => handleTypeChange(e.target.value as PydanticFieldType)}
                className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
              >
                <option value="str">String</option>
                <option value="int">Integer</option>
                <option value="float">Float</option>
                <option value="bool">Boolean</option>
                <option value="date">Date</option>
                <option value="literal">Multiple Choice (Exclusive)</option>
                <option value="list">List</option>
                <option value="set">Set of Values</option>
                <option value="union">Union Type</option>
                <option value="optional">Optional</option>
              </select>
            </div>
          </div>

          {/* Required Toggle - Standalone */}
          <div className="flex items-center">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) =>
                  handleFieldChange({
                    required: e.target.checked,
                    pythonType: generatePythonTypeFromField({
                      ...field,
                      required: e.target.checked,
                    }),
                  })
                }
                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="ml-3 text-sm font-medium text-slate-700 dark:text-slate-300">Required Field</span>
            </label>
          </div>
        </div>

        {/* Description Field - Full Width */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Field Description
          </label>
          <textarea
            value={localDescription}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={3}
            className="block w-full rounded-xl border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm px-4 py-3"
            placeholder="Describe what this field represents..."
          />
        </div>

        {/* Correct Value Section */}
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-700">
          <label className="block text-sm font-semibold text-emerald-800 dark:text-emerald-300 mb-3">
            Correct Answer Value
            <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
              (This value will be used in model_post_init for verification)
            </span>
          </label>
          {renderCorrectValueInput()}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-600">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
            title={isExpanded ? 'Hide Advanced Options' : 'Show Advanced Options'}
          >
            <svg
              className={`w-4 h-4 mr-2 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isExpanded ? 'Hide Advanced Options' : 'Show Advanced Options'}
          </button>

          {onRemove && (
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
          )}
        </div>

        {/* Advanced Options - Expandable Section */}
        {isExpanded && (
          <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-600 space-y-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl p-6 -mx-2">
            {/* Type-specific Fields */}
            {field.type === 'literal' && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">
                  Multiple Choice Options
                </label>
                <div className="space-y-4">
                  {(field.literalValues || []).map((value, index) => (
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
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Add Choice Option
                  </button>
                </div>
              </div>
            )}

            {(field.type === 'list' || field.type === 'set') && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  {field.type === 'list' ? 'List Item Type' : 'Set Item Type'}
                </label>
                <select
                  value={field.listItemType || 'str'}
                  onChange={(e) =>
                    handleFieldChange({
                      listItemType: e.target.value,
                      pythonType: generatePythonTypeFromField({
                        ...field,
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

            {/* Python Type Display */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                Generated Python Type
              </label>
              <code className="block w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono text-slate-800 dark:text-slate-200">
                {field.pythonType}
              </code>
            </div>

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
          </div>
        )}
      </div>
    </div>
  );
}

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
    case 'set':
      baseType = `Set[${field.listItemType || 'str'}]`;
      break;
    case 'union':
      if (field.unionTypes && field.unionTypes.length > 0) {
        baseType = `Union[${field.unionTypes.join(', ')}]`;
      } else {
        baseType = 'Union[str, int]';
      }
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
