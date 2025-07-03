import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { RubricTrait, TraitKind } from '../types';

export default function RubricTraitEditor() {
  const {
    currentRubric,
    isSavingRubric,
    lastError,
    updateRubricTitle,
    addTrait,
    updateTrait,
    removeTrait,
    saveRubric,
    clearError,
    setCurrentRubric
  } = useRubricStore();
  
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Initialize with default rubric if none exists
  useEffect(() => {
    if (!currentRubric) {
      setCurrentRubric({
        title: 'New Rubric',
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
    if (!currentRubric.title.trim()) {
      return;
    }
    
    if (currentRubric.traits.length === 0) {
      return;
    }
    
    await saveRubric();
  };
  
  if (!currentRubric) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <div className="text-center text-slate-500 dark:text-slate-400">
          Loading rubric editor...
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
          Rubric Trait Editor
        </h3>
      </div>
      
      {/* Rubric Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Rubric Title
        </label>
        <input
          type="text"
          value={currentRubric.title}
          onChange={(e) => updateRubricTitle(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                     bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400"
          placeholder="Enter rubric title"
        />
      </div>
      
      {/* Traits List */}
      <div className="space-y-3 mb-4">
        {currentRubric.traits.map((trait, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* Trait Name */}
              <div className="col-span-3">
                <input
                  type="text"
                  value={trait.name}
                  onChange={(e) => handleTraitChange(index, 'name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Trait name"
                />
              </div>
              
              {/* Trait Kind Selector */}
              <div className="col-span-2">
                <div className="relative">
                  <select
                    value={trait.kind}
                    onChange={(e) => handleTraitChange(index, 'kind', e.target.value as TraitKind)}
                    className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded 
                               bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                               focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
                  >
                    <option value="boolean">Binary</option>
                    <option value="score">Score</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {/* Kind label indicator */}
                  <div className="absolute -top-2 left-1 bg-purple-100 dark:bg-purple-900 px-1 text-xs text-purple-600 dark:text-purple-300 rounded">
                    Label
                  </div>
                </div>
                
                {/* Score range inputs for score traits */}
                {trait.kind === 'score' && (
                  <div className="flex space-x-1 mt-1">
                    <input
                      type="number"
                      value={trait.min_score || 1}
                      onChange={(e) => handleTraitChange(index, 'min_score', parseInt(e.target.value) || 1)}
                      className="w-12 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded 
                                 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      min="1"
                      max="10"
                    />
                    <span className="text-xs text-slate-500 self-center">-</span>
                    <input
                      type="number"
                      value={trait.max_score || 5}
                      onChange={(e) => handleTraitChange(index, 'max_score', parseInt(e.target.value) || 5)}
                      className="w-12 px-1 py-0.5 text-xs border border-slate-300 dark:border-slate-600 rounded 
                                 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                      min="1"
                      max="10"
                    />
                  </div>
                )}
              </div>
              
              {/* Description */}
              <div className="col-span-6">
                <input
                  type="text"
                  value={trait.description || ''}
                  onChange={(e) => handleTraitChange(index, 'description', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded 
                             bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                             focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Field description..."
                />
              </div>
              
              {/* Delete Button */}
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removeTrait(index)}
                  className="p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  title="Delete trait"
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
          className="flex items-center justify-center w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 
                     rounded-lg text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 
                     hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
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
          disabled={isSavingRubric || !currentRubric.title.trim() || currentRubric.traits.length === 0}
          className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md hover:bg-slate-900 dark:hover:bg-slate-600 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSavingRubric ? 'Saving...' : 'Set Traits'}
        </button>
      </div>
      
      {/* Rubric Summary */}
      {currentRubric.traits.length > 0 && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Rubric Summary
          </h4>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            <p><strong>Title:</strong> {currentRubric.title}</p>
            <p><strong>Traits:</strong> {currentRubric.traits.length}</p>
            <div className="mt-1">
              <strong>Types:</strong>
              <span className="ml-2">
                {currentRubric.traits.filter(t => t.kind === 'boolean').length} boolean,
              </span>
              <span className="ml-1">
                {currentRubric.traits.filter(t => t.kind === 'score').length} score
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}