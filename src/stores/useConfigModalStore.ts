import { create } from 'zustand';

export type ConfigModalTab = 'defaults' | 'env' | 'traceHighlighting' | 'adele';

interface ConfigModalState {
  isOpen: boolean;
  initialTab: ConfigModalTab;
  openModal: (tab?: ConfigModalTab) => void;
  closeModal: () => void;
}

export const useConfigModalStore = create<ConfigModalState>((set) => ({
  isOpen: false,
  initialTab: 'defaults',
  openModal: (tab = 'defaults') => set({ isOpen: true, initialTab: tab }),
  closeModal: () => set({ isOpen: false }),
}));
