import { useState, useEffect } from 'react';
import { FieldEditor } from './FieldEditor';
import { parsePydanticClass, validatePydanticClass } from '../../utils/pydanticParser';
import {
  generatePydanticCode,
  generateModelPostInit,
  generateVerifyMethod,
  generateVerifyGranularMethod,
} from '../../utils/pydanticGenerator';
import type { PydanticFieldDefinition, PydanticClassDefinition, PydanticMethod } from '../../types';

interface PydanticFormEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  className?: string;
}

export function PydanticFormEditor({ code, onChange, className }: PydanticFormEditorProps) {
  const [classDef, setClassDef] = useState<PydanticClassDefinition | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isAutoGenerateMethods, setIsAutoGenerateMethods] = useState(true);

  // Parse the code when it changes
  useEffect(() => {
    const parseResult = parsePydanticClass(code);
    if (parseResult.success && parseResult.classDefinition) {
      setClassDef(parseResult.classDefinition);
      setParseError(null);

      // Validate the parsed class
      const errors = validatePydanticClass(parseResult.classDefinition);
      setValidationErrors(errors);
    } else {
      setParseError(parseResult.error || 'Failed to parse class');
      setClassDef(null);
      setValidationErrors([]);
    }
  }, [code]);

  // Generate new code when class definition changes
  const updateCode = (newClassDef: PydanticClassDefinition) => {
    try {
      // Auto-generate methods if enabled
      if (isAutoGenerateMethods) {
        const methods: PydanticMethod[] = [];

        // Generate model_post_init
        methods.push({
          name: 'model_post_init',
          code: generateModelPostInit(newClassDef.fields),
        });

        // Generate verify
        methods.push({
          name: 'verify',
          code: generateVerifyMethod(newClassDef.fields),
        });

        // Generate verify_granular if needed
        if (newClassDef.fields.length > 1) {
          const granularCode = generateVerifyGranularMethod(newClassDef.fields);
          if (granularCode) {
            methods.push({
              name: 'verify_granular',
              code: granularCode,
            });
          }
        }

        newClassDef.methods = methods;
      }

      const newCode = generatePydanticCode(newClassDef);
      onChange(newCode);
    } catch (error) {
      console.error('Error generating code:', error);
    }
  };

  const handleFieldChange = (index: number, updatedField: PydanticFieldDefinition) => {
    if (!classDef) return;

    const newFields = [...classDef.fields];
    newFields[index] = updatedField;

    const newClassDef = {
      ...classDef,
      fields: newFields,
    };

    setClassDef(newClassDef);
    updateCode(newClassDef);
  };

  const handleAddField = () => {
    if (!classDef) return;

    const newField: PydanticFieldDefinition = {
      name: `field_${classDef.fields.length + 1}`,
      type: 'str',
      pythonType: 'str',
      description: '',
      required: true,
    };

    const newClassDef = {
      ...classDef,
      fields: [...classDef.fields, newField],
    };

    setClassDef(newClassDef);
    updateCode(newClassDef);
  };

  const handleRemoveField = (index: number) => {
    if (!classDef) return;

    const newFields = classDef.fields.filter((_, i) => i !== index);

    const newClassDef = {
      ...classDef,
      fields: newFields,
    };

    setClassDef(newClassDef);
    updateCode(newClassDef);
  };

  const handleClassNameChange = (newClassName: string) => {
    if (!classDef) return;

    const newClassDef = {
      ...classDef,
      className: newClassName,
    };

    setClassDef(newClassDef);
    updateCode(newClassDef);
  };

  if (parseError) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Parse Error</h3>
              <p className="mt-1 text-sm text-red-700">{parseError}</p>
              <p className="mt-2 text-sm text-red-600">
                Switch to Code View to fix the syntax errors, or clear the editor to start fresh.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!classDef) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Validation Issues</h3>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Class Settings */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Class Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <input
              type="text"
              value={classDef.className}
              onChange={(e) => handleClassNameChange(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Class</label>
            <input
              type="text"
              value={classDef.baseClass || 'BaseAnswer'}
              readOnly
              className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isAutoGenerateMethods}
              onChange={(e) => setIsAutoGenerateMethods(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Auto-generate methods (model_post_init, verify, verify_granular)
            </span>
          </label>
        </div>
      </div>

      {/* Fields Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Fields</h3>
          <button
            type="button"
            onClick={handleAddField}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Field
          </button>
        </div>

        {classDef.fields.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fields</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by adding a field to your Answer class.</p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleAddField}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Add Field
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {classDef.fields.map((field, index) => (
              <FieldEditor
                key={`${field.name}-${index}`}
                field={field}
                onChange={(updatedField) => handleFieldChange(index, updatedField)}
                onRemove={() => handleRemoveField(index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Class Summary</h4>
        <div className="text-sm text-blue-800">
          <p>
            Class: <code className="bg-blue-100 px-1 rounded">{classDef.className}</code>
          </p>
          <p>Fields: {classDef.fields.length}</p>
          <p>Methods: {classDef.methods.length}</p>
          {classDef.fields.length > 1 && (
            <p className="text-xs text-blue-600 mt-1">
              ✓ verify_granular method will be auto-generated for granular scoring
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
