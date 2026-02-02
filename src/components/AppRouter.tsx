import React from 'react';
import { TabValue } from './TabNavigation';
import { TemplateGenerationTab } from './TemplateGenerationTab';
import { BenchmarkTab } from './BenchmarkTab';
import { DocsTab } from './DocsTab';
import { ConfigurationModal } from './ConfigurationModal';
import { Checkpoint, QuestionData, VerificationResult } from '../types';

export interface AppRouterProps {
  activeTab: TabValue;
  onTabSwitch: (tab: TabValue) => void;
  onTemplatesGenerated: (data: QuestionData) => void;
  // Benchmark tab props
  checkpoint: Checkpoint;
  benchmarkResults: Record<string, VerificationResult>;
  onSetBenchmarkResults: (results: Record<string, VerificationResult>) => void;
  // Config modal props
  isConfigModalOpen: boolean;
  configModalInitialTab: string;
  onCloseConfigModal: () => void;
  // Children for curator tab (rendered inline in App.tsx)
  children?: React.ReactNode;
}

export function AppRouter({
  activeTab,
  onTabSwitch,
  onTemplatesGenerated,
  checkpoint,
  benchmarkResults,
  onSetBenchmarkResults,
  isConfigModalOpen,
  configModalInitialTab,
  onCloseConfigModal,
  children,
}: AppRouterProps) {
  return (
    <>
      {/* Tab Content */}
      {/* Template Generation Tab - Combines Question Extraction and Template Generation */}
      {activeTab === 'generator' && (
        <TemplateGenerationTab
          onTemplatesGenerated={onTemplatesGenerated}
          onSwitchToCurator={() => onTabSwitch('curator')}
        />
      )}

      {/* Template Curator Tab - rendered inline for now */}
      {activeTab === 'curator' && children}

      {/* Benchmark Tab */}
      {activeTab === 'benchmark' && (
        <BenchmarkTab
          checkpoint={checkpoint}
          benchmarkResults={benchmarkResults}
          setBenchmarkResults={onSetBenchmarkResults}
        />
      )}

      {/* Docs Tab */}
      {activeTab === 'docs' && <DocsTab />}

      {/* Configuration Modal */}
      <ConfigurationModal isOpen={isConfigModalOpen} onClose={onCloseConfigModal} initialTab={configModalInitialTab} />
    </>
  );
}
