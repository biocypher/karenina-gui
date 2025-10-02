import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { FieldEditor, type FieldEditorRef } from './FieldEditor';
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
  onSave?: () => void;
  className?: string;
}

export interface PydanticFormEditorRef {
  saveAllUnsavedFields: () => void;
  hasUnsavedChanges: () => boolean;
}

export const PydanticFormEditor = forwardRef<PydanticFormEditorRef, PydanticFormEditorProps>(
  ({ code, onChange, onSave, className }, ref) => {
    const [classDef, setClassDef] = useState<PydanticClassDefinition | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [fieldsWithUnsavedChanges, setFieldsWithUnsavedChanges] = useState<Set<number>>(new Set());

    // Refs for field editors
    const fieldRefs = useRef<Map<number, FieldEditorRef>>(new Map());

    // Guard against re-entry during internal updates
    const isUpdatingRef = useRef(false);

    // Always auto-generate methods and use multiple field pattern
    const isAutoGenerateMethods = true;
    const defaultCorrectValuePattern: 'single' | 'multiple' = 'multiple';

    // Parse the code when it changes
    useEffect(() => {
      // Skip if we're in the middle of an internal update
      if (isUpdatingRef.current) {
        return;
      }

      const parseResult = parsePydanticClass(code);
      if (parseResult.success && parseResult.classDefinition) {
        // Ensure defaults are set
        const classDefWithDefaults = {
          ...parseResult.classDefinition,
          correctValuePattern: parseResult.classDefinition.correctValuePattern || defaultCorrectValuePattern,
        };

        setClassDef(classDefWithDefaults);
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
        // Set flag to prevent re-entry during this update
        isUpdatingRef.current = true;

        // Auto-generate methods if enabled
        if (isAutoGenerateMethods) {
          const methods: PydanticMethod[] = [];

          // Generate model_post_init
          methods.push({
            name: 'model_post_init',
            code: generateModelPostInit(
              newClassDef.fields,
              newClassDef.correctValuePattern || defaultCorrectValuePattern
            ),
          });

          // Generate verify
          methods.push({
            name: 'verify',
            code: generateVerifyMethod(
              newClassDef.fields,
              newClassDef.correctValuePattern || defaultCorrectValuePattern
            ),
          });

          // Generate verify_granular if needed (multiple fields OR single list field)
          const shouldGenerateGranular =
            newClassDef.fields.length > 1 || (newClassDef.fields.length === 1 && newClassDef.fields[0].type === 'list');

          if (shouldGenerateGranular) {
            const granularCode = generateVerifyGranularMethod(
              newClassDef.fields,
              newClassDef.correctValuePattern || defaultCorrectValuePattern
            );
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

        // Clear flag after a short delay to allow the onChange to propagate
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 0);

        // Auto-save after field changes
        if (onSave) {
          onSave();
        }
      } catch (error) {
        console.error('Error generating code:', error);
      }
    };

    // Track unsaved changes for a specific field (memoized to prevent infinite loops)
    const handleFieldUnsavedChange = useCallback((index: number, hasUnsaved: boolean) => {
      setFieldsWithUnsavedChanges((prev) => {
        const newSet = new Set(prev);
        if (hasUnsaved) {
          newSet.add(index);
        } else {
          newSet.delete(index);
        }
        return newSet;
      });
    }, []);

    // Save all fields with unsaved changes
    const saveAllUnsavedFields = useCallback(() => {
      fieldRefs.current.forEach((fieldRef) => {
        if (fieldRef && fieldRef.hasUnsavedChanges()) {
          fieldRef.saveChanges();
        }
      });
      // Clear the unsaved changes set after saving
      setFieldsWithUnsavedChanges(new Set());
    }, []);

    // Check if any field has unsaved changes
    const hasUnsavedChanges = useCallback(() => {
      return fieldsWithUnsavedChanges.size > 0;
    }, [fieldsWithUnsavedChanges]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        saveAllUnsavedFields,
        hasUnsavedChanges,
      }),
      [saveAllUnsavedFields, hasUnsavedChanges]
    );

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
        correctValuePattern: classDef.correctValuePattern || defaultCorrectValuePattern,
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

    if (parseError) {
      return (
        <div className={`p-6 ${className}`}>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-4">
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
                <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Parse Error</h3>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{parseError}</p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
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
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
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
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Validation Issues</h3>
                <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Fields Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Fields</h3>
              {fieldsWithUnsavedChanges.size > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {fieldsWithUnsavedChanges.size} unsaved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleAddField}
              className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Field
            </button>
          </div>

          {classDef.fields.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
              <svg
                className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No fields</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Get started by adding a field to your Answer class.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleAddField}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-xl text-white bg-indigo-600 dark:bg-indigo-700 hover:bg-indigo-700 dark:hover:bg-indigo-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
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
                  ref={(el) => {
                    if (el) {
                      fieldRefs.current.set(index, el);
                    } else {
                      fieldRefs.current.delete(index);
                    }
                  }}
                  field={field}
                  fieldNumber={index + 1}
                  onChange={(updatedField) => handleFieldChange(index, updatedField)}
                  onRemove={() => handleRemoveField(index)}
                  onUnsavedChangesChange={(hasUnsaved) => handleFieldUnsavedChange(index, hasUnsaved)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Class Summary</h4>
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p>
              Class: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{classDef.className}</code>
            </p>
            <p>Fields: {classDef.fields.length}</p>
            <p>Methods: {classDef.methods.length}</p>
            {classDef.fields.length > 1 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                ✓ verify_granular method will be auto-generated for granular scoring
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
);
