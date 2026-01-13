import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from './stores/useAppStore';
import { useQuestionStore } from './stores/useQuestionStore';
import { useConfigStore } from './stores/useConfigStore';
import { useConfigModalStore } from './stores/useConfigModalStore';
import { useDatasetStore } from './stores/useDatasetStore';
import { QuestionData, VerificationResult } from './types';
import type { CodeEditorRef } from './components/CodeEditor';
import { AppLayout } from './components/AppLayout';
import { AppHeader } from './components/AppHeader';
import { AppRouter } from './components/AppRouter';
import { TabNavigation, TabValue } from './components/TabNavigation';
import { CuratorTab } from './components/CuratorTab';
import { forceResetAllData } from './utils/dataLoader';
import { logger } from './utils/logger';
import { useTabManagement } from './hooks/useTabManagement';

function App() {
  // App store state
  const { isLoading, sessionId, setIsLoading, resetAppState } = useAppStore();

  // Configuration store
  const { loadConfiguration } = useConfigStore();

  // Dataset store
  const { resetBenchmarkState, markBenchmarkAsInitialized } = useDatasetStore();

  // Question store state
  const { checkpoint, loadQuestionData, resetQuestionState, getAllQuestionsWithSessionDrafts } = useQuestionStore();

  // Config modal store
  const {
    isOpen: isConfigModalOpen,
    initialTab: configModalInitialTab,
    openModal: openConfigModal,
    closeModal: closeConfigModal,
  } = useConfigModalStore();

  // Remaining local state - ephemeral data not managed by stores yet
  const [extractedQuestions, setExtractedQuestions] = useState<QuestionData>({});
  const [benchmarkResults, setBenchmarkResults] = useState<Record<string, VerificationResult>>({});

  // Scroll management
  const codeEditorRef = useRef<CodeEditorRef>(null);

  // Use custom hook for tab management
  const { activeTab, handleTabSwitch } = useTabManagement({ codeEditorRef });

  // Simple data loading effect - no clearing needed since state starts empty
  useEffect(() => {
    // State starts clean on every refresh - no clearing needed
    setIsLoading(false);
    logger.debugLog('APP', 'App: Fresh state initialized with session', 'App', { sessionId });
  }, [sessionId, setIsLoading]);

  // Load configuration defaults on app startup
  useEffect(() => {
    loadConfiguration().catch((error) => {
      logger.error('CONFIG', 'Failed to load configuration defaults', 'App', { error });
      // Notify user of configuration loading failure
      alert(
        'Warning: Failed to load application configuration. Default settings will be used. Please check your network connection and refresh if needed.'
      );
    });
  }, [loadConfiguration]);

  const handleLoadQuestionData = (data: QuestionData) => {
    // Delegate to the question store
    loadQuestionData(data);
  };

  const handleTemplatesGenerated = (combinedData: QuestionData) => {
    // The combinedData is already processed QuestionData with successfully generated templates
    // Just load it directly into the curator
    if (Object.keys(combinedData).length > 0) {
      // Load the combined data into the main question data for the curator
      handleLoadQuestionData(combinedData);

      // Mark benchmark as initialized so "Add Question" button becomes enabled
      markBenchmarkAsInitialized();

      logger.debugLog(
        'APP',
        `Loaded ${Object.keys(combinedData).length} questions with successfully generated templates into curator`,
        'App'
      );
    } else {
      logger.warning('APP', 'No successfully generated templates to load into curator', 'App');
    }
  };

  const handleLoadCheckpoint = () => {
    // Checkpoint loading is delegated to CuratorTab
    logger.debugLog('APP', 'Checkpoint load requested', 'App');
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
      resetBenchmarkState();

      logger.debugLog('APP', 'All data has been reset', 'App');
    }
  };

  // Calculate unsaved count for tab indicator
  const unsavedCount = getAllQuestionsWithSessionDrafts().length;

  return (
    <AppLayout isLoading={isLoading}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <AppHeader
          sessionId={sessionId}
          questionDataCount={Object.keys(useQuestionStore.getState().questionData).length}
          checkpointCount={Object.keys(checkpoint).length}
          extractedQuestionsCount={Object.keys(extractedQuestions).length}
          onOpenConfig={openConfigModal}
        />

        {/* Tab Navigation */}
        <TabNavigation activeTab={activeTab as TabValue} onTabSwitch={handleTabSwitch} unsavedCount={unsavedCount} />

        {/* Tab Content Router */}
        <AppRouter
          activeTab={activeTab as TabValue}
          onTabSwitch={handleTabSwitch}
          onTemplatesGenerated={handleTemplatesGenerated}
          checkpoint={checkpoint}
          benchmarkResults={benchmarkResults}
          onSetBenchmarkResults={setBenchmarkResults}
          isConfigModalOpen={isConfigModalOpen}
          configModalInitialTab={configModalInitialTab}
          onCloseConfigModal={closeConfigModal}
        >
          {/* Curator Tab Content - rendered as children */}
          {activeTab === 'curator' && (
            <CuratorTab
              codeEditorRef={codeEditorRef}
              onLoadCheckpoint={handleLoadCheckpoint}
              onResetAllData={handleResetAllData}
            />
          )}
        </AppRouter>
      </div>
    </AppLayout>
  );
}

export default App;
