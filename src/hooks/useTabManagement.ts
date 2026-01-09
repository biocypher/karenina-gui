import { useCallback, MutableRefObject } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { CodeEditorRef } from '../components/CodeEditor';
import { logger } from '../utils/logger';

interface UseTabManagementProps {
  codeEditorRef: MutableRefObject<CodeEditorRef | null>;
}

export function useTabManagement({ codeEditorRef }: UseTabManagementProps) {
  const { activeTab, setActiveTab } = useAppStore();

  const handleTabSwitch = useCallback(
    (newTab: string) => {
      // Auto-save any pending field changes before switching tabs (only when leaving curator tab)
      if (activeTab === 'curator' && codeEditorRef.current) {
        logger.debugLog('APP', 'Auto-saving any pending fields before tab switch...', 'useTabManagement');
        codeEditorRef.current.saveAllUnsavedFields();

        // Wait for state updates to propagate: field save -> form update -> template update -> session draft save
        setTimeout(() => {
          setActiveTab(newTab);
        }, 400);
      } else {
        setActiveTab(newTab);
      }
    },
    [activeTab, setActiveTab, codeEditorRef]
  );

  return {
    activeTab,
    handleTabSwitch,
  };
}
