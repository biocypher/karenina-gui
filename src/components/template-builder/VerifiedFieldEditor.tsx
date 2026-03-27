/**
 * VerifiedFieldEditor: right-column detail editor for a single template field.
 *
 * Allows editing field name, type, description, ground truth, extraction hint,
 * verification primitive selection, and weight. Reads the selected field from
 * the template builder store.
 */

import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';
import { InfoTooltip } from './InfoTooltip';
import { DEFAULT_PRIMITIVES } from '../../types';
import type { TemplateField } from '../../types';

const FIELD_TYPES = [
  { value: 'bool', label: 'Boolean' },
  { value: 'str', label: 'String' },
  { value: 'int', label: 'Integer' },
  { value: 'float', label: 'Float' },
  { value: 'list_str', label: 'List of Strings' },
  { value: 'literal', label: 'Literal (enum)' },
  { value: 'date', label: 'Date' },
] as const;

const INPUT_CLASS =
  'w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

export function VerifiedFieldEditor() {
  const selectedFieldIndex = useTemplateBuilderStore((s) => s.selectedFieldIndex);
  const field = useTemplateBuilderStore((s) => s.getSelectedField());
  const updateField = useTemplateBuilderStore((s) => s.updateField);
  const getApplicablePrimitives = useTemplateBuilderStore((s) => s.getApplicablePrimitives);

  if (selectedFieldIndex === null || !field) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a field to edit its properties
      </div>
    );
  }

  const applicablePrimitives = getApplicablePrimitives(field.type);

  const handleTypeChange = (newType: TemplateField['type']) => {
    const defaultPrimitive = DEFAULT_PRIMITIVES[newType] || { type: 'ExactMatch' };
    const updates: Partial<TemplateField> = {
      type: newType,
      verify_with: { ...defaultPrimitive },
    };
    // Reset ground truth to a type-appropriate default
    if (newType === 'bool') updates.ground_truth = true;
    else if (newType === 'int' || newType === 'float') updates.ground_truth = 0;
    else if (newType === 'list_str') updates.ground_truth = [];
    else updates.ground_truth = '';

    if (newType !== 'literal') updates.literal_values = null;

    updateField(selectedFieldIndex, updates);
  };

  const handlePrimitiveChange = (primitiveName: string) => {
    updateField(selectedFieldIndex, {
      verify_with: { type: primitiveName },
    });
  };

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-base font-semibold text-gray-300 uppercase tracking-wider">Field Properties</h3>

      {/* Field Name */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Name
          <InfoTooltip text="A unique identifier for this field. Use snake_case (e.g., identifies_target, mentions_drug)." />
        </label>
        <input
          type="text"
          value={field.name}
          onChange={(e) =>
            updateField(selectedFieldIndex, {
              name: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
            })
          }
          className={INPUT_CLASS}
          placeholder="field_name"
        />
      </div>

      {/* Field Type */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Type
          <InfoTooltip text="The data type of the value the judge LLM will extract. Determines which verification primitives are available." />
        </label>
        <select
          value={field.type}
          onChange={(e) => handleTypeChange(e.target.value as TemplateField['type'])}
          className={INPUT_CLASS}
        >
          {FIELD_TYPES.map((ft) => (
            <option key={ft.value} value={ft.value}>
              {ft.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Description
          <InfoTooltip text="Instructions for the judge LLM explaining what this field should capture. Be specific about edge cases." />
        </label>
        <textarea
          value={field.description}
          onChange={(e) => updateField(selectedFieldIndex, { description: e.target.value })}
          rows={12}
          className={`${INPUT_CLASS}`}
          placeholder="Description for the judge LLM..."
        />
      </div>

      {/* Extraction Hint (optional) */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Extraction Hint <span className="text-gray-500 ml-1">(optional)</span>
          <InfoTooltip text="Optional post-processing instruction (e.g., 'normalize to uppercase'). Applied after extraction, before verification." />
        </label>
        <input
          type="text"
          value={field.extraction_hint || ''}
          onChange={(e) => updateField(selectedFieldIndex, { extraction_hint: e.target.value || null })}
          className={INPUT_CLASS}
          placeholder="e.g., Normalize to uppercase gene symbol"
        />
      </div>

      {/* Ground Truth */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Ground Truth
          <InfoTooltip text="The expected correct value. The extracted field is compared against this using the verification primitive." />
        </label>
        {field.type === 'bool' ? (
          <label className="flex items-center gap-2 text-sm text-gray-200">
            <input
              type="checkbox"
              checked={!!field.ground_truth}
              onChange={(e) => updateField(selectedFieldIndex, { ground_truth: e.target.checked })}
              className="rounded border-gray-600 bg-gray-800"
            />
            {field.ground_truth ? 'True' : 'False'}
          </label>
        ) : field.type === 'int' || field.type === 'float' ? (
          <input
            type="number"
            value={field.ground_truth ?? 0}
            step={field.type === 'float' ? 0.01 : 1}
            onChange={(e) =>
              updateField(selectedFieldIndex, {
                ground_truth: field.type === 'int' ? parseInt(e.target.value) : parseFloat(e.target.value),
              })
            }
            className={INPUT_CLASS}
          />
        ) : (
          <input
            type="text"
            value={typeof field.ground_truth === 'string' ? field.ground_truth : JSON.stringify(field.ground_truth)}
            onChange={(e) => updateField(selectedFieldIndex, { ground_truth: e.target.value })}
            className={INPUT_CLASS}
            placeholder="Expected correct value"
          />
        )}
      </div>

      {/* Literal Values (only for literal type) */}
      {field.type === 'literal' && (
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Allowed Values</label>
          <input
            type="text"
            value={(field.literal_values || []).join(', ')}
            onChange={(e) =>
              updateField(selectedFieldIndex, {
                literal_values: e.target.value
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            className={INPUT_CLASS}
            placeholder="value1, value2, value3"
          />
        </div>
      )}

      {/* Verification Primitive */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Verification Primitive
          <InfoTooltip text="The comparison method used to check the extracted value against ground truth (e.g., ExactMatch, BooleanMatch, NumericTolerance)." />
        </label>
        <select
          value={field.verify_with.type}
          onChange={(e) => handlePrimitiveChange(e.target.value)}
          className={INPUT_CLASS}
        >
          {applicablePrimitives.length > 0 ? (
            applicablePrimitives.map((p) => (
              <option key={p.name} value={p.name}>
                {p.name}
              </option>
            ))
          ) : (
            <option value={field.verify_with.type}>{field.verify_with.type}</option>
          )}
        </select>
      </div>

      {/* Weight */}
      <div>
        <label className="flex items-center text-sm font-medium text-gray-400 mb-1">
          Weight <span className="text-gray-500 ml-1">({field.weight})</span>
          <InfoTooltip text="Relative importance of this field in scoring (0 to 1). Higher weight means this field contributes more to the overall score." />
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={field.weight}
          onChange={(e) => updateField(selectedFieldIndex, { weight: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Trace Field Toggle */}
      <div>
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input
            type="checkbox"
            checked={field.is_trace}
            onChange={(e) => updateField(selectedFieldIndex, { is_trace: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800"
          />
          Trace field
          <InfoTooltip text="When enabled, the judge evaluates this field against the raw LLM response instead of the parsed output." />
        </label>
      </div>
    </div>
  );
}
