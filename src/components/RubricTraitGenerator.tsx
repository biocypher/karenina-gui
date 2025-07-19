import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Search, Check, Square, Upload } from 'lucide-react';
import { useRubricStore } from '../stores/useRubricStore';
import { useConfigStore } from '../stores/useConfigStore';
import { QuestionData, RubricTrait } from '../types';
import { ModelSelector } from './ModelSelector';

interface RubricTraitGeneratorProps {
  questions: QuestionData;
  onTraitsGenerated?: (traits: RubricTrait[]) => void;
}

export default function RubricTraitGenerator({ questions, onTraitsGenerated }: RubricTraitGeneratorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [userSuggestions, setUserSuggestions] = useState('');
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // File upload state (session-only, no persistence)
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configuration store - use saved values (not working draft values)
  const { savedInterface, savedProvider, savedModel } = useConfigStore();

  const {
    generatedSuggestions,
    isGeneratingTraits,
    lastError,
    config,
    generateTraits,
    clearError,
    applyGeneratedTraits,
    setConfig,
  } = useRubricStore();

  // Initialize config with saved defaults from configuration store
  useEffect(() => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      interface: savedInterface,
      model_provider: savedProvider,
      model_name: savedModel,
    }));
  }, [savedInterface, savedProvider, savedModel, setConfig]);

  const questionIds = Object.keys(questions);
  const hasQuestions = questionIds.length > 0;

  // Filter questions based on search term
  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;

    const searchLower = searchTerm.toLowerCase();
    const filtered: QuestionData = {};

    Object.entries(questions).forEach(([id, question]) => {
      if (
        question.question.toLowerCase().includes(searchLower) ||
        question.raw_answer.toLowerCase().includes(searchLower) ||
        id.toLowerCase().includes(searchLower)
      ) {
        filtered[id] = question;
      }
    });

    return filtered;
  }, [questions, searchTerm]);

  const filteredQuestionIds = Object.keys(filteredQuestions);
  const totalQuestions = Object.keys(questions).length;
  const selectedCount = selectedQuestions.size;

  // Load default system prompt
  useEffect(() => {
    const loadDefaultPrompt = async () => {
      try {
        setIsLoadingPrompt(true);
        const response = await fetch('/api/rubric/default-system-prompt');
        if (response.ok) {
          const data = await response.json();
          const prompt = data.prompt;
          setDefaultSystemPrompt(prompt);
          setSystemPrompt(prompt); // Set as initial value
        } else {
          console.error('Failed to load default system prompt');
          setDefaultSystemPrompt('');
        }
      } catch (error) {
        console.error('Error loading default system prompt:', error);
        setDefaultSystemPrompt('');
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    loadDefaultPrompt();
  }, []);

  // Initialize with all questions selected by default (only on first load)
  useEffect(() => {
    if (hasQuestions && selectedQuestions.size === 0 && !hasUserInteracted) {
      setSelectedQuestions(new Set(questionIds));
    }
  }, [questionIds, hasQuestions, selectedQuestions.size, hasUserInteracted]);

  const handleSelectAll = () => {
    setHasUserInteracted(true);
    const newSelected = new Set(selectedQuestions);
    filteredQuestionIds.forEach((id) => newSelected.add(id));
    setSelectedQuestions(newSelected);
  };

  const handleSelectNone = () => {
    setHasUserInteracted(true);
    const newSelected = new Set(selectedQuestions);
    filteredQuestionIds.forEach((id) => newSelected.delete(id));
    setSelectedQuestions(newSelected);
  };

  const handleSelectAllQuestions = () => {
    setHasUserInteracted(true);
    setSelectedQuestions(new Set(questionIds));
  };

  const handleSelectNoQuestions = () => {
    setHasUserInteracted(true);
    setSelectedQuestions(new Set());
  };

  const handleQuestionToggle = (questionId: string) => {
    setHasUserInteracted(true);
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
    Array.from(selectedQuestions).forEach((id) => {
      if (questions[id]) {
        selectedQuestionsData[id] = questions[id];
      }
    });

    // Log selected questions data for verification
    console.log('Selected questions for trait generation:', {
      count: Object.keys(selectedQuestionsData).length,
      ids: Object.keys(selectedQuestionsData),
      sample: Object.entries(selectedQuestionsData)
        .slice(0, 2)
        .map(([id, q]) => ({
          id,
          question: q.question,
          answer: q.raw_answer,
        })),
    });

    // Parse user suggestions
    const suggestions = userSuggestions
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const request = {
      questions: selectedQuestionsData,
      system_prompt: systemPrompt || undefined,
      user_suggestions: suggestions.length > 0 ? suggestions : undefined,
      config,
    };

    console.log('Trait generation request:', {
      questionCount: Object.keys(request.questions).length,
      hasSystemPrompt: !!request.system_prompt,
      suggestionsCount: request.user_suggestions?.length || 0,
      config: request.config,
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.txt') && !file.name.endsWith('.md') && file.type !== 'text/plain') {
      alert('Please upload a text file (.txt or .md)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setSystemPrompt(content);
      }
    };
    reader.readAsText(file);

    // Clear the input so the same file can be uploaded again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const truncateText = (text: string, maxLength: number = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 p-4 mb-4">
      {/* Header */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center justify-between w-full text-left">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 flex items-center">
          {isExpanded ? <ChevronDownIcon className="h-5 w-5 mr-2" /> : <ChevronRightIcon className="h-5 w-5 mr-2" />}
          Rubric Trait Generator
        </h3>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">System prompt</label>
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md"
                  onChange={handleFileUpload}
                  disabled={isGeneratingTraits}
                  className="hidden"
                  id="prompt-upload"
                />
                <label
                  htmlFor="prompt-upload"
                  className={`px-2 py-1 text-xs text-white rounded transition-colors ${
                    isGeneratingTraits
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-50'
                      : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-400 cursor-pointer'
                  }`}
                  title="Upload system prompt from file"
                >
                  <Upload className="w-3 h-3 inline mr-1" />
                  Upload
                </label>
                <button
                  onClick={() => setSystemPrompt(defaultSystemPrompt)}
                  disabled={!defaultSystemPrompt || isLoadingPrompt}
                  className="px-2 py-1 text-xs bg-slate-600 dark:bg-slate-500 text-white rounded hover:bg-slate-700 dark:hover:bg-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Reset to default system prompt"
                >
                  {isLoadingPrompt ? 'Loading...' : 'Reset to Default'}
                </button>
              </div>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder={
                isLoadingPrompt
                  ? 'Loading default system prompt...'
                  : 'Enter custom system prompt or use the default...'
              }
              disabled={isLoadingPrompt}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md 
                         bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400
                         placeholder-slate-400 dark:placeholder-slate-500
                         disabled:opacity-50 disabled:cursor-not-allowed"
              rows={8}
            />
          </div>

          {/* Model Configuration */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Model Configuration
            </label>
            <ModelSelector config={config} onConfigChange={setConfig} disabled={isGeneratingTraits} />
          </div>

          {/* Question Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Context question - Answer pairs
              </label>
              <div className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 py-1 rounded-lg">
                {selectedCount} of {totalQuestions} selected
              </div>
            </div>

            {/* Search and Selection Controls */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search questions, answers, or IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllQuestions}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Check className="w-4 h-4" />
                  Select All ({totalQuestions})
                </button>
                <button
                  onClick={handleSelectNoQuestions}
                  className="px-4 py-2 bg-slate-600 dark:bg-slate-500 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-400 transition-colors flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Square className="w-4 h-4" />
                  Select None
                </button>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-600 rounded-xl overflow-hidden shadow-inner">
              <div className="max-h-80 overflow-y-auto">
                {hasQuestions ? (
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700 sticky top-0">
                      <tr>
                        <th className="w-12 px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              filteredQuestionIds.length > 0 &&
                              filteredQuestionIds.every((id) => selectedQuestions.has(id))
                            }
                            onChange={() => {
                              setHasUserInteracted(true);
                              if (filteredQuestionIds.every((id) => selectedQuestions.has(id))) {
                                handleSelectNone();
                              } else {
                                handleSelectAll();
                              }
                            }}
                            className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                          Question
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                          Answer
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">
                          ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                      {Object.entries(filteredQuestions).map(([questionId, question]) => {
                        return (
                          <tr key={questionId} className="hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedQuestions.has(questionId)}
                                onChange={() => handleQuestionToggle(questionId)}
                                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 dark:focus:ring-indigo-400"
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

            {/* No search results message */}
            {Object.keys(filteredQuestions).length === 0 && searchTerm.trim() && (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No questions match your search criteria.</p>
              </div>
            )}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comma-separated list of trait suggestions</p>
          </div>

          {/* Error Display */}
          {lastError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
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
                  <p className="text-sm text-red-800 dark:text-red-200">{lastError}</p>
                  <button onClick={clearError} className="text-xs text-red-600 dark:text-red-400 hover:underline mt-1">
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
