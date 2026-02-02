import React from 'react';
import type { CallableRubricTrait } from '../../types';

interface RubricCallableTraitCardProps {
  trait: CallableRubricTrait;
}

export const RubricCallableTraitCard: React.FC<RubricCallableTraitCardProps> = ({ trait }) => {
  return (
    <div className="bg-teal-50 dark:bg-teal-900/10 rounded-lg border border-teal-200 dark:border-teal-800 p-6 shadow-sm">
      <div className="grid grid-cols-12 gap-4 items-start">
        {/* Trait Name */}
        <div className="col-span-3">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Name</label>
          <div className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {trait.name}
          </div>
        </div>

        {/* Trait Type */}
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Type</label>
          <div className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            Callable ({trait.kind})
          </div>
        </div>

        {/* Description */}
        <div className="col-span-6">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Trait Description</label>
          <div className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            {trait.description || 'No description'}
          </div>
        </div>
      </div>

      {/* Callable Code Display */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Callable Code (Read-Only)
        </label>
        <div className="px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
          {trait.callable_code ? (
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-teal-600 dark:text-teal-400 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              <span className="italic">Pickled Python function (binary format, not displayable as text)</span>
            </div>
          ) : (
            'No callable code'
          )}
        </div>
      </div>

      {/* Score Direction (Read-Only) */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
          Score Direction (Read-Only)
        </label>
        <div className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {trait.higher_is_better === false ? (
            <span className="text-orange-600 dark:text-orange-400">Lower = Better</span>
          ) : (
            <span className="text-green-600 dark:text-green-400">Higher = Better</span>
          )}
        </div>
      </div>

      {/* Read-Only Badge */}
      <div className="mt-3 flex items-center gap-2 text-xs text-teal-700 dark:text-teal-400">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="font-medium">Read-Only (loaded from checkpoint)</span>
      </div>
    </div>
  );
};
