import React, { useState, useEffect, useRef, MutableRefObject } from 'react';
import {
  ChevronDown,
  Save,
  FileText,
  Clock,
  Database,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Filter,
  Search,
  Plus,
  Pencil,
} from 'lucide-react';
import { useDatasetStore } from '../stores/useDatasetStore';
import { useQuestionStore } from '../stores/useQuestionStore';
import { useRubricStore } from '../stores/useRubricStore';
import { CodeEditor, type CodeEditorRef } from './CodeEditor';
import { ExpandedEditor } from './ExpandedEditor';
import { StatusBadge } from './StatusBadge';
import { MetadataEditor } from './MetadataEditor';
import { FewShotExamplesEditor } from './FewShotExamplesEditor';
import { QuestionActionsPanel } from './QuestionActionsPanel';
import { AdeleClassificationPanel, AdeleBatchModal } from './adele';
import { FileManager } from './FileManager';
import { AddQuestionModal } from './AddQuestionModal';
import { QuestionContentEditor } from './QuestionContentEditor';
import QuestionRubricEditor from './QuestionRubricEditor';
import RubricTraitEditor from './RubricTraitEditor';
import { formatTimestamp } from '../utils/dataLoader';
import { logger } from '../utils/logger';
import { CheckpointItem, UnifiedCheckpoint } from '../types';
import type { ClassificationResult, AdeleClassificationMetadata } from '../types/adele';

export interface CuratorTabProps {
  codeEditorRef: MutableRefObject<CodeEditorRef | null>;
  onLoadCheckpoint: (checkpoint: UnifiedCheckpoint) => void;
  onResetAllData: () => void;
}

export function CuratorTab({ codeEditorRef, onLoadCheckpoint, onResetAllData }: CuratorTabProps) {
  // Dataset store
  const { metadata: datasetMetadata, isBenchmarkInitialized } = useDatasetStore();

  // Rubric store
  const { currentRubric } = useRubricStore();

  // Question store state
  const {
    questionData,
    checkpoint,
    selectedQuestionId,
    currentTemplate,
    loadCheckpoint,
    setCheckpoint,
    saveCurrentTemplate,
    toggleFinished,
    navigateToQuestion,
    addNewQuestion,
    getQuestionIds,
    getSelectedQuestion,
    getCheckpointItem,
    getIsModified,
    getOriginalCode,
    getSavedCode,
    setCurrentTemplate,
    setSessionDraft,
    getAllQuestionsWithSessionDrafts,
    updateQuestionContent,
    deleteQuestion,
    cloneQuestion,
  } = useQuestionStore();

  // Local state
  const [isMetadataEditorOpen, setIsMetadataEditorOpen] = useState(false);
  const [isFewShotEditorOpen, setIsFewShotEditorOpen] = useState(false);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'finished' | 'unfinished'>('all');
  const [questionSearchTerm, setQuestionSearchTerm] = useState('');
  const [hasUnsavedFieldChanges, setHasUnsavedFieldChanges] = useState(false);
  const [isAddQuestionModalOpen, setIsAddQuestionModalOpen] = useState(false);
  const [isQuestionEditorOpen, setIsQuestionEditorOpen] = useState(false);
  const [isExpandedMode, setIsExpandedMode] = useState(false);
  const [isAdeleBatchModalOpen, setIsAdeleBatchModalOpen] = useState(false);

  // Scroll management
  const isNavigatingRef = useRef<boolean>(false);
  const savedScrollPositionRef = useRef<number>(0);

  // Check for unsaved field changes periodically
  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (codeEditorRef.current) {
        setHasUnsavedFieldChanges(codeEditorRef.current.hasUnsavedChanges());
      }
    }, 500);

    return () => clearInterval(checkInterval);
  }, [codeEditorRef]);

  // Auto-save current template to session drafts when it changes
  useEffect(() => {
    if (!selectedQuestionId || !currentTemplate) return;

    const checkpointTemplate = checkpoint[selectedQuestionId]?.answer_template;

    if (currentTemplate !== checkpointTemplate) {
      setSessionDraft(selectedQuestionId, currentTemplate);
      logger.debugLog('CURATOR', `Auto-saved session draft for question: ${selectedQuestionId}`, 'CuratorTab');
    }
  }, [currentTemplate, selectedQuestionId, checkpoint, setSessionDraft]);

  // Handle scroll restoration after navigation
  useEffect(() => {
    if (isNavigatingRef.current) {
      const originalScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = 'auto';

      const restoreScroll = () => {
        window.scrollTo(0, savedScrollPositionRef.current);
        document.documentElement.style.scrollBehavior = originalScrollBehavior;
        isNavigatingRef.current = false;
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(restoreScroll);
        });
      });
    }
  }, [selectedQuestionId]);

  const handleLoadCheckpoint = (loadedCheckpoint: UnifiedCheckpoint) => {
    loadCheckpoint(loadedCheckpoint);
    onLoadCheckpoint(loadedCheckpoint);
  };

  const handleNavigateToQuestion = (questionId: string) => {
    if (codeEditorRef.current) {
      logger.debugLog('CURATOR', 'Auto-saving any pending fields before navigation...', 'CuratorTab');
      codeEditorRef.current.saveAllUnsavedFields();

      setTimeout(() => {
        performNavigation(questionId);
      }, 400);
    } else {
      performNavigation(questionId);
    }
  };

  const performNavigation = (questionId: string) => {
    savedScrollPositionRef.current = window.scrollY || document.documentElement.scrollTop;
    isNavigatingRef.current = true;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollPositionRef.current}px`;
    document.body.style.width = '100%';

    navigateToQuestion(questionId);

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
    logger.debugLog('CURATOR', 'Save button clicked', 'CuratorTab');

    if (codeEditorRef.current) {
      logger.debugLog('CURATOR', 'Saving unsaved fields from code editor...', 'CuratorTab');
      codeEditorRef.current.saveAllUnsavedFields();
    }

    logger.debugLog('CURATOR', 'Calling saveCurrentTemplate...', 'CuratorTab');
    saveCurrentTemplate();
    logger.debugLog('CURATOR', 'handleSave completed', 'CuratorTab');
  };

  const handleToggleFinished = () => {
    toggleFinished();
  };

  // Navigation functions using store getters with filtering
  const allQuestionIds = getQuestionIds();
  const questionIds = allQuestionIds.filter((id) => {
    if (questionSearchTerm.trim()) {
      const searchLower = questionSearchTerm.toLowerCase();
      const question = questionData[id];
      if (!question) return false;

      const matchesSearch =
        question.question.toLowerCase().includes(searchLower) ||
        question.raw_answer.toLowerCase().includes(searchLower) ||
        id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;
    }

    if (questionFilter === 'all') return true;

    const checkpointItem = checkpoint[id];
    if (!checkpointItem) return questionFilter === 'unfinished';

    if (questionFilter === 'finished') return checkpointItem.finished;
    if (questionFilter === 'unfinished') return !checkpointItem.finished;

    return true;
  });

  const currentIndex = questionIds.indexOf(selectedQuestionId);

  // Auto-navigate when filter or search changes
  const prevFilterRef = useRef(questionFilter);
  const prevSearchRef = useRef(questionSearchTerm);

  useEffect(() => {
    const filterChanged = prevFilterRef.current !== questionFilter;
    const searchChanged = prevSearchRef.current !== questionSearchTerm;
    prevFilterRef.current = questionFilter;
    prevSearchRef.current = questionSearchTerm;

    if (filterChanged || searchChanged) {
      logger.debugLog('CURATOR', 'Filter/Search changed', 'CuratorTab', { questionFilter, questionSearchTerm });

      const allIds = Object.keys(questionData);
      const currentFilteredIds = allIds.filter((id) => {
        if (questionSearchTerm.trim()) {
          const searchLower = questionSearchTerm.toLowerCase();
          const question = questionData[id];
          if (!question) return false;

          const matchesSearch =
            question.question.toLowerCase().includes(searchLower) ||
            question.raw_answer.toLowerCase().includes(searchLower) ||
            id.toLowerCase().includes(searchLower);

          if (!matchesSearch) return false;
        }

        if (questionFilter === 'all') return true;

        const checkpointItem = checkpoint[id];
        if (!checkpointItem) return questionFilter === 'unfinished';

        if (questionFilter === 'finished') return checkpointItem.finished;
        if (questionFilter === 'unfinished') return !checkpointItem.finished;

        return true;
      });

      if (currentFilteredIds.length > 0) {
        logger.debugLog(
          'CURATOR',
          `Auto-navigating to first filtered/searched question: ${currentFilteredIds[0]}`,
          'CuratorTab'
        );
        navigateToQuestion(currentFilteredIds[0]);
      } else {
        logger.debugLog('CURATOR', 'No questions match filter/search, clearing selection', 'CuratorTab');
        navigateToQuestion('');
      }
    }
  }, [questionFilter, questionSearchTerm, questionData, checkpoint, navigateToQuestion]);

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

  const handleOpenFewShotEditor = () => {
    setIsFewShotEditorOpen(true);
  };

  const handleCloseFewShotEditor = () => {
    setIsFewShotEditorOpen(false);
  };

  const handleSaveFewShotExamples = (examples: Array<{ question: string; answer: string }>) => {
    if (selectedQuestionId) {
      const currentCheckpointItem = checkpoint[selectedQuestionId];
      if (currentCheckpointItem) {
        const updatedItem = {
          ...currentCheckpointItem,
          few_shot_examples: examples,
        };

        const updatedCheckpoint = {
          ...checkpoint,
          [selectedQuestionId]: updatedItem,
        };

        setCheckpoint(updatedCheckpoint);
      }
    }
  };

  const handleSaveMetadata = (questionId: string, updatedItem: CheckpointItem) => {
    const updatedCheckpoint = {
      ...checkpoint,
      [questionId]: updatedItem,
    };

    setCheckpoint(updatedCheckpoint);

    logger.debugLog('CURATOR', `Saved metadata for question: ${questionId}`, 'CuratorTab', {
      finished: updatedItem.finished,
      last_modified: updatedItem.last_modified,
    });
  };

  const handleAddNewQuestion = (
    question: string,
    rawAnswer: string,
    author?: string,
    keywords?: string[],
    generatedTemplate?: string
  ) => {
    const newQuestionId = addNewQuestion(question, rawAnswer, author, keywords, generatedTemplate);
    setIsAddQuestionModalOpen(false);
    console.log(
      `✅ Successfully added new question: ${newQuestionId}${generatedTemplate ? ' with LLM-generated template' : ''}`
    );
  };

  const handleOpenQuestionEditor = () => {
    setIsQuestionEditorOpen(true);
  };

  const handleSaveQuestionContent = (questionId: string, question: string, rawAnswer: string) => {
    updateQuestionContent(questionId, question, rawAnswer);
    setIsQuestionEditorOpen(false);
  };

  const handleDeleteQuestion = () => {
    if (!selectedQuestionId) return;
    const questionText = selectedQuestion?.question?.slice(0, 50) || 'this question';
    const confirmed = window.confirm(
      `Are you sure you want to delete "${questionText}..."?\n\nThis action cannot be undone.`
    );
    if (confirmed) {
      deleteQuestion(selectedQuestionId);
    }
  };

  const handleCloneQuestion = () => {
    if (!selectedQuestionId) return;
    const questionText = selectedQuestion?.question?.slice(0, 50) || 'this question';
    const confirmed = window.confirm(
      `Clone "${questionText}..."?\n\nThis will create a duplicate with [CLONED] prefix.`
    );
    if (confirmed) {
      const newId = cloneQuestion(selectedQuestionId);
      logger.debugLog('CURATOR', `Cloned question to: ${newId}`, 'CuratorTab');
    }
  };

  // Handle ADeLe classification update for a single question
  const handleAdeleClassificationUpdate = (questionId: string, classification: ClassificationResult) => {
    const currentCheckpointItem = checkpoint[questionId];
    if (!currentCheckpointItem) return;

    const adeleMetadata: AdeleClassificationMetadata = {
      scores: classification.scores,
      labels: classification.labels,
      model: classification.model,
      classifiedAt: classification.classifiedAt,
    };

    const updatedItem: CheckpointItem = {
      ...currentCheckpointItem,
      custom_metadata: {
        ...currentCheckpointItem.custom_metadata,
        adele_classification: JSON.stringify(adeleMetadata),
      },
    };

    const updatedCheckpoint = {
      ...checkpoint,
      [questionId]: updatedItem,
    };

    setCheckpoint(updatedCheckpoint);
    logger.debugLog('CURATOR', `Updated ADeLe classification for question: ${questionId}`, 'CuratorTab', {
      traitsClassified: Object.keys(classification.scores).length,
    });
  };

  // Handle ADeLe batch classification completion
  const handleAdeleBatchComplete = (results: Map<string, ClassificationResult>) => {
    let updatedCheckpoint = { ...checkpoint };

    results.forEach((classification, questionId) => {
      const currentCheckpointItem = updatedCheckpoint[questionId];
      if (!currentCheckpointItem) return;

      const adeleMetadata: AdeleClassificationMetadata = {
        scores: classification.scores,
        labels: classification.labels,
        model: classification.model,
        classifiedAt: classification.classifiedAt,
      };

      updatedCheckpoint = {
        ...updatedCheckpoint,
        [questionId]: {
          ...currentCheckpointItem,
          custom_metadata: {
            ...currentCheckpointItem.custom_metadata,
            adele_classification: JSON.stringify(adeleMetadata),
          },
        },
      };
    });

    setCheckpoint(updatedCheckpoint);
    logger.debugLog('CURATOR', `Batch ADeLe classification complete`, 'CuratorTab', {
      questionsClassified: results.size,
    });
  };

  // Use store getters for computed values
  const selectedQuestion = getSelectedQuestion();
  const checkpointItem = getCheckpointItem();
  const isModified = getIsModified();
  const originalCode = getOriginalCode();
  const savedCode = getSavedCode();

  return (
    <>
      {/* Dataset Info Display */}
      {datasetMetadata.name && (
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-xl border border-blue-200 dark:border-blue-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-1">📊 {datasetMetadata.name}</h4>
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
        <FileManager onLoadCheckpoint={handleLoadCheckpoint} onResetAllData={onResetAllData} checkpoint={checkpoint} />
      </div>

      {/* Control Panel */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6 mb-8">
        <div className="grid grid-cols-1 gap-6">
          {/* Search Bar and Add Question Button */}
          <div className="flex items-end gap-4">
            {/* Search Bar */}
            {allQuestionIds.length > 0 && (
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Search className="inline w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Search Questions
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by question, answer, or ID..."
                    value={questionSearchTerm}
                    onChange={(e) => setQuestionSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium shadow-sm"
                  />
                </div>
                {questionSearchTerm && (
                  <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {questionIds.length === 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">No questions match your search</span>
                    ) : (
                      <span>
                        Showing {questionIds.length} of {allQuestionIds.length} questions
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Add Question Button */}
            <div className={allQuestionIds.length > 0 ? '' : 'flex-1'}>
              {allQuestionIds.length > 0 && (
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 opacity-0 pointer-events-none">
                  Spacer
                </label>
              )}
              <button
                onClick={() => setIsAddQuestionModalOpen(true)}
                disabled={!isBenchmarkInitialized}
                title={
                  !isBenchmarkInitialized
                    ? 'Please load a checkpoint or create a new benchmark before adding questions'
                    : 'Add a new question manually'
                }
                className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-700 dark:to-teal-700 dark:hover:from-emerald-800 dark:hover:to-teal-800 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-600 dark:disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
          </div>

          {/* Question Selection Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Question Dropdown */}
            <div className="lg:col-span-2">
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
                      ? allQuestionIds.length === 0
                        ? 'No questions available - upload data first'
                        : questionSearchTerm
                          ? 'No questions match your search'
                          : 'No questions match the current filter'
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

            {/* Filter Dropdown */}
            {Object.keys(checkpoint).length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  <Filter className="inline w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                  Filter
                </label>
                <div className="relative">
                  <select
                    value={questionFilter}
                    onChange={(e) => setQuestionFilter(e.target.value as 'all' | 'finished' | 'unfinished')}
                    className="block w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm transition-all duration-200 text-slate-900 dark:text-slate-100 font-medium shadow-sm"
                  >
                    <option value="all">Show All</option>
                    <option value="finished">Finished Only</option>
                    <option value="unfinished">Unfinished Only</option>
                  </select>
                  <Filter className="absolute right-3 top-3.5 h-5 w-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>
            )}
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
                <button
                  onClick={handleOpenQuestionEditor}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                  title="Edit question and answer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
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
                <button
                  onClick={handleOpenQuestionEditor}
                  className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400 transition-colors"
                  title="Edit question and answer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </h3>
              <div className="bg-slate-50/80 dark:bg-slate-700/80 backdrop-blur-sm rounded-xl p-4 border border-slate-100 dark:border-slate-600 shadow-inner">
                <p
                  key={`answer-${selectedQuestionId}-${selectedQuestion.raw_answer?.length || 0}`}
                  className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium"
                >
                  {selectedQuestion.raw_answer}
                </p>
              </div>
            </div>

            {/* Status and Metadata */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Status & Metadata</h3>
                <StatusBadge
                  finished={checkpointItem?.finished || false}
                  modified={isModified || false}
                  fewShotExamplesCount={checkpointItem?.few_shot_examples?.length || 0}
                  onToggleFinished={handleToggleFinished}
                  onEditMetadata={handleOpenMetadataEditor}
                  onEditFewShotExamples={handleOpenFewShotEditor}
                />
              </div>

              {checkpointItem?.last_modified && (
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mt-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg p-3">
                  <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-medium">Last modified: {formatTimestamp(checkpointItem.last_modified)}</span>
                </div>
              )}

              {/* Unsaved Changes Indicator */}
              {(() => {
                const questionsWithDrafts = getAllQuestionsWithSessionDrafts();
                if (questionsWithDrafts.length === 0) return null;

                const questionNumbers = questionsWithDrafts
                  .map((qId) => {
                    const index = allQuestionIds.indexOf(qId);
                    return index >= 0 ? index + 1 : null;
                  })
                  .filter((num): num is number => num !== null)
                  .sort((a, b) => a - b);

                return (
                  <div className="flex flex-col gap-2 text-sm text-amber-700 dark:text-amber-400 mt-4 bg-amber-50/80 dark:bg-amber-900/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-700/50">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse" />
                      Unsaved session changes
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-500">
                      Question{questionNumbers.length > 1 ? 's' : ''} with unsaved changes:{' '}
                      <span className="font-semibold">{questionNumbers.join(', ')}</span>
                    </div>
                    <div className="text-xs text-amber-600 dark:text-amber-500">
                      (Click Save to persist permanently)
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Question Actions Panel */}
            <QuestionActionsPanel
              onDelete={handleDeleteQuestion}
              onClone={handleCloneQuestion}
              disabled={!selectedQuestionId}
            />

            {/* ADeLe Classification Panel */}
            {selectedQuestionId && selectedQuestion && (
              <AdeleClassificationPanel
                questionId={selectedQuestionId}
                questionText={selectedQuestion.question}
                customMetadata={checkpointItem?.custom_metadata as Record<string, unknown> | undefined}
                onClassificationUpdate={handleAdeleClassificationUpdate}
                disabled={!selectedQuestionId}
                onOpenBatchModal={() => setIsAdeleBatchModalOpen(true)}
                totalQuestionCount={allQuestionIds.length}
              />
            )}
          </div>

          {/* Right Column - Answer Template Editor (2/3 width) */}
          <div className="xl:col-span-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Answer Template</h3>
                {getAllQuestionsWithSessionDrafts().length > 0 && (
                  <span className="px-2.5 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full border border-amber-300 dark:border-amber-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse" />
                    Unsaved changes
                  </span>
                )}
              </div>
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
                  className="px-5 py-2.5 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 relative"
                >
                  <Save className="w-4 h-4" />
                  Save
                  {hasUnsavedFieldChanges && (
                    <span
                      className="absolute -top-1 -right-1 h-3 w-3 bg-amber-500 dark:bg-amber-400 rounded-full animate-pulse"
                      title="Unsaved field changes"
                    ></span>
                  )}
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
                ref={codeEditorRef}
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
                <strong>Tip:</strong> Edit the Pydantic class above to match the expected answer format. Use proper
                Python syntax with type hints and Field descriptions. Click "Form Editor" for a visual interface or
                "Show Diff" to compare changes.
              </p>
            </div>

            {/* Question Rubric Editor */}
            <div className="mt-8">
              <QuestionRubricEditor questionId={selectedQuestionId} />
            </div>
          </div>
        </div>
      )}

      {!selectedQuestion && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-12 text-center">
          <FileText className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {allQuestionIds.length === 0
              ? 'No Questions with Generated Templates'
              : questionIds.length === 0
                ? `No ${questionFilter === 'finished' ? 'Finished' : questionFilter === 'unfinished' ? 'Unfinished' : ''} Questions Available`
                : 'No Question Selected'}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 font-medium mb-4">
            {allQuestionIds.length === 0
              ? Object.keys(checkpoint).length > 0
                ? 'You have loaded a checkpoint, but no question data is available. To restore your previous session, please upload the corresponding Question Data JSON file using the File Management section above.'
                : 'The Template Curator works with questions that have generated answer templates. To get started: 1) Go to Template Generation tab, 2) Extract questions and generate templates, 3) Use "Add to Curation" to load them here.'
              : questionIds.length === 0
                ? `You have ${allQuestionIds.length} question${allQuestionIds.length === 1 ? '' : 's'} available, but none match the current "${questionFilter === 'finished' ? 'Finished Only' : questionFilter === 'unfinished' ? 'Unfinished Only' : 'Show All'}" filter. Try changing the filter to see more questions.`
                : 'Please select a question from the dropdown above to begin curating answer templates.'}
          </p>
        </div>
      )}

      {/* Global Rubric Management Section */}
      {(Object.keys(questionData).length > 0 || currentRubric) && (
        <div className="mt-8 space-y-8">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-800 via-purple-900 to-indigo-900 dark:from-slate-200 dark:via-purple-300 dark:to-indigo-300 bg-clip-text text-transparent mb-2">
              Global Rubric Management
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm max-w-3xl mx-auto">
              Create and manage global evaluation rubrics for benchmarking. These traits will be used across all
              questions.
            </p>
          </div>

          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 dark:border-slate-700/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manual Trait Editor</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              {currentRubric && currentRubric.llm_traits && currentRubric.llm_traits.length > 0
                ? `Editing ${currentRubric.llm_traits.length + (currentRubric.regex_traits?.length || 0) + (currentRubric.callable_traits?.length || 0)} global rubric traits. These traits are available for evaluation across all questions in your benchmark suite.`
                : 'Manually create, edit, and organize global rubric traits. These traits will be available for evaluation across all questions in your benchmark suite.'}
            </p>
            <RubricTraitEditor />
          </div>
        </div>
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

      {/* Few-shot Examples Editor Modal */}
      {selectedQuestion && checkpointItem && (
        <FewShotExamplesEditor
          isOpen={isFewShotEditorOpen}
          examples={checkpointItem.few_shot_examples || []}
          onSave={handleSaveFewShotExamples}
          onClose={handleCloseFewShotEditor}
        />
      )}

      {/* Question Content Editor Modal */}
      {selectedQuestion && (
        <QuestionContentEditor
          isOpen={isQuestionEditorOpen}
          onClose={() => setIsQuestionEditorOpen(false)}
          questionId={selectedQuestionId}
          currentQuestion={selectedQuestion.question}
          currentAnswer={selectedQuestion.raw_answer}
          onSave={handleSaveQuestionContent}
        />
      )}

      {/* Add Question Modal */}
      <AddQuestionModal
        isOpen={isAddQuestionModalOpen}
        onClose={() => setIsAddQuestionModalOpen(false)}
        onAdd={handleAddNewQuestion}
      />

      {/* ADeLe Batch Classification Modal */}
      <AdeleBatchModal
        isOpen={isAdeleBatchModalOpen}
        onClose={() => setIsAdeleBatchModalOpen(false)}
        questions={allQuestionIds.map((qId) => ({
          questionId: qId,
          questionText: questionData[qId]?.question || '',
        }))}
        onClassificationsComplete={handleAdeleBatchComplete}
      />

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
          questionFilter={questionFilter}
          codeEditorRef={codeEditorRef}
          hasUnsavedFieldChanges={hasUnsavedFieldChanges}
          onFilterChange={setQuestionFilter}
          hasCheckpointData={Object.keys(checkpoint).length > 0}
          getAllQuestionsWithSessionDrafts={getAllQuestionsWithSessionDrafts}
          allQuestionIds={allQuestionIds}
        />
      )}
    </>
  );
}
