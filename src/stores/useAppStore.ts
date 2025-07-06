import { create } from 'zustand';

// Define the tab types
export type TabType = 'extractor' | 'generator' | 'curator' | 'chat' | 'benchmark';

// Define the application state interface
interface AppState {
  // UI State
  activeTab: TabType;
  isLoading: boolean;

  // Session State (ephemeral - regenerated on each app load)
  sessionId: string;

  // Actions
  setActiveTab: (tab: TabType) => void;
  setIsLoading: (loading: boolean) => void;
  resetAppState: () => void;
}

// Generate session ID helper
const generateSessionId = (): string => {
  return `karenina_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Create the store
export const useAppStore = create<AppState>((set) => ({
  // Initial state
  activeTab: 'extractor',
  isLoading: false,
  sessionId: generateSessionId(),

  // Actions
  setActiveTab: (tab: TabType) => set(() => ({ activeTab: tab })),
  setIsLoading: (loading: boolean) => set(() => ({ isLoading: loading })),
  resetAppState: () =>
    set(() => ({
      activeTab: 'extractor',
      isLoading: false,
      sessionId: generateSessionId(),
    })),
}));
