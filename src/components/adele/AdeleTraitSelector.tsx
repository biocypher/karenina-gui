/**
 * AdeleTraitSelector - Expandable list for selecting ADeLe traits.
 *
 * Displays available ADeLe traits in a single-column list with checkboxes.
 * Click on a trait row to expand and see its full description with class definitions.
 * Supports "Select All" / "Clear All" functionality.
 * Empty selection means "all traits".
 */

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { adeleApi } from '../../services/adeleApi';
import type { AdeleTraitInfo } from '../../types/adele';

interface AdeleTraitSelectorProps {
  /** Currently selected trait names (empty array = all traits) */
  selectedTraits: string[];
  /** Callback when selection changes */
  onChange: (traits: string[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Available traits (if provided, skips API fetch) */
  availableTraits?: AdeleTraitInfo[];
}

export const AdeleTraitSelector: React.FC<AdeleTraitSelectorProps> = ({
  selectedTraits,
  onChange,
  disabled = false,
  availableTraits: providedTraits,
}) => {
  const [traits, setTraits] = useState<AdeleTraitInfo[]>(providedTraits || []);
  const [loading, setLoading] = useState(!providedTraits);
  const [error, setError] = useState<string | null>(null);
  const [expandedTraits, setExpandedTraits] = useState<Set<string>>(new Set());

  // Fetch traits if not provided
  useEffect(() => {
    if (providedTraits) {
      setTraits(providedTraits);
      setLoading(false);
      return;
    }

    const loadTraits = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedTraits = await adeleApi.getTraits();
        setTraits(fetchedTraits);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load traits');
      } finally {
        setLoading(false);
      }
    };

    loadTraits();
  }, [providedTraits]);

  // Determine if "all traits" mode is active (empty selection)
  const isAllTraitsMode = selectedTraits.length === 0;

  // Get the effective selection state for display
  const effectiveSelection = isAllTraitsMode ? new Set(traits.map((t) => t.name)) : new Set(selectedTraits);

  const handleToggleTrait = (traitName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;

    if (isAllTraitsMode) {
      // Switching from "all" mode to explicit selection
      // Select all except the one being toggled off
      const newSelection = traits.filter((t) => t.name !== traitName).map((t) => t.name);
      onChange(newSelection);
    } else {
      // Normal toggle behavior
      if (effectiveSelection.has(traitName)) {
        const newSelection = selectedTraits.filter((t) => t !== traitName);
        // If deselecting would leave nothing, keep at least one
        if (newSelection.length === 0) {
          onChange([]); // Switch to "all traits" mode
        } else {
          onChange(newSelection);
        }
      } else {
        onChange([...selectedTraits, traitName]);
      }
    }
  };

  const handleToggleExpand = (traitName: string) => {
    setExpandedTraits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(traitName)) {
        newSet.delete(traitName);
      } else {
        newSet.add(traitName);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (disabled) return;
    onChange([]); // Empty array means "all traits"
  };

  const handleClearAll = () => {
    if (disabled) return;
    // Can't have zero traits, so we'll just select the first one
    if (traits.length > 0) {
      onChange([traits[0].name]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
        <span className="ml-2 text-sm text-slate-500">Loading traits...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
        {error}
      </div>
    );
  }

  const selectedCount = isAllTraitsMode ? traits.length : selectedTraits.length;

  return (
    <div>
      {/* Header with count and actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {selectedCount} / {traits.length} traits selected
          {isAllTraitsMode && (
            <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs">
              All
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            disabled={disabled || isAllTraitsMode}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Select All
          </button>
          <button
            onClick={handleClearAll}
            disabled={disabled || selectedCount === 1}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline disabled:opacity-50 disabled:no-underline"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Trait list */}
      <div className="max-h-[60vh] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
        {traits.map((trait) => {
          const isExpanded = expandedTraits.has(trait.name);
          const isSelected = effectiveSelection.has(trait.name);

          return (
            <div
              key={trait.name}
              className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${
                disabled ? 'opacity-50' : ''
              }`}
            >
              {/* Trait row */}
              <div
                onClick={() => handleToggleExpand(trait.name)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                  isExpanded ? 'bg-slate-50 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                }`}
              >
                {/* Expand/collapse icon */}
                <div className="text-slate-400 dark:text-slate-500">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>

                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => {}}
                  onClick={(e) => handleToggleTrait(trait.name, e)}
                  disabled={disabled}
                  className="rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500"
                />

                {/* Trait name and code */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {trait.name.replace(/_/g, ' ')}
                  </span>
                  {/* Only show code if it's a short actual code (not a description) */}
                  {trait.code && trait.code.length <= 10 && !trait.code.includes(' ') && (
                    <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">({trait.code})</span>
                  )}
                </div>
              </div>

              {/* Expanded description */}
              {isExpanded && (
                <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50">
                  {/* Description */}
                  {trait.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{trait.description}</p>
                  )}

                  {/* Class definitions */}
                  {trait.classes && Object.keys(trait.classes).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Levels
                      </div>
                      <div className="space-y-1.5">
                        {trait.classNames.map((className, index) => (
                          <div key={className} className="flex gap-2 text-sm">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-500/30 dark:to-indigo-500/30 flex items-center justify-center">
                              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">{index}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {className.replace(/_/g, ' ')}
                              </span>
                              {trait.classes[className] && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                  {trait.classes[className]}
                                </p>
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
          );
        })}
      </div>
    </div>
  );
};

export default AdeleTraitSelector;
