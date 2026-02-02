import { useState, useEffect, useCallback } from 'react';
import {
  MCPConfiguration,
  MCPServer,
  MCPTool,
  MCPValidationRequest,
  MCPValidationResponse,
  MCPPresetConfig,
} from '../../../types';
import { API_ENDPOINTS } from '../../../constants/api';

// ============================================================================
// Types
// ============================================================================

export interface UseMCPStateProps {
  isOpen: boolean;
  initialConfig?: {
    mcp_urls_dict?: Record<string, string>;
    mcp_tool_filter?: string[];
    mcp_validated_servers?: Record<string, string>;
    use_full_trace_for_template?: boolean;
    use_full_trace_for_rubric?: boolean;
  };
}

export interface UseMCPStateReturn {
  // Configuration state
  configuration: MCPConfiguration;
  setConfiguration: React.Dispatch<React.SetStateAction<MCPConfiguration>>;
  initialConfiguration: MCPConfiguration;

  // Search and validation state
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isValidating: string | null;
  setIsValidating: (validating: string | null) => void;
  serverToValidate: number | null;
  setServerToValidate: (index: number | null) => void;

  // Preset state
  presetConfigs: Record<string, MCPPresetConfig>;
  setPresetConfigs: (configs: Record<string, MCPPresetConfig>) => void;
  presetError: string | null;
  setPresetError: (error: string | null) => void;
  savingPresetForServer: number | null;
  setSavingPresetForServer: (index: number | null) => void;

  // Server preset origins tracking
  serverPresetOrigins: Map<number, { presetName: string; originalTools: string[] }>;
  setServerPresetOrigins: React.Dispatch<
    React.SetStateAction<Map<number, { presetName: string; originalTools: string[] }>>
  >;

  // Trace filtering settings
  useFullTraceForTemplate: boolean;
  setUseFullTraceForTemplate: (value: boolean) => void;
  useFullTraceForRubric: boolean;
  setUseFullTraceForRubric: (value: boolean) => void;

  // Actions
  fetchPresetConfigs: () => Promise<void>;
  addPresetServer: (presetConfig: MCPPresetConfig) => void;
  addServer: () => void;
  removeServer: (index: number) => void;
  updateServer: (index: number, field: keyof MCPServer, value: string) => void;
  validateServer: (index: number) => Promise<void>;
  toggleTool: (toolName: string) => void;
  selectAllTools: () => void;
  selectNoTools: () => void;
  getAllTools: () => MCPTool[];
  getAllToolsIncludingSelected: () => MCPTool[];
  getFilteredTools: () => MCPTool[];
  getPresetButtonLabel: (serverIndex: number) => string;
  saveServerAsPreset: (serverIndex: number) => Promise<void>;
  hasConfigurationChanged: () => boolean;
}

// ============================================================================
// Custom Hook
// ============================================================================

export const useMCPState = (props: UseMCPStateProps): UseMCPStateReturn => {
  const { isOpen, initialConfig } = props;

  // Configuration state
  const [configuration, setConfiguration] = useState<MCPConfiguration>({
    servers: [],
    selectedTools: new Set(),
  });
  const [initialConfiguration, setInitialConfiguration] = useState<MCPConfiguration>({
    servers: [],
    selectedTools: new Set(),
  });

  // Search and validation state
  const [searchTerm, setSearchTerm] = useState('');
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [serverToValidate, setServerToValidate] = useState<number | null>(null);

  // Preset state
  const [presetConfigs, setPresetConfigs] = useState<Record<string, MCPPresetConfig>>({});
  const [presetError, setPresetError] = useState<string | null>(null);
  const [savingPresetForServer, setSavingPresetForServer] = useState<number | null>(null);

  // Track original preset info for each server
  const [serverPresetOrigins, setServerPresetOrigins] = useState<
    Map<number, { presetName: string; originalTools: string[] }>
  >(new Map());

  // Trace filtering settings
  const [useFullTraceForTemplate, setUseFullTraceForTemplate] = useState<boolean>(false);
  const [useFullTraceForRubric, setUseFullTraceForRubric] = useState<boolean>(true);

  // Fetch preset configurations
  const fetchPresetConfigs = useCallback(async () => {
    try {
      setPresetError(null);
      const response = await fetch(API_ENDPOINTS.MCP_PRESETS);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setPresetConfigs(data.presets || {});
      if (data.error) {
        setPresetError(`Preset loading error: ${data.error}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          setPresetError('Network error: Cannot connect to server. Please check if the server is running.');
        } else {
          setPresetError(`Failed to load preset configurations: ${error.message}`);
        }
      } else {
        setPresetError('Failed to load preset configurations: Unknown error occurred');
      }
      setPresetConfigs({});
    }
  }, []);

  // Initialize configuration from props
  useEffect(() => {
    if (isOpen && initialConfig) {
      const servers: MCPServer[] = [];
      const selectedTools = new Set(initialConfig.mcp_tool_filter || []);
      const validatedServers = new Set(Object.keys(initialConfig.mcp_validated_servers || {}));

      if (initialConfig.mcp_urls_dict) {
        Object.entries(initialConfig.mcp_urls_dict).forEach(([name, url]) => {
          servers.push({
            name,
            url,
            status: 'idle',
          });
        });
      }

      const newConfiguration = { servers, selectedTools };
      setConfiguration(newConfiguration);
      setInitialConfiguration({ servers: [...servers], selectedTools: new Set(selectedTools) });

      setUseFullTraceForTemplate(initialConfig.use_full_trace_for_template ?? false);
      setUseFullTraceForRubric(initialConfig.use_full_trace_for_rubric ?? true);

      // Auto-validate servers that were previously validated
      if (validatedServers.size > 0) {
        servers.forEach((server, index) => {
          if (validatedServers.has(server.name)) {
            const serverIndex = index;
            setTimeout(
              () => {
                validateServer(serverIndex);
              },
              100 + index * 50
            );
          }
        });
      }
    } else if (isOpen && !initialConfig) {
      const emptyConfiguration = {
        servers: [],
        selectedTools: new Set(),
      };
      setConfiguration(emptyConfiguration);
      setInitialConfiguration({ servers: [], selectedTools: new Set() });
    }

    // Fetch preset configurations when modal opens
    if (isOpen) {
      fetchPresetConfigs();
    }
  }, [isOpen, initialConfig, fetchPresetConfigs]);

  // Handle auto-validation when serverToValidate changes
  useEffect(() => {
    if (serverToValidate !== null && configuration.servers[serverToValidate]) {
      validateServer(serverToValidate);
      setServerToValidate(null);
    }
  }, [serverToValidate, configuration.servers]);

  // Validate server function
  const validateServer = useCallback(
    async (index: number) => {
      const server = configuration.servers[index];
      if (!server.name || !server.url) return;

      setIsValidating(server.name);

      // Update server status to validating
      setConfiguration((prev) => ({
        ...prev,
        servers: prev.servers.map((s, i) => (i === index ? { ...s, status: 'validating', error: undefined } : s)),
      }));

      try {
        const request: MCPValidationRequest = {
          server_name: server.name,
          server_url: server.url,
        };

        const response = await fetch(API_ENDPOINTS.MCP_VALIDATE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        });

        const data: MCPValidationResponse = await response.json();

        setConfiguration((prev) => {
          const updatedServers = prev.servers.map((s, i) =>
            i === index
              ? {
                  ...s,
                  status: data.success ? 'valid' : 'invalid',
                  tools: data.tools || [],
                  error: data.error,
                }
              : s
          );

          // Auto-select preset tools if validation succeeded
          const updatedSelectedTools = new Set(prev.selectedTools);
          if (data.success && prev.servers[index]?.presetTools) {
            const presetTools = prev.servers[index].presetTools!;
            const availableToolNames = new Set((data.tools || []).map((t) => t.name));

            presetTools.forEach((toolName) => {
              if (availableToolNames.has(toolName)) {
                updatedSelectedTools.add(toolName);
              }
            });
          }

          return {
            servers: updatedServers,
            selectedTools: updatedSelectedTools,
          };
        });
      } catch (error) {
        setConfiguration((prev) => ({
          ...prev,
          servers: prev.servers.map((s, i) =>
            i === index
              ? {
                  ...s,
                  status: 'invalid',
                  error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }
              : s
          ),
        }));
      } finally {
        setIsValidating(null);
      }
    },
    [configuration.servers]
  );

  // Add preset server
  const addPresetServer = useCallback(
    (presetConfig: MCPPresetConfig) => {
      const existingByName = configuration.servers.find((s) => s.name === presetConfig.name);
      const existingByUrl = configuration.servers.find((s) => s.url === presetConfig.url);

      if (existingByName) {
        const serverIndex = configuration.servers.findIndex((s) => s.name === presetConfig.name);
        updateServer(serverIndex, 'url', presetConfig.url);
        setServerToValidate(serverIndex);
        return;
      }

      if (existingByUrl) {
        const serverIndex = configuration.servers.findIndex((s) => s.url === presetConfig.url);
        updateServer(serverIndex, 'name', presetConfig.name);
        setServerToValidate(serverIndex);
        return;
      }

      const newServer: MCPServer = {
        name: presetConfig.name,
        url: presetConfig.url,
        status: 'idle',
        presetTools: presetConfig.tools,
      };

      setConfiguration((prev) => {
        const newServers = [...prev.servers, newServer];
        const serverIndex = newServers.length - 1;

        setServerPresetOrigins((prevOrigins) => {
          const newOrigins = new Map(prevOrigins);
          newOrigins.set(serverIndex, {
            presetName: presetConfig.name,
            originalTools: presetConfig.tools || [],
          });
          return newOrigins;
        });

        setServerToValidate(serverIndex);
        return {
          ...prev,
          servers: newServers,
        };
      });
    },
    [configuration.servers]
  );

  // Add server
  const addServer = useCallback(() => {
    const newServer: MCPServer = {
      name: `server-${configuration.servers.length + 1}`,
      url: '',
      status: 'idle',
    };
    setConfiguration((prev) => ({
      ...prev,
      servers: [...prev.servers, newServer],
    }));
  }, [configuration.servers.length]);

  // Remove server
  const removeServer = useCallback((index: number) => {
    setConfiguration((prev) => {
      const newServers = prev.servers.filter((_, i) => i !== index);
      const serverToRemove = prev.servers[index];
      const newSelectedTools = new Set(prev.selectedTools);
      if (serverToRemove.tools) {
        serverToRemove.tools.forEach((tool) => {
          newSelectedTools.delete(tool.name);
        });
      }
      return {
        servers: newServers,
        selectedTools: newSelectedTools,
      };
    });
  }, []);

  // Update server
  const updateServer = useCallback((index: number, field: keyof MCPServer, value: string) => {
    setConfiguration((prev) => ({
      ...prev,
      servers: prev.servers.map((server, i) =>
        i === index
          ? {
              ...server,
              [field]: value,
              ...(field === 'url' && { status: 'idle' as const, tools: undefined, error: undefined }),
            }
          : server
      ),
    }));
  }, []);

  // Get all tools
  const getAllTools = useCallback((): MCPTool[] => {
    return configuration.servers
      .filter((server) => server.status === 'valid' && server.tools)
      .flatMap((server) => server.tools!);
  }, [configuration.servers]);

  // Get all tools including previously selected ones
  const getAllToolsIncludingSelected = useCallback((): MCPTool[] => {
    const availableTools = getAllTools();
    const availableToolNames = new Set(availableTools.map((t) => t.name));

    const phantomTools: MCPTool[] = [];
    configuration.selectedTools.forEach((toolName) => {
      if (!availableToolNames.has(toolName)) {
        phantomTools.push({
          name: toolName,
          description: '(Previously selected - server needs revalidation)',
          phantom: true,
        } as MCPTool & { phantom: boolean });
      }
    });

    return [...availableTools, ...phantomTools];
  }, [configuration.selectedTools, getAllTools]);

  // Get filtered tools
  const getFilteredTools = useCallback((): MCPTool[] => {
    const tools = getAllToolsIncludingSelected();
    if (!searchTerm) return tools;

    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [searchTerm, getAllToolsIncludingSelected]);

  // Toggle tool selection
  const toggleTool = useCallback((toolName: string) => {
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      if (newSelectedTools.has(toolName)) {
        newSelectedTools.delete(toolName);
      } else {
        newSelectedTools.add(toolName);
      }
      return { ...prev, selectedTools: newSelectedTools };
    });
  }, []);

  // Select all tools
  const selectAllTools = useCallback(() => {
    const allTools = getFilteredTools();
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      allTools.forEach((tool) => newSelectedTools.add(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  }, [getFilteredTools]);

  // Select no tools
  const selectNoTools = useCallback(() => {
    const filteredTools = getFilteredTools();
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      filteredTools.forEach((tool) => newSelectedTools.delete(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  }, [getFilteredTools]);

  // Get preset button label
  const getPresetButtonLabel = useCallback(
    (serverIndex: number): string => {
      const server = configuration.servers[serverIndex];
      const presetOrigin = serverPresetOrigins.get(serverIndex);

      if (!presetOrigin) {
        return 'Save as Preset';
      }

      const currentTools = Array.from(configuration.selectedTools);
      const originalTools = presetOrigin.originalTools;

      const nameChanged = server.name !== presetOrigin.presetName;
      const toolsChanged =
        currentTools.length !== originalTools.length || currentTools.some((tool) => !originalTools.includes(tool));

      if (nameChanged || toolsChanged) {
        return 'Update Preset';
      }

      return 'Update Preset';
    },
    [configuration.servers, configuration.selectedTools, serverPresetOrigins]
  );

  // Save server as preset
  const saveServerAsPreset = useCallback(
    async (serverIndex: number) => {
      const server = configuration.servers[serverIndex];

      if (!server || server.status !== 'valid') {
        alert('Server must be validated before saving as a preset.');
        return;
      }

      const presetOrigin = serverPresetOrigins.get(serverIndex);
      const isUpdate = presetOrigin !== null && presetOrigin !== undefined;

      let hasChanges = false;
      if (isUpdate) {
        const currentTools = Array.from(configuration.selectedTools);
        const originalTools = presetOrigin.originalTools;

        const nameChanged = server.name !== presetOrigin.presetName;
        const toolsChanged =
          currentTools.length !== originalTools.length || currentTools.some((tool) => !originalTools.includes(tool));

        hasChanges = nameChanged || toolsChanged;
      }

      let presetName: string | null;
      if (isUpdate && !hasChanges) {
        presetName = presetOrigin.presetName;
      } else if (isUpdate && hasChanges) {
        presetName = prompt(
          `Update preset "${presetOrigin.presetName}"?\n\nChanges detected. Enter preset name:`,
          presetOrigin.presetName
        );
      } else {
        presetName = prompt(
          `Save "${server.name}" as a Quick Configuration preset.\n\nEnter preset name:`,
          server.name
        );
      }

      if (!presetName) {
        return;
      }

      setSavingPresetForServer(serverIndex);

      try {
        const selectedTools = Array.from(configuration.selectedTools);

        const response = await fetch(API_ENDPOINTS.MCP_SAVE_PRESET(presetName), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: server.url,
            tools: selectedTools.length > 0 ? selectedTools : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
        }

        setServerPresetOrigins((prevOrigins) => {
          const newOrigins = new Map(prevOrigins);
          newOrigins.set(serverIndex, {
            presetName: presetName!,
            originalTools: selectedTools,
          });
          return newOrigins;
        });

        await fetchPresetConfigs();

        alert(`Successfully ${isUpdate ? 'updated' : 'saved'} preset "${presetName}"!`);
      } catch (error) {
        if (error instanceof Error) {
          alert(`Failed to save preset: ${error.message}`);
        } else {
          alert('Failed to save preset: Unknown error occurred');
        }
      } finally {
        setSavingPresetForServer(null);
      }
    },
    [configuration.servers, configuration.selectedTools, serverPresetOrigins, fetchPresetConfigs]
  );

  // Check if configuration has changed
  const hasConfigurationChanged = useCallback((): boolean => {
    const currentServers = configuration.servers.map((s) => ({ name: s.name, url: s.url }));
    const initialServers = initialConfiguration.servers.map((s) => ({ name: s.name, url: s.url }));

    if (currentServers.length !== initialServers.length) {
      return true;
    }

    const serversChanged = currentServers.some((currentServer, index) => {
      const initialServer = initialServers[index];
      return currentServer.name !== initialServer.name || currentServer.url !== initialServer.url;
    });

    const selectedToolsChanged =
      configuration.selectedTools.size !== initialConfiguration.selectedTools.size ||
      Array.from(configuration.selectedTools).some((tool) => !initialConfiguration.selectedTools.has(tool));

    return serversChanged || selectedToolsChanged;
  }, [configuration, initialConfiguration]);

  return {
    configuration,
    setConfiguration,
    initialConfiguration,
    searchTerm,
    setSearchTerm,
    isValidating,
    setIsValidating,
    serverToValidate,
    setServerToValidate,
    presetConfigs,
    setPresetConfigs,
    presetError,
    setPresetError,
    savingPresetForServer,
    setSavingPresetForServer,
    serverPresetOrigins,
    setServerPresetOrigins,
    useFullTraceForTemplate,
    setUseFullTraceForTemplate,
    useFullTraceForRubric,
    setUseFullTraceForRubric,
    fetchPresetConfigs,
    addPresetServer,
    addServer,
    removeServer,
    updateServer,
    validateServer,
    toggleTool,
    selectAllTools,
    selectNoTools,
    getAllTools,
    getAllToolsIncludingSelected,
    getFilteredTools,
    getPresetButtonLabel,
    saveServerAsPreset,
    hasConfigurationChanged,
  };
};
