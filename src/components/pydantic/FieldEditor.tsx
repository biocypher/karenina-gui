import { useState } from 'react';
import type { PydanticFieldDefinition, PydanticFieldType } from '../../types';
import { quickValidateField, validatePythonIdentifier, validateFieldType } from '../../utils/pydanticValidator';

interface FieldEditorProps {
  field: PydanticFieldDefinition;
  onChange: (updatedField: PydanticFieldDefinition) => void;
  onRemove?: () => void;
}

export function FieldEditor({ field, onChange, onRemove }: FieldEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Real-time validation
  const quickValidation = quickValidateField(field);
  const nameValidation = validatePythonIdentifier(field.name);
  const typeValidation = validateFieldType(field);

  const handleFieldChange = (updates: Partial<PydanticFieldDefinition>) => {
    onChange({ ...field, ...updates });
  };

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

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Field Name */}
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name
              {quickValidation.hasErrors && (
                <span className="ml-1 text-red-500 text-xs">
                  ⚠ {quickValidation.errorCount} error{quickValidation.errorCount > 1 ? 's' : ''}
                </span>
              )}
              {!quickValidation.hasErrors && quickValidation.hasWarnings && (
                <span className="ml-1 text-yellow-500 text-xs">
                  ⚠ {quickValidation.warningCount} warning{quickValidation.warningCount > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <input
              type="text"
              value={field.name}
              onChange={(e) => handleFieldChange({ name: e.target.value })}
              className={`block w-full rounded-md shadow-sm sm:text-sm ${
                quickValidation.hasErrors
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : quickValidation.hasWarnings
                    ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
              placeholder="field_name"
            />
          </div>

          {/* Field Type */}
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={field.type}
              onChange={(e) => handleTypeChange(e.target.value as PydanticFieldType)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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

          {/* Required Checkbox */}
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
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">Required</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* Expand/Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg
              className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Remove Button */}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-2 text-red-400 hover:text-red-600"
              title="Remove field"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={field.description || ''}
              onChange={(e) => handleFieldChange({ description: e.target.value })}
              rows={2}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Describe what this field represents..."
            />
          </div>

          {/* Type-specific Fields */}
          {field.type === 'literal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Possible Values</label>
              <div className="space-y-2">
                {(field.literalValues || []).map((value, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateLiteralValue(index, e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Enter value..."
                    />
                    <button
                      type="button"
                      onClick={() => removeLiteralValue(index)}
                      className="p-2 text-red-400 hover:text-red-600"
                      title="Remove value"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLiteralValue}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Value
                </button>
              </div>
            </div>
          )}

          {(field.type === 'list' || field.type === 'set') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Python Type</label>
            <code className="block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono text-gray-800">
              {field.pythonType}
            </code>
          </div>

          {/* Validation Messages */}
          {(nameValidation.errors.length > 0 ||
            nameValidation.warnings.length > 0 ||
            typeValidation.errors.length > 0 ||
            typeValidation.warnings.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Validation</label>
              <div className="space-y-2">
                {/* Name validation errors */}
                {nameValidation.errors.map((error, index) => (
                  <div
                    key={`name-error-${index}`}
                    className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded text-sm"
                  >
                    <span className="text-red-500 font-medium">✗</span>
                    <div>
                      <p className="text-red-700">{error.message}</p>
                      {error.suggestion && <p className="text-red-600 text-xs mt-1">💡 {error.suggestion}</p>}
                    </div>
                  </div>
                ))}

                {/* Type validation errors */}
                {typeValidation.errors.map((error, index) => (
                  <div
                    key={`type-error-${index}`}
                    className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded text-sm"
                  >
                    <span className="text-red-500 font-medium">✗</span>
                    <div>
                      <p className="text-red-700">{error.message}</p>
                      {error.suggestion && <p className="text-red-600 text-xs mt-1">💡 {error.suggestion}</p>}
                    </div>
                  </div>
                ))}

                {/* Name validation warnings */}
                {nameValidation.warnings.map((warning, index) => (
                  <div
                    key={`name-warning-${index}`}
                    className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                  >
                    <span className="text-yellow-500 font-medium">⚠</span>
                    <div>
                      <p className="text-yellow-700">{warning.message}</p>
                      {warning.suggestion && <p className="text-yellow-600 text-xs mt-1">💡 {warning.suggestion}</p>}
                    </div>
                  </div>
                ))}

                {/* Type validation warnings */}
                {typeValidation.warnings.map((warning, index) => (
                  <div
                    key={`type-warning-${index}`}
                    className="flex items-start space-x-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm"
                  >
                    <span className="text-yellow-500 font-medium">⚠</span>
                    <div>
                      <p className="text-yellow-700">{warning.message}</p>
                      {warning.suggestion && <p className="text-yellow-600 text-xs mt-1">💡 {warning.suggestion}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
