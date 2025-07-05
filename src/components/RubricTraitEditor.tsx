import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { RubricTrait, TraitKind } from '../types';

export default function RubricTraitEditor() {
  const {
    currentRubric,
    isSavingRubric,
    lastError,
    addTrait,
    updateTrait,
    removeTrait,
    saveRubric,
    clearError,
    setCurrentRubric
  } = useRubricStore();
  
  
  // Initialize with default rubric if none exists
  useEffect(() => {
    if (!currentRubric) {
      setCurrentRubric({
        traits: []
      });
    }
  }, [currentRubric, setCurrentRubric]);
  
  const handleAddTrait = () => {
    const newTrait: RubricTrait = {
      name: `Trait ${(currentRubric?.traits.length || 0) + 1}`,
      description: '',
      kind: 'boolean'
    };
    addTrait(newTrait);
  };
  
  const handleTraitChange = (index: number, field: keyof RubricTrait, value: any) => {
    if (!currentRubric || index < 0 || index >= currentRubric.traits.length) return;
    
    const currentTrait = currentRubric.traits[index];
    const updatedTrait: RubricTrait = { ...currentTrait, [field]: value };
    
    // Set default min/max for score traits
    if (field === 'kind') {
      if (value === 'score') {
        updatedTrait.min_score = 1;
        updatedTrait.max_score = 5;
      } else {
        updatedTrait.min_score = undefined;
        updatedTrait.max_score = undefined;
      }
    }
    
    updateTrait(index, updatedTrait);
  };
  
  const handleSaveRubric = async () => {
    if (!currentRubric) return;
    
    // Validate rubric before saving
    if (currentRubric.traits.length === 0) {
      return;
    }
    
    await saveRubric();
  };
  
  if (!currentRubric) {
    return (
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
        <div className="text-center text-slate-500 dark:text-slate-400">
          Loading rubric editor...
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Rubric Trait Editor
        </h3>
      </div>
      
      {/* Traits List */}
      <div className="space-y-3 mb-4">
        {currentRubric.traits.map((trait, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600 p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="grid grid-cols-12 gap-4 items-start">
              {/* Trait Name */}
              <div className="col-span-3">
                <label htmlFor={`trait-name-${index}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trait Name
                </label>
                <input
                  id={`trait-name-${index}`}
                  type="text"
                  value={trait.name}
                  onChange={(e) => handleTraitChange(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                             hover:border-slate-400 dark:hover:border-slate-500"
                  placeholder="e.g., Clarity"
                  aria-label="Trait name"
                />
              </div>
              
              {/* Trait Kind Selector */}
              <div className="col-span-2">
                <label htmlFor={`trait-type-${index}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trait Type
                </label>
                <div className="relative">
                  <select
                    id={`trait-type-${index}`}
                    value={trait.kind}
                    onChange={(e) => handleTraitChange(index, 'kind', e.target.value as TraitKind)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8
                               hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                    aria-label="Trait type"
                  >
                    <option value="boolean">Binary</option>
                    <option value="score">Score</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {/* Score range inputs for score traits */}
                {trait.kind === 'score' && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Score Range
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        id={`min-score-${index}`}
                        type="number"
                        value={trait.min_score || 1}
                        onChange={(e) => handleTraitChange(index, 'min_score', parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                                   bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        min="1"
                        max="10"
                        aria-label="Minimum score"
                        title="Minimum score"
                      />
                      <span className="text-sm text-slate-500 font-medium">to</span>
                      <input
                        id={`max-score-${index}`}
                        type="number"
                        value={trait.max_score || 5}
                        onChange={(e) => handleTraitChange(index, 'max_score', parseInt(e.target.value) || 5)}
                        className="w-16 px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                                   bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                                   hover:border-slate-400 dark:hover:border-slate-500 transition-colors"
                        min="1"
                        max="10"
                        aria-label="Maximum score"
                        title="Maximum score"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              {/* Description */}
              <div className="col-span-6">
                <label htmlFor={`trait-description-${index}`} className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Trait Description
                </label>
                <input
                  id={`trait-description-${index}`}
                  type="text"
                  value={trait.description || ''}
                  onChange={(e) => handleTraitChange(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors
                             hover:border-slate-400 dark:hover:border-slate-500"
                  placeholder="What should be evaluated for this trait?"
                  aria-label="Trait description"
                />
              </div>
              
              {/* Delete Button */}
              <div className="col-span-1 flex justify-end mt-6">
                <button
                  onClick={() => removeTrait(index)}
                  className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300
                             hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete trait"
                  aria-label={`Delete ${trait.name} trait`}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add Trait Button */}
        <button
          onClick={handleAddTrait}
          className="flex items-center justify-center w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 
                     rounded-lg text-slate-600 dark:text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 
                     hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add trait
        </button>
      </div>
      
      {/* Error Display */}
      {lastError && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{lastError}</p>
              <button
                onClick={clearError}
                className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={handleSaveRubric}
          disabled={isSavingRubric || currentRubric.traits.length === 0}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md hover:bg-slate-900 dark:hover:bg-slate-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSavingRubric ? 'Saving...' : 'Set Traits'}
        </button>
      </div>
      
      {/* Rubric Summary */}
      {currentRubric.traits.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center">
            <svg className="w-4 h-4 mr-2 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Rubric Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Total Traits:</span>
              <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{currentRubric.traits.length}</span>
            </div>
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Types:</span>
              <div className="ml-2 flex space-x-3">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{currentRubric.traits.filter(t => t.kind === 'boolean').length}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">binary</span>
                </span>
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{currentRubric.traits.filter(t => t.kind === 'score').length}</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-1">score</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}