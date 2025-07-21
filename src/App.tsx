import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronDown,
  Save,
  FileText,
  Clock,
  Database,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Settings,
} from 'lucide-react';
import { useAppStore } from './stores/useAppStore';
import { useQuestionStore } from './stores/useQuestionStore';
import { useConfigStore } from './stores/useConfigStore';
import { useDatasetStore } from './stores/useDatasetStore';
import { QuestionData, UnifiedCheckpoint, VerificationResult, CheckpointItem } from './types';
import { CodeEditor } from './components/CodeEditor';
import { ExpandedEditor } from './components/ExpandedEditor';
import { StatusBadge } from './components/StatusBadge';
import { MetadataEditor } from './components/MetadataEditor';
import { FileManager } from './components/FileManager';
import { ChatInterface } from './components/ChatInterface';
import { QuestionExtractor } from './components/QuestionExtractor';
import { AnswerTemplateGenerator } from './components/AnswerTemplateGenerator';
import { BenchmarkTab } from './components/BenchmarkTab';
import { ThemeToggle } from './components/ThemeToggle';
import QuestionRubricEditor from './components/QuestionRubricEditor';
import { ConfigurationModal } from './components/ConfigurationModal';
import { formatTimestamp, forceResetAllData } from './utils/dataLoader';

// VerificationResult interface now imported from types

function App() {
  // App store state
  const { activeTab, isLoading, sessionId, setActiveTab, setIsLoading, resetAppState } = useAppStore();

  // Configuration store
  const { loadConfiguration } = useConfigStore();

  // Dataset store
  const { metadata: datasetMetadata } = useDatasetStore();

  // Question store state
  const {
    questionData,
    checkpoint,
    selectedQuestionId,
    currentTemplate,
    loadQuestionData,
    loadCheckpoint,
    setCheckpoint,
    saveCurrentTemplate,
    toggleFinished,
    navigateToQuestion,
    resetQuestionState,
    getQuestionIds,
    getCurrentIndex,
    getSelectedQuestion,
    getCheckpointItem,
    getIsModified,
    getOriginalCode,
    getSavedCode,
    setCurrentTemplate,
  } = useQuestionStore();

  // Remaining local state - ephemeral data not managed by stores yet
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionData>({});
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, VerificationResult>>({});
  const [isExpandedMode, setIsExpandedMode] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);

  // Scroll management
  const isNavigatingRef = useRef<boolean>(false);
  const savedScrollPositionRef = useRef<number>(0);

  // Simple data loading effect - no clearing needed since state starts empty
  useEffect(() => {
    // State starts clean on every refresh - no clearing needed
    setIsLoading(false);
    console.log('🚀 App: Fresh state initialized with session:', sessionId);
  }, [sessionId, setIsLoading]);

  // Load configuration defaults on app startup
  useEffect(() => {
    loadConfiguration().catch((error) => {
      console.error('Failed to load configuration defaults:', error);
      // Notify user of configuration loading failure
      alert(
        'Warning: Failed to load application configuration. Default settings will be used. Please check your network connection and refresh if needed.'
      );
    });
  }, [loadConfiguration]);

  // Template selection is now handled by the question store

  // Handle scroll restoration after navigation
  useEffect(() => {
    if (isNavigatingRef.current) {
      // Prevent any scrolling during the update
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';

      // Force immediate scroll restoration
      const restoreScroll = () => {
        window.scrollTo(0, savedScrollPositionRef.current);
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
        isNavigatingRef.current = false;
      };

      // Use multiple animation frames to ensure DOM is completely updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(restoreScroll);
        });
      });
    }
  }, [selectedQuestionId]);

  const handleLoadQuestionData = (data: QuestionData) => {
    // Delegate to the question store
    loadQuestionData(data);
  };

  const handleExtractedQuestions = (questions: QuestionData) => {
    setExtractedQuestions(questions);
    // Don't automatically load extracted questions into the curator
    // They only have placeholder templates, not actual generated ones
    // Users must use the Template Generator to create actual templates
    // and then use "Add to Curation" to load them into the curator
    console.log(
      `✅ Extracted ${Object.keys(questions).length} questions. Use Template Generator to create answer templates.`
    );
  };

  const handleTemplatesGenerated = (combinedData: QuestionData) => {
    // The combinedData is already processed QuestionData with successfully generated templates
    // Just load it directly into the curator
    if (Object.keys(combinedData).length > 0) {
      // Load the combined data into the main question data for the curator
      handleLoadQuestionData(combinedData);

      console.log(
        `✅ Loaded ${Object.keys(combinedData).length} questions with successfully generated templates into curator`
      );
    } else {
      console.warn('⚠️ No successfully generated templates to load into curator');
    }
  };

  const handleLoadCheckpoint = (loadedCheckpoint: UnifiedCheckpoint) => {
    // Delegate to the question store
    loadCheckpoint(loadedCheckpoint);
  };

  const handleResetAllData = () => {
    if (
      window.confirm('This will clear all data including extracted questions, templates, and progress. Are you sure?')
    ) {
      // Clear browser storage if any exists
      forceResetAllData();

      // Clear remaining local state
      setExtractedQuestions({});
      setBenchmarkResults({});

      // Reset stores
      resetQuestionState();
      resetAppState();

      console.log('🧹 All data has been reset');
    }
  };

  const handleNavigateToQuestion = (questionId: string) => {
    // Save current scroll position
    savedScrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    isNavigatingRef.current = true;

    // Immediately lock scroll position
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPositionRef.current}px`;
    document.body.style.width = '100%';

    // Use store navigation
    navigateToQuestion(questionId);

    // Restore scroll after a short delay
    setTimeout(() => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, savedScrollPositionRef.current);
      isNavigatingRef.current = false;
    }, 50);
  };

  const handleQuestionChange = (questionId: string) => {
    handleNavigateToQuestion(questionId);
  };

  const handleSave = () => {
    // Delegate to the question store
    saveCurrentTemplate();
  };

  const handleToggleFinished = () => {
    // Delegate to the question store
    toggleFinished();
  };

  // Navigation functions using store getters
  const questionIds = getQuestionIds();
  const currentIndex = getCurrentIndex();

  const handlePrevious = () => {
    if (currentIndex > 0) {
      handleNavigateToQuestion(questionIds[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questionIds.length - 1) {
      handleNavigateToQuestion(questionIds[currentIndex + 1]);
    }
  };

  const handleOpenMetadataEditor = () => {
    setIsMetadataEditorOpen(true);
  };

  const handleCloseMetadataEditor = () => {
    setIsMetadataEditorOpen(false);
  };

  const handleSaveMetadata = (questionId: string, updatedItem: CheckpointItem) => {
    // Update the checkpoint with the new metadata
    // Use direct checkpoint update to preserve all metadata
    const updatedCheckpoint = {
      ...checkpoint,
      [questionId]: updatedItem,
    };

    // Use direct checkpoint setter to avoid full data reload
    setCheckpoint(updatedCheckpoint);

    console.log('💾 Saved metadata for question:', questionId, {
      custom_metadata: updatedItem.custom_metadata,
      finished: updatedItem.finished,
      last_modified: updatedItem.last_modified,
    });
  };

  // Use store getters for computed values
  const selectedQuestion = getSelectedQuestion();
  const checkpointItem = getCheckpointItem();
  const isModified = getIsModified();
  const originalCode = getOriginalCode();
  const savedCode = getSavedCode();

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 
                      dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 
                      flex items-center justify-center"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading question data...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 
                    dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900"
    >
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <img
                  src="/favicon.svg"
                  alt="Karenina Logo"
                  className="w-16 h-16 transition-all duration-300 filter dark:invert dark:brightness-0 dark:contrast-100"
                />
              </div>
              <div>
                <h1
                  className="text-4xl font-bold bg-gradient-to-r from-slate-800 via-blue-900 to-indigo-900 
                             dark:from-slate-200 dark:via-blue-300 dark:to-indigo-300 
                             bg-clip-text text-transparent mb-2"
                >
                  Karenina
                </h1>
                <p className="text-slate-600 dark:text-slate-300 text-lg font-medium">
                  A tool for benchmarking LLMs through structured templates
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 
                         hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                title="Configuration"
              >
                <Settings className="h-5 w-5" />
              </button>
              <ThemeToggle />
            </div>
          </div>

          {/* Development Session Status - Only show in development */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <div className="text-xs text-yellow-800 dark:text-yellow-300">
                <strong>Dev Mode:</strong> Session ID: {sessionId.slice(-8)} | Data: {Object.keys(questionData).length}{' '}
                questions, {Object.keys(checkpoint).length} checkpoint items, {Object.keys(extractedQuestions).length}{' '}
                extracted
                <button
                  onClick={() => {
                    forceResetAllData();
                    window.location.reload();
                  }}
                  className="ml-2 px-2 py-1 bg-yellow-600 dark:bg-yellow-700 text-white rounded text-xs hover:bg-yellow-700 dark:hover:bg-yellow-600"
                >
                  Force Reset & Reload
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="mt-6 flex gap-1 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-1 border border-white/30 dark:border-slate-700/30 shadow-sm w-fit">
            <button
              onClick={() => setActiveTab('extractor')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'extractor'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              1. Question Extractor
            </button>
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'generator'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              2. Template Generator
            </button>
            <button
              onClick={() => setActiveTab('curator')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'curator'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              3. Template Curator
            </button>
            <button
              onClick={() => setActiveTab('benchmark')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'benchmark'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              4. Benchmark
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              5. LLM Chat
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {/* Question Extractor Tab - Now First */}
        {activeTab === 'extractor' && (
          <QuestionExtractor onQuestionsExtracted={handleExtractedQuestions} extractedQuestions={extractedQuestions} />
        )}

        {/* Template Generator Tab */}
        {activeTab === 'generator' && (
          <AnswerTemplateGenerator
            questions={extractedQuestions}
            onTemplatesGenerated={handleTemplatesGenerated}
            onSwitchToCurator={() => setActiveTab('curator')}
          />
        )}

        {/* Template Curator Tab */}
        {activeTab === 'curator' && (
          <>
            {/* Dataset Info Display */}
            {datasetMetadata.name && (
              <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-1">
                      📊 {datasetMetadata.name}
                    </h4>
                    {datasetMetadata.description && (
                      <p className="text-sm text-blue-700 dark:text-blue-400">{datasetMetadata.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
                      {datasetMetadata.version && <span>Version: {datasetMetadata.version}</span>}
                      {datasetMetadata.creator && <span>Creator: {datasetMetadata.creator.name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* File Management Section */}
            <div className="mb-8">
              <FileManager
                onLoadCheckpoint={handleLoadCheckpoint}
                onResetAllData={handleResetAllData}
                checkpoint={checkpoint}
              />
            </div>

            {/* Control Panel */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6 mb-8">
              <div className="grid grid-cols-1 gap-6">
                {/* Question Dropdown */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    <Database className="inline w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                    Select Question
                  </label>
                  <div className="relative">
                    <select
                      value={selectedQuestionId}
                      onChange={(e) => handleQuestionChange(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 font-medium shadow-sm"
                      disabled={questionIds.length === 0}
                    >
                      <option value="">
                        {questionIds.length === 0
                          ? 'No questions available - upload data first'
                          : 'Choose a question...'}
                      </option>
                      {questionIds.map((id, index) => (
                        <option key={id} value={id}>
                          {index + 1}. {questionData[id].question.substring(0, 60)}
                          {questionData[id].question.length > 60 ? '...' : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Navigation Buttons */}
                {questionIds.length > 0 && selectedQuestionId && (
                  <div className="flex items-center justify-between">
                    <button
                      onClick={handlePrevious}
                      disabled={currentIndex <= 0}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-700 dark:bg-slate-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>

                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm px-5 py-3 rounded-xl border border-white/40 dark:border-slate-600/40 shadow-sm">
                      <span className="font-semibold">
                        Question {currentIndex + 1} of {questionIds.length}
                      </span>
                    </div>

                    <button
                      onClick={handleNext}
                      disabled={currentIndex >= questionIds.length - 1}
                      className="flex items-center gap-2 px-5 py-3 bg-slate-700 dark:bg-slate-600 text-white rounded-xl hover:bg-slate-800 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selectedQuestion && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column - Question Data (1/3 width) */}
                <div className="space-y-6">
                  {/* Raw Question */}
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Raw Question
                    </h3>
                    <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {selectedQuestion.question}
                      </p>
                    </div>
                  </div>

                  {/* Raw Answer */}
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                      Raw Answer
                    </h3>
                    <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
                      <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {selectedQuestion.raw_answer}
                      </p>
                    </div>
                  </div>

                  {/* Status and Metadata */}
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                        Status & Metadata
                      </h3>
                      <StatusBadge
                        finished={checkpointItem?.finished || false}
                        modified={isModified || false}
                        onToggleFinished={handleToggleFinished}
                        onEditMetadata={handleOpenMetadataEditor}
                      />
                    </div>

                    {checkpointItem?.last_modified && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mt-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-3">
                        <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <span className="font-medium">
                          Last modified: {formatTimestamp(checkpointItem.last_modified)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Answer Template Editor (2/3 width) */}
                <div className="xl:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Answer Template</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={handleToggleFinished}
                        className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                          checkpointItem?.finished
                            ? 'bg-slate-600 dark:bg-slate-500 text-white hover:bg-slate-700 dark:hover:bg-slate-400'
                            : 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600'
                        }`}
                      >
                        {checkpointItem?.finished ? 'Mark as Unfinished' : 'Flag as Finished'}
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                      <button
                        onClick={() => setIsExpandedMode(true)}
                        className="px-5 py-2.5 bg-purple-600 dark:bg-purple-700 text-white rounded-xl hover:bg-purple-700 dark:hover:bg-purple-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        title="Open in full-screen editor"
                      >
                        <Maximize2 className="w-4 h-4" />
                        Expand
                      </button>
                    </div>
                  </div>

                  {/* Full-height editor */}
                  <div className="h-[600px]">
                    <CodeEditor
                      value={currentTemplate}
                      onChange={setCurrentTemplate}
                      onSave={handleSave}
                      originalCode={originalCode}
                      savedCode={savedCode}
                      enableFormEditor={true}
                    />
                  </div>

                  <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-xl border border-indigo-100 dark:border-indigo-800 shadow-inner">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium">
                      <strong>Tip:</strong> Edit the Pydantic class above to match the expected answer format. Use
                      proper Python syntax with type hints and Field descriptions. Click "Form Editor" for a visual
                      interface or "Show Diff" to compare changes.
                    </p>
                  </div>

                  {/* Question Rubric Editor */}
                  <div className="mt-8">
                    <QuestionRubricEditor questionId={selectedQuestionId} />
                  </div>
                </div>
              </div>
            )}

            {!selectedQuestion && !isLoading && (
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-12 text-center">
                <FileText className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {questionIds.length === 0 ? 'No Questions with Generated Templates' : 'No Question Selected'}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
                  {questionIds.length === 0
                    ? Object.keys(checkpoint).length > 0
                      ? 'You have loaded a checkpoint, but no question data is available. To restore your previous session, please upload the corresponding Question Data JSON file using the File Management section above.'
                      : 'The Template Curator works with questions that have generated answer templates. To get started: 1) Extract questions using the Question Extractor, 2) Generate templates using the Template Generator, 3) Use "Add to Curation" to load them here.'
                    : 'Please select a question from the dropdown above to begin curating answer templates.'}
                </p>
                {questionIds.length === 0 &&
                  Object.keys(checkpoint).length === 0 &&
                  Object.keys(extractedQuestions).length === 0 && (
                    <button
                      onClick={() => setActiveTab('extractor')}
                      className="px-6 py-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors font-medium mr-3"
                    >
                      1. Extract Questions
                    </button>
                  )}
                {questionIds.length === 0 &&
                  Object.keys(checkpoint).length === 0 &&
                  Object.keys(extractedQuestions).length > 0 && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                        <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
                          ✅ You have {Object.keys(extractedQuestions).length} extracted questions. Now generate answer
                          templates for them.
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('generator')}
                        className="px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-xl hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors font-medium"
                      >
                        2. Generate Templates
                      </button>
                    </div>
                  )}
                {questionIds.length === 0 && Object.keys(checkpoint).length > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                      💡 <strong>Checkpoint Loaded:</strong> You have {Object.keys(checkpoint).length} items in your
                      checkpoint. Upload the Question Data JSON file to continue working with your saved progress.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Metadata Editor Modal */}
        {selectedQuestion && checkpointItem && (
          <MetadataEditor
            isOpen={isMetadataEditorOpen}
            onClose={handleCloseMetadataEditor}
            checkpointItem={checkpointItem}
            questionId={selectedQuestionId}
            onSave={handleSaveMetadata}
          />
        )}

        {/* Benchmark Tab */}
        {activeTab === 'benchmark' && (
          <BenchmarkTab
            checkpoint={checkpoint}
            benchmarkResults={benchmarkResults}
            setBenchmarkResults={setBenchmarkResults}
          />
        )}

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="max-w-4xl mx-auto">
            <ChatInterface />
          </div>
        )}
      </div>

      {/* Expanded Editor Overlay */}
      {isExpandedMode && selectedQuestion && (
        <ExpandedEditor
          value={currentTemplate}
          onChange={setCurrentTemplate}
          originalCode={originalCode}
          savedCode={savedCode}
          selectedQuestion={selectedQuestion}
          questionIndex={currentIndex}
          totalQuestions={questionIds.length}
          onPrevious={handlePrevious}
          onNext={handleNext}
          canGoPrevious={currentIndex > 0}
          canGoNext={currentIndex < questionIds.length - 1}
          onClose={() => setIsExpandedMode(false)}
          onSave={handleSave}
          onToggleFinished={handleToggleFinished}
          isFinished={checkpointItem?.finished || false}
        />
      )}

      {/* Configuration Modal */}
      <ConfigurationModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} />
    </div>
  );
}

export default App;
