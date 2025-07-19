import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationModal } from '../ConfigurationModal';

// Mock the useConfigStore hook
const mockConfigStore = {
  defaultInterface: 'langchain' as const,
  defaultProvider: 'google_genai',
  defaultModel: 'gemini-2.5-flash',
  savedInterface: 'langchain' as const,
  savedProvider: 'google_genai',
  savedModel: 'gemini-2.5-flash',
  originalDefaults: {
    defaultInterface: 'langchain' as const,
    defaultProvider: 'google_genai',
    defaultModel: 'gemini-2.5-flash',
  },
  envVariables: {
    'OPENAI_API_KEY': '****************************5678',
    'GOOGLE_API_KEY': '****************************s_12',
  },
  unmaskedEnvVariables: {
    'OPENAI_API_KEY': 'sk-1234567890abcdef1234567890abcdef1234567890abcdef5678',
    'GOOGLE_API_KEY': 'AIzaSyDQVGlDuGIHUiAOgsl12340123456789ABCDE_s_12',
  },
  isLoading: false,
  isSaving: false,
  isSavingDefaults: false,
  error: null,
  loadConfiguration: vi.fn(),
  updateDefaultInterface: vi.fn(),
  updateDefaultProvider: vi.fn(),
  updateDefaultModel: vi.fn(),
  updateEnvVariable: vi.fn(),
  updateEnvFileContents: vi.fn(),
  removeEnvVariable: vi.fn(),
  saveDefaults: vi.fn(),
  resetDefaults: vi.fn(),
  hasUnsavedDefaults: vi.fn(() => false),
  toggleShowApiKeys: vi.fn(),
  showApiKeys: false,
};

vi.mock('../../stores/useConfigStore', () => ({
  useConfigStore: () => mockConfigStore,
}));

// Mock fetch
global.fetch = vi.fn();

describe('ConfigurationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: 'OPENAI_API_KEY=test\nGOOGLE_API_KEY=test' }),
    });
  });

  it('renders correctly when open', () => {
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Default Settings')).toBeInTheDocument();
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ConfigurationModal
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
  });

  it('loads configuration when opened', async () => {
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(mockConfigStore.loadConfiguration).toHaveBeenCalled();
    });
  });

  it('switches between tabs', async () => {
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Click on Environment Variables tab
    fireEvent.click(screen.getByText('Environment Variables'));

    // Should show environment variables content
    await waitFor(() => {
      expect(screen.getByText('Security Notice:')).toBeInTheDocument();
    });
  });

  it('shows default settings correctly', () => {
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Should show default settings section
    expect(screen.getByText('LangChain')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter')).toBeInTheDocument();
    expect(screen.getByText('Default Provider')).toBeInTheDocument();
    expect(screen.getByText('Default Model')).toBeInTheDocument();
  });

  it('handles interface selection', () => {
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    const openrouterRadio = screen.getByDisplayValue('openrouter');
    fireEvent.click(openrouterRadio);

    expect(mockConfigStore.updateDefaultInterface).toHaveBeenCalledWith('openrouter');
  });

  it('calls onClose when modal is closed', () => {
    const onClose = vi.fn();
    render(
      <ConfigurationModal
        isOpen={true}
        onClose={onClose}
      />
    );

    // Click the close button (X)
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('displays error messages', () => {
    const originalMock = vi.fn(() => mockConfigStore);
    vi.doMock('../../stores/useConfigStore', () => ({
      useConfigStore: originalMock,
    }));

    const storeWithError = {
      ...mockConfigStore,
      error: 'Test error message',
    };

    originalMock.mockReturnValue(storeWithError);

    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    const originalMock = vi.fn(() => mockConfigStore);
    vi.doMock('../../stores/useConfigStore', () => ({
      useConfigStore: originalMock,
    }));

    const storeWithLoading = {
      ...mockConfigStore,
      isLoading: true,
    };

    originalMock.mockReturnValue(storeWithLoading);

    render(
      <ConfigurationModal
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Loading configuration...')).toBeInTheDocument();
  });
});