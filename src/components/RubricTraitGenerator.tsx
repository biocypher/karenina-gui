import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRubricStore } from '../stores/useRubricStore';
import { QuestionData, RubricTrait } from '../types';

interface RubricTraitGeneratorProps {
  questions: QuestionData;
  onTraitsGenerated?: (traits: RubricTrait[]) => void;
}

export default function RubricTraitGenerator({ questions, onTraitsGenerated }: RubricTraitGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [userSuggestions, setUserSuggestions] = useState('');
  
  const {
    generatedSuggestions,
    isGeneratingTraits,
    lastError,
    generateTraits,
    clearError,
    applyGeneratedTraits
  } = useRubricStore();
  
  const questionIds = Object.keys(questions);
  const hasQuestions = questionIds.length > 0;
  
  // Initialize with all questions selected by default
  useEffect(() => {
    if (hasQuestions && selectedQuestions.size === 0) {
      setSelectedQuestions(new Set(questionIds));
    }
  }, [questionIds, hasQuestions, selectedQuestions.size]);
  
  const handleSelectAll = () => {
    setSelectedQuestions(new Set(questionIds));
  };
  
  const handleSelectNone = () => {
    setSelectedQuestions(new Set());
  };
  
  const handleQuestionToggle = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };
  
  const handleGenerateTraits = async () => {
    if (selectedQuestions.size === 0) {
      return;
    }
    
    // Prepare selected questions data
    const selectedQuestionsData: QuestionData = {};
    Array.from(selectedQuestions).forEach(id => {
      if (questions[id]) {
        selectedQuestionsData[id] = questions[id];
      }
    });
    
    // Log selected questions data for verification
    console.log('Selected questions for trait generation:', {
      count: Object.keys(selectedQuestionsData).length,
      ids: Object.keys(selectedQuestionsData),
      sample: Object.entries(selectedQuestionsData).slice(0, 2).map(([id, q]) => ({
        id,
        question: q.question,
        answer: q.raw_answer
      }))
    });
    
    // Parse user suggestions
    const suggestions = userSuggestions
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    const request = {
      questions: selectedQuestionsData,
      system_prompt: systemPrompt || undefined,
      user_suggestions: suggestions.length > 0 ? suggestions : undefined,
      model_provider: 'google_genai',
      model_name: 'gemini-2.0-flash',
      temperature: 0.1
    };
    
    console.log('Trait generation request:', {
      questionCount: Object.keys(request.questions).length,
      hasSystemPrompt: !!request.system_prompt,
      suggestionsCount: request.user_suggestions?.length || 0,
      model: `${request.model_provider}/${request.model_name}`
    });
    
    await generateTraits(request);
    
    if (onTraitsGenerated && generatedSuggestions.length > 0) {
      onTraitsGenerated(generatedSuggestions);
    }
  };
  
  const handleApplyTraits = () => {
    if (generatedSuggestions.length > 0) {
      applyGeneratedTraits(generatedSuggestions);
    }
  };
  
  const truncateText = (text: string, maxLength: number = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };
  
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center">
          {isExpanded ? (
            <ChevronDownIcon className="h-5 w-5 mr-2" />
          ) : (
            <ChevronRightIcon className="h-5 w-5 mr-2" />
          )}
          Rubric trait generator
        </h3>
      </button>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              System prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder=".... the system prompt here ...."
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400
                         placeholder-slate-400 dark:placeholder-slate-500"
              rows={3}
            />
          </div>
          
          {/* Question Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Context question - Answer pairs
              </label>
              <div className="flex space-x-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1 text-sm bg-slate-700 dark:bg-slate-600 text-white rounded hover:bg-slate-800 dark:hover:bg-slate-500"
                >
                  Select All
                </button>
                <button
                  onClick={handleSelectNone}
                  className="px-3 py-1 text-sm bg-slate-500 text-white rounded hover:bg-slate-600"
                >
                  Select None
                </button>
              </div>
            </div>
            
            <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner">
              <div className="max-h-64 overflow-y-auto">
                {hasQuestions ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.size === questionIds.length && questionIds.length > 0}
                            onChange={selectedQuestions.size === questionIds.length ? handleSelectNone : handleSelectAll}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Question</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Answer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {questionIds.map((questionId) => {
                        const question = questions[questionId];
                        return (
                          <tr key={questionId} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedQuestions.has(questionId)}
                                onChange={() => handleQuestionToggle(questionId)}
                                className="rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 dark:text-slate-100">
                              <div className="max-w-xs line-clamp-2" title={question?.question || questionId}>
                                {truncateText(question?.question || questionId)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                              <div className="max-w-xs line-clamp-1" title={question?.raw_answer || ''}>
                                {truncateText(question?.raw_answer || '', 50)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 font-mono">
                              {questionId.substring(0, 8)}...
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      No questions available. Generate answer templates first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* User Suggestions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              User suggested traits
            </label>
            <input
              type="text"
              value={userSuggestions}
              onChange={(e) => setUserSuggestions(e.target.value)}
              placeholder="clarity, conciseness, provides explanation, provides example, contains code"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400
                         placeholder-slate-400 dark:placeholder-slate-500"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Comma-separated list of trait suggestions
            </p>
          </div>
          
          {/* Error Display */}
          {lastError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
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
          
          {/* Generate Button */}
          <div className="flex justify-end">
            <button
              onClick={handleGenerateTraits}
              disabled={selectedQuestions.size === 0 || isGeneratingTraits}
              className="px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-md hover:bg-slate-900 dark:hover:bg-slate-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGeneratingTraits ? 'Generating traits...' : 'Generate traits'}
            </button>
          </div>
          
          {/* Generated Traits Preview */}
          {generatedSuggestions.length > 0 && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                  Generated Traits ({generatedSuggestions.length})
                </h4>
                <button
                  onClick={handleApplyTraits}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Apply Traits
                </button>
              </div>
              <div className="space-y-1">
                {generatedSuggestions.map((trait, index) => (
                  <div key={index} className="text-sm text-green-700 dark:text-green-300">
                    <span className="font-medium">{trait.name}</span>
                    <span className="text-green-600 dark:text-green-400 ml-2">({trait.kind})</span>
                    {trait.description && (
                      <span className="text-green-600 dark:text-green-400 ml-2">- {trait.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}