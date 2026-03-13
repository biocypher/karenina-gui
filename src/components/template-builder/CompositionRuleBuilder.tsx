/**
 * CompositionRuleBuilder: Notion-style nested rule builder for defining
 * verification composition strategies.
 *
 * Manages the `verify_strategy` on the template spec. When the strategy is
 * null (default), all fields must pass. Users can click "Customize" to switch
 * to an explicit strategy tree with All/Any/AtLeastN combinators and
 * field_check leaf nodes rendered as checkboxes.
 */

import { useCallback } from 'react';
import { useTemplateBuilderStore } from '../../stores/useTemplateBuilderStore';
import type { VerifyStrategy } from '../../types';

const SELECT_CLASS =
  'px-2 py-1 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

const N_INPUT_CLASS =
  'w-14 px-2 py-1 bg-gray-800/50 border border-gray-700 rounded-lg text-xs text-gray-200 text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none';

type StrategyType = VerifyStrategy['type'];

/** Create a default group node with all current fields as children. */
function buildDefaultStrategy(fieldNames: string[]): VerifyStrategy {
  return {
    type: 'all_of',
    conditions: fieldNames.map((name) => ({
      type: 'field_check' as const,
      field_name: name,
      conditions: [],
    })),
  };
}

/** Recursively update a strategy node at a given path. */
function updateAtPath(
  root: VerifyStrategy,
  path: number[],
  updater: (node: VerifyStrategy) => VerifyStrategy
): VerifyStrategy {
  if (path.length === 0) return updater(root);
  const [head, ...rest] = path;
  const newConditions = root.conditions.map((child, i) => (i === head ? updateAtPath(child, rest, updater) : child));
  return { ...root, conditions: newConditions };
}

/** Remove a child condition at a given path. */
function removeAtPath(root: VerifyStrategy, path: number[]): VerifyStrategy {
  if (path.length === 0) return root;
  if (path.length === 1) {
    return {
      ...root,
      conditions: root.conditions.filter((_, i) => i !== path[0]),
    };
  }
  const [head, ...rest] = path;
  return {
    ...root,
    conditions: root.conditions.map((child, i) => (i === head ? removeAtPath(child, rest) : child)),
  };
}

/** Insert a child condition at a given path. */
function insertAtPath(root: VerifyStrategy, path: number[], child: VerifyStrategy): VerifyStrategy {
  if (path.length === 0) {
    return { ...root, conditions: [...root.conditions, child] };
  }
  const [head, ...rest] = path;
  return {
    ...root,
    conditions: root.conditions.map((c, i) => (i === head ? insertAtPath(c, rest, child) : c)),
  };
}

// ---------------------------------------------------------------------------
// Recursive node renderer
// ---------------------------------------------------------------------------

interface StrategyNodeProps {
  node: VerifyStrategy;
  path: number[];
  fieldNames: string[];
  depth: number;
  onUpdate: (path: number[], updater: (n: VerifyStrategy) => VerifyStrategy) => void;
  onRemove: (path: number[]) => void;
  onInsert: (path: number[], child: VerifyStrategy) => void;
}

function StrategyNode({ node, path, fieldNames, depth, onUpdate, onRemove, onInsert }: StrategyNodeProps) {
  // Leaf node: field_check
  if (node.type === 'field_check') {
    return (
      <div className="flex items-center gap-2 py-1 pl-1">
        <span className="w-2 h-2 rounded-full bg-blue-400/60 flex-shrink-0" />
        <span className="text-sm text-gray-200 font-mono">{node.field_name}</span>
        {depth > 0 && (
          <button
            onClick={() => onRemove(path)}
            className="ml-auto text-gray-500 hover:text-red-400 text-xs transition-colors"
            title="Remove condition"
          >
            &#x2715;
          </button>
        )}
      </div>
    );
  }

  // Group node: all_of | any_of | at_least_n
  const handleTypeChange = (newType: StrategyType) => {
    onUpdate(path, (n) => ({
      ...n,
      type: newType,
      n: newType === 'at_least_n' ? Math.max(1, Math.min(n.conditions.length, n.n ?? 1)) : null,
    }));
  };

  const handleNChange = (value: number) => {
    onUpdate(path, (n) => ({ ...n, n: Math.max(1, value) }));
  };

  const addFieldCheck = (fieldName: string) => {
    const child: VerifyStrategy = {
      type: 'field_check',
      field_name: fieldName,
      conditions: [],
    };
    onInsert(path, child);
  };

  const addGroup = () => {
    const child: VerifyStrategy = {
      type: 'all_of',
      conditions: [],
    };
    onInsert(path, child);
  };

  // Determine which field names are already used as direct children
  const usedFields = new Set(node.conditions.filter((c) => c.type === 'field_check').map((c) => c.field_name));
  const availableFields = fieldNames.filter((f) => !usedFields.has(f));

  const typeLabel: Record<string, string> = {
    all_of: 'All of',
    any_of: 'Any of',
    at_least_n: 'At least',
  };

  return (
    <div
      className={`rounded-lg border ${
        depth === 0 ? 'border-gray-700 bg-gray-800/30' : 'border-gray-700/60 bg-gray-800/20'
      } p-3`}
    >
      {/* Header: type selector + N input + remove button */}
      <div className="flex items-center gap-2 mb-2">
        <select
          value={node.type}
          onChange={(e) => handleTypeChange(e.target.value as StrategyType)}
          className={SELECT_CLASS}
        >
          <option value="all_of">All of</option>
          <option value="any_of">Any of</option>
          <option value="at_least_n">At least N of</option>
        </select>

        {node.type === 'at_least_n' && (
          <>
            <input
              type="number"
              min={1}
              max={node.conditions.length || 1}
              value={node.n ?? 1}
              onChange={(e) => handleNChange(parseInt(e.target.value) || 1)}
              className={N_INPUT_CLASS}
            />
            <span className="text-xs text-gray-400">
              of {node.conditions.length} condition{node.conditions.length !== 1 ? 's' : ''}
            </span>
          </>
        )}

        {!node.type.startsWith('at_least') && (
          <span className="text-xs text-gray-500">{typeLabel[node.type]} the following must pass:</span>
        )}

        {depth > 0 && (
          <button
            onClick={() => onRemove(path)}
            className="ml-auto text-gray-500 hover:text-red-400 text-xs transition-colors"
            title="Remove group"
          >
            &#x2715;
          </button>
        )}
      </div>

      {/* Children */}
      <div className="space-y-1 ml-3 border-l border-gray-700/50 pl-3">
        {node.conditions.length === 0 && (
          <div className="text-xs text-gray-500 italic py-1">No conditions. Add fields or nested groups below.</div>
        )}
        {node.conditions.map((child, index) => (
          <StrategyNode
            key={`${child.type}-${child.field_name ?? ''}-${index}`}
            node={child}
            path={[...path, index]}
            fieldNames={fieldNames}
            depth={depth + 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onInsert={onInsert}
          />
        ))}
      </div>

      {/* Action bar: add field checkboxes + add group */}
      <div className="mt-2 ml-3 pl-3 flex flex-wrap items-center gap-2">
        {availableFields.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {availableFields.map((name) => (
              <button
                key={name}
                onClick={() => addFieldCheck(name)}
                className="px-2 py-0.5 text-[11px] font-mono text-gray-400 border border-dashed border-gray-600 rounded hover:border-blue-500/50 hover:text-blue-400 transition-colors"
                title={`Add "${name}" condition`}
              >
                + {name}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={addGroup}
          className="px-2 py-0.5 text-[11px] font-medium text-purple-400 border border-dashed border-purple-500/30 rounded hover:bg-purple-500/10 transition-colors"
        >
          + Add Group
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CompositionRuleBuilder() {
  const strategy = useTemplateBuilderStore((s) => s.spec.verify_strategy);
  const fields = useTemplateBuilderStore((s) => s.spec.fields);
  const setStrategy = useTemplateBuilderStore((s) => s.setStrategy);

  const fieldNames = fields.map((f) => f.name).filter(Boolean);

  const handleCustomize = useCallback(() => {
    setStrategy(buildDefaultStrategy(fieldNames));
  }, [fieldNames, setStrategy]);

  const handleResetToDefault = useCallback(() => {
    setStrategy(null);
  }, [setStrategy]);

  const handleUpdate = useCallback(
    (path: number[], updater: (n: VerifyStrategy) => VerifyStrategy) => {
      if (!strategy) return;
      setStrategy(updateAtPath(strategy, path, updater));
    },
    [strategy, setStrategy]
  );

  const handleRemove = useCallback(
    (path: number[]) => {
      if (!strategy) return;
      setStrategy(removeAtPath(strategy, path));
    },
    [strategy, setStrategy]
  );

  const handleInsert = useCallback(
    (path: number[], child: VerifyStrategy) => {
      if (!strategy) return;
      setStrategy(insertAtPath(strategy, path, child));
    },
    [strategy, setStrategy]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Composition Strategy</h3>
        {strategy !== null && (
          <button
            onClick={handleResetToDefault}
            className="px-3 py-1 text-xs font-medium text-gray-400 border border-gray-600 rounded-lg hover:text-gray-200 hover:border-gray-500 transition-colors"
          >
            Reset to Default
          </button>
        )}
      </div>

      {/* Default (null strategy) indicator */}
      {strategy === null ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/30 border border-gray-700/50">
            <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-500">Default: all fields must pass</span>
          </div>
          {fieldNames.length > 0 && (
            <button
              onClick={handleCustomize}
              className="px-3 py-1.5 text-xs font-medium text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/10 transition-colors"
            >
              Customize
            </button>
          )}
          {fieldNames.length === 0 && (
            <p className="text-xs text-gray-500">
              Add fields to the template before customizing the composition strategy.
            </p>
          )}
        </div>
      ) : (
        <StrategyNode
          node={strategy}
          path={[]}
          fieldNames={fieldNames}
          depth={0}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
          onInsert={handleInsert}
        />
      )}
    </div>
  );
}
