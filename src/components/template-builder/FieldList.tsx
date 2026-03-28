import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';
import { InfoTooltip } from './InfoTooltip';

export function FieldList() {
  const fields = useTemplateBuilderStore((s) => s.spec.fields);
  const selectedFieldIndex = useTemplateBuilderStore((s) => s.selectedFieldIndex);
  const addField = useTemplateBuilderStore((s) => s.addField);
  const removeField = useTemplateBuilderStore((s) => s.removeField);
  const selectField = useTemplateBuilderStore((s) => s.selectField);
  const moveField = useTemplateBuilderStore((s) => s.moveField);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center">
          <h3 className="text-base font-semibold text-gray-300 uppercase tracking-wider">Fields ({fields.length})</h3>
          <InfoTooltip text="Each field defines one piece of information the judge LLM will extract from the response and verify against ground truth." />
        </span>
        <button
          onClick={addField}
          className="px-3 py-1 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors"
        >
          + Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No fields yet. Click &quot;Add Field&quot; to start building your template.
        </div>
      ) : (
        <div className="space-y-1">
          {fields.map((field, index) => (
            <div
              key={`${field.name}-${index}`}
              onClick={() => selectField(index)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedFieldIndex === index
                  ? 'bg-blue-500/20 border border-blue-500/30'
                  : 'bg-gray-800/30 border border-transparent hover:bg-gray-800/50'
              }`}
            >
              {/* Order controls */}
              <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index > 0) moveField(index, index - 1);
                  }}
                  disabled={index === 0}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 text-[10px] leading-none"
                  title="Move up"
                >
                  &#x25B2;
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (index < fields.length - 1) moveField(index, index + 1);
                  }}
                  disabled={index === fields.length - 1}
                  className="text-gray-500 hover:text-gray-300 disabled:opacity-30 text-[10px] leading-none"
                  title="Move down"
                >
                  &#x25BC;
                </button>
              </div>

              {/* Field info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium text-gray-200 truncate">{field.name || 'unnamed'}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400 font-mono">
                    {field.type}
                  </span>
                  {field.is_trace && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">trace</span>
                  )}
                </div>
                {field.description && <p className="text-sm text-gray-500 truncate mt-0.5">{field.description}</p>}
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeField(index);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all text-sm"
                title="Remove field"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
