// src/components/template-builder/VerifiedFieldEditor.tsx
import { useState } from 'react';
import { useTemplateBuilderStore, DEFAULT_PRIMITIVES } from '../../stores/useTemplateBuilderStore';
import { DynamicGroundTruth } from './DynamicGroundTruth';
import { FRIENDLY_TYPE_NAMES, FRIENDLY_PRIMITIVE_NAMES } from '../../utils/friendlyNames';
import { generatePreview } from '../../utils/previewGenerator';
import type { TemplateField } from '../../types';

const FIELD_TYPES = ['bool', 'str', 'int', 'float', 'list_str', 'literal', 'date'] as const;

const INPUT_CLASS =
  'w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const SECTION_LABEL = 'text-[11px] font-semibold uppercase tracking-wider mb-3';
const FIELD_LABEL = 'text-sm font-medium text-gray-400 mb-1';

export function VerifiedFieldEditor() {
  const selectedFieldIndex = useTemplateBuilderStore((s) => s.selectedFieldIndex);
  const field = useTemplateBuilderStore((s) => s.getSelectedField());
  const updateField = useTemplateBuilderStore((s) => s.updateField);
  const getApplicablePrimitives = useTemplateBuilderStore((s) => s.getApplicablePrimitives);
  const strategy = useTemplateBuilderStore((s) => s.spec.verify_strategy);
  const setStrategy = useTemplateBuilderStore((s) => s.setStrategy);

  const [showHint, setShowHint] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (selectedFieldIndex === null || !field) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-base">
        Select a field to edit its properties.
      </div>
    );
  }

  const applicablePrimitives = getApplicablePrimitives(field.type);

  const handleTypeChange = (newType: TemplateField['type']) => {
    const defaultPrimitive = DEFAULT_PRIMITIVES[newType] ?? { type: 'ExactMatch' };
    updateField(selectedFieldIndex, {
      type: newType,
      ground_truth: newType === 'bool' ? false : newType === 'list_str' ? [] : '',
      verify_with: defaultPrimitive,
      literal_values: newType === 'literal' ? [] : null,
    });
  };

  const handleNameChange = (raw: string) => {
    const sanitized = raw.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    updateField(selectedFieldIndex, { name: sanitized });
  };

  const preview = generatePreview(field.verify_with.type, field.ground_truth, {
    ...field.verify_with,
    literal_values: field.literal_values,
  });

  return (
    <div className="space-y-6 p-4 overflow-y-auto">
      {/* SECTION 1: Identity */}
      <div className="border-l-[3px] border-blue-400 pl-4">
        <div className={`${SECTION_LABEL} text-blue-400`}>Identity</div>

        <div className="mb-3">
          <div className={FIELD_LABEL}>Field Name</div>
          <input
            type="text"
            value={field.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className={INPUT_CLASS}
            placeholder="field_name"
          />
        </div>

        <div>
          <div className={FIELD_LABEL}>What type of answer is this?</div>
          <div className="flex gap-2 flex-wrap">
            {FIELD_TYPES.map((t) => {
              const friendly = FRIENDLY_TYPE_NAMES[t];
              const isSelected = field.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'bg-blue-700 border-blue-500 text-white'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {friendly?.label ?? t}{' '}
                  <span className={`text-xs ${isSelected ? 'opacity-50' : 'opacity-40'}`}>
                    ({friendly?.programmatic ?? t})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 2: Instructions for the Judge */}
      <div className="border-l-[3px] border-purple-400 pl-4">
        <div className={`${SECTION_LABEL} text-purple-400`}>Instructions for the Judge</div>

        <div className="mb-3">
          <div className={FIELD_LABEL}>What should the judge look for?</div>
          <textarea
            value={field.description}
            onChange={(e) => updateField(selectedFieldIndex, { description: e.target.value })}
            rows={6}
            className={INPUT_CLASS}
            placeholder="Describe what this field should capture and what counts as a correct extraction..."
          />
        </div>

        {!showHint && !field.extraction_hint && (
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="text-sm text-purple-400/70 hover:text-purple-300 transition-colors"
          >
            + Add extraction hint
          </button>
        )}

        {(showHint || field.extraction_hint) && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 leading-relaxed mb-2 bg-gray-800/30 border-l-2 border-purple-400/40 rounded-r-lg px-3 py-2">
              Text added here is{' '}
              <strong className="text-purple-300">optionally attached to the judge&apos;s parsing instructions</strong>.
              Inclusion can be <strong className="text-purple-300">toggled on/off during verification</strong> via{' '}
              <code className="text-xs text-purple-400">include_extraction_hints</code>, letting you measure the impact
              of additional instructions on judge accuracy.
            </div>
            <input
              type="text"
              value={field.extraction_hint ?? ''}
              onChange={(e) => updateField(selectedFieldIndex, { extraction_hint: e.target.value || null })}
              className={INPUT_CLASS}
              placeholder='e.g., "normalize gene names to HGNC symbols"'
            />
          </div>
        )}
      </div>

      {/* SECTION 3: Expected Answer */}
      <div className="border-l-[3px] border-emerald-400 pl-4">
        <div className={`${SECTION_LABEL} text-emerald-400`}>Expected Answer</div>

        {field.type === 'literal' && (
          <div className="mb-3">
            <div className={FIELD_LABEL}>Allowed values</div>
            <input
              type="text"
              value={(field.literal_values ?? []).join(', ')}
              onChange={(e) =>
                updateField(selectedFieldIndex, {
                  literal_values: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className={INPUT_CLASS}
              placeholder="low, medium, high (comma-separated)"
            />
          </div>
        )}

        <div>
          <div className={FIELD_LABEL}>What is the correct answer?</div>
          <DynamicGroundTruth
            fieldType={field.type}
            value={field.ground_truth}
            onChange={(val) => updateField(selectedFieldIndex, { ground_truth: val })}
            literalValues={field.literal_values}
          />
        </div>
      </div>

      {/* SECTION 4: How to Verify */}
      <div className="border-l-[3px] border-amber-400 pl-4">
        <div className={`${SECTION_LABEL} text-amber-400`}>How to Verify</div>

        <div className="mb-3">
          <div className={FIELD_LABEL}>How should the answer be checked?</div>
          <div className="flex gap-2 flex-wrap">
            {applicablePrimitives.map((p) => {
              const friendly = FRIENDLY_PRIMITIVE_NAMES[p.name];
              const isSelected = field.verify_with.type === p.name;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => updateField(selectedFieldIndex, { verify_with: { type: p.name } })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    isSelected
                      ? 'bg-amber-800 border-amber-500 text-amber-200'
                      : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {friendly?.label ?? p.name}{' '}
                  <span className={`text-xs ${isSelected ? 'opacity-50' : 'opacity-40'}`}>
                    ({friendly?.programmatic ?? p.name})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Primitive-specific parameters */}
        {field.verify_with.type === 'NumericTolerance' && (
          <div className="mb-3">
            <div className={FIELD_LABEL}>Allowed difference</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                value={field.verify_with.tolerance ?? 0.05}
                onChange={(e) =>
                  updateField(selectedFieldIndex, {
                    verify_with: { ...field.verify_with, tolerance: parseFloat(e.target.value) || 0.05 },
                  })
                }
                className={`${INPUT_CLASS} w-28`}
              />
              <span className="text-xs text-gray-500">
                (accepts answers within &plusmn;{field.verify_with.tolerance ?? 0.05} of expected)
              </span>
            </div>
          </div>
        )}

        {field.verify_with.type === 'SemanticMatch' && (
          <div className="mb-3">
            <div className={FIELD_LABEL}>Minimum similarity</div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={field.verify_with.threshold ?? 0.8}
                onChange={(e) =>
                  updateField(selectedFieldIndex, {
                    verify_with: { ...field.verify_with, threshold: parseFloat(e.target.value) || 0.8 },
                  })
                }
                className={`${INPUT_CLASS} w-28`}
              />
              <span className="text-xs text-gray-500">(0 = any match, 1 = identical)</span>
            </div>
          </div>
        )}

        {/* Live preview */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 mb-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Preview: how this check works</div>
          <div className="font-mono text-sm leading-loose">
            <div className="text-gray-300">
              Expected: <span className="text-blue-400">{preview.expected}</span>
            </div>
            <div className="text-green-400">
              LLM says <span className="text-blue-400">{preview.pass.output}</span> &rarr; {preview.pass.explanation}{' '}
              &rarr; <strong>Pass &#10003;</strong>
            </div>
            <div className="text-red-400">
              LLM says <span className="text-blue-400">{preview.fail.output}</span> &rarr; {preview.fail.explanation}{' '}
              &rarr; <strong>Fail &#10007;</strong>
            </div>
          </div>
        </div>

        {/* Weight (hidden by default) */}
        {!showWeight && field.weight === 1.0 && (
          <button
            type="button"
            onClick={() => setShowWeight(true)}
            className="text-sm text-amber-400/70 hover:text-amber-300 transition-colors"
          >
            + Adjust field importance
          </button>
        )}

        {(showWeight || field.weight !== 1.0) && (
          <div className="mt-2">
            <div className="text-xs text-gray-400 leading-relaxed mb-2 bg-gray-800/30 border-l-2 border-amber-400/40 rounded-r-lg px-3 py-2">
              The weight controls how much this field contributes to the{' '}
              <strong className="text-amber-300">granular score</strong>. This only matters when using{' '}
              <strong className="text-amber-300">granular verification</strong> (
              <code className="text-xs text-amber-400">verify_granular()</code>), which computes a weighted average
              across all fields instead of a simple pass/fail. Default is{' '}
              <strong className="text-amber-300">1.0</strong> (normal importance).
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className={FIELD_LABEL}>Weight</span>
              <span className="text-sm text-gray-200 font-medium">{field.weight}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={field.weight}
              onChange={(e) => updateField(selectedFieldIndex, { weight: parseFloat(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>
        )}
      </div>

      {/* Advanced Options */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          {showAdvanced ? '\u2212 Advanced options' : '+ Advanced options'}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 bg-gray-800/30 border border-gray-700/50 rounded-lg p-3">
            <div>
              <div className="text-sm font-medium text-gray-400 mb-1">Composition strategy</div>
              <select
                value={strategy?.type ?? 'all_of'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all_of') {
                    setStrategy(null);
                  } else {
                    setStrategy({
                      type: val as 'any_of' | 'at_least_n',
                      n: val === 'at_least_n' ? 1 : undefined,
                      conditions: [],
                    });
                  }
                }}
                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value="all_of">All fields must pass</option>
                <option value="any_of">Any field can pass</option>
                <option value="at_least_n">At least N must pass</option>
              </select>
              {strategy?.type === 'at_least_n' && (
                <input
                  type="number"
                  min={1}
                  value={strategy.n ?? 1}
                  onChange={(e) => setStrategy({ ...strategy, n: parseInt(e.target.value, 10) || 1 })}
                  className="w-20 mt-2 px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-base text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  placeholder="N"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trace-field"
                checked={field.is_trace}
                onChange={(e) => updateField(selectedFieldIndex, { is_trace: e.target.checked })}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="trace-field" className="text-sm text-gray-400">
                Trace field (evaluate against raw LLM response instead of parsed output)
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
