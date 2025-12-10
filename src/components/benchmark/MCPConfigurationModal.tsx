import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Search,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle,
  Settings,
  Zap,
} from 'lucide-react';
import {
  MCPConfiguration,
  MCPServer,
  MCPTool,
  MCPValidationRequest,
  MCPValidationResponse,
  MCPPresetConfig,
  MCPPresetsResponse,
} from '../../types';

interface MCPConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: {
    mcp_urls_dict: Record<string, string>;
    mcp_tool_filter: string[];
    mcp_validated_servers?: Record<string, string>;
    use_full_trace_for_template?: boolean;
    use_full_trace_for_rubric?: boolean;
  }) => void;
  initialConfig?: {
    mcp_urls_dict?: Record<string, string>;
    mcp_tool_filter?: string[];
    mcp_validated_servers?: Record<string, string>;
    use_full_trace_for_template?: boolean;
    use_full_trace_for_rubric?: boolean;
  };
}

export const MCPConfigurationModal: React.FC<MCPConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}) => {
  const [configuration, setConfiguration] = useState<MCPConfiguration>({
    servers: [],
    selectedTools: new Set(),
  });
  const [initialConfiguration, setInitialConfiguration] = useState<MCPConfiguration>({
    servers: [],
    selectedTools: new Set(),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [presetConfigs, setPresetConfigs] = useState<Record<string, MCPPresetConfig>>({});
  const [presetError, setPresetError] = useState<string | null>(null);
  const [serverToValidate, setServerToValidate] = useState<number | null>(null);

  // Trace filtering settings (for MCP agents)
  const [useFullTraceForTemplate, setUseFullTraceForTemplate] = useState<boolean>(false);
  const [useFullTraceForRubric, setUseFullTraceForRubric] = useState<boolean>(true);

  // Save preset state (per server)
  const [savingPresetForServer, setSavingPresetForServer] = useState<number | null>(null);

  // Track original preset info for each server (to detect changes)
  const [serverPresetOrigins, setServerPresetOrigins] = useState<
    Map<number, { presetName: string; originalTools: string[] }>
  >(new Map());

  // Fetch preset configurations from mcp_presets/ directory
  // Directory location can be configured via MCP_PRESETS_DIR environment variable
  const fetchPresetConfigs = async () => {
    try {
      setPresetError(null); // Clear previous errors
      const response = await fetch('/api/get-mcp-preset-configs');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: MCPPresetsResponse = await response.json();

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
      setPresetConfigs({}); // Clear presets on error
    }
  };

  // Initialize configuration from props
  useEffect(() => {
    if (isOpen && initialConfig) {
      const servers: MCPServer[] = [];
      const selectedTools = new Set(initialConfig.mcp_tool_filter || []);
      const validatedServers = new Set(Object.keys(initialConfig.mcp_validated_servers || {}));

      if (initialConfig.mcp_urls_dict) {
        Object.entries(initialConfig.mcp_urls_dict).forEach(([name, url]) => {
          servers.push({
            name, // Use the key from mcp_urls_dict as the server name
            url,
            status: 'idle', // Will be auto-validated if it was previously validated
          });
        });
      }

      const newConfiguration = { servers, selectedTools };
      setConfiguration(newConfiguration);
      setInitialConfiguration({ servers: [...servers], selectedTools: new Set(selectedTools) });

      // Initialize trace filtering settings
      setUseFullTraceForTemplate(initialConfig.use_full_trace_for_template ?? false);
      setUseFullTraceForRubric(initialConfig.use_full_trace_for_rubric ?? true);

      // Auto-validate servers that were previously validated
      if (validatedServers.size > 0) {
        servers.forEach((server, index) => {
          if (validatedServers.has(server.name)) {
            // Delay validation slightly to avoid race condition with state setting
            // Capture the index in closure to avoid issues with async execution
            const serverIndex = index;
            setTimeout(
              () => {
                validateServer(serverIndex);
              },
              100 + index * 50
            ); // Stagger validations to avoid overwhelming the server
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
  }, [isOpen, initialConfig]);

  // Handle auto-validation when serverToValidate changes
  useEffect(() => {
    if (serverToValidate !== null && configuration.servers[serverToValidate]) {
      validateServer(serverToValidate);
      setServerToValidate(null);
    }
  }, [serverToValidate, configuration.servers]);

  // Removed auto-validation - validation now happens only when user clicks "Validate"

  const addPresetServer = async (presetConfig: MCPPresetConfig) => {
    // Check if server with this name or URL already exists
    const existingByName = configuration.servers.find((s) => s.name === presetConfig.name);
    const existingByUrl = configuration.servers.find((s) => s.url === presetConfig.url);

    if (existingByName) {
      // Update existing server with preset URL
      const serverIndex = configuration.servers.findIndex((s) => s.name === presetConfig.name);
      updateServer(serverIndex, 'url', presetConfig.url);
      // Trigger auto-validation
      setServerToValidate(serverIndex);
      return;
    }

    if (existingByUrl) {
      // Update existing server name to match preset
      const serverIndex = configuration.servers.findIndex((s) => s.url === presetConfig.url);
      updateServer(serverIndex, 'name', presetConfig.name);
      // Trigger auto-validation
      setServerToValidate(serverIndex);
      return;
    }

    // Add new server from preset
    const newServer: MCPServer = {
      name: presetConfig.name,
      url: presetConfig.url,
      status: 'idle',
      presetTools: presetConfig.tools, // Track preset tools for auto-selection
    };

    setConfiguration((prev) => {
      const newServers = [...prev.servers, newServer];
      const serverIndex = newServers.length - 1;

      // Track this server's preset origin
      setServerPresetOrigins((prevOrigins) => {
        const newOrigins = new Map(prevOrigins);
        newOrigins.set(serverIndex, {
          presetName: presetConfig.name,
          originalTools: presetConfig.tools || [],
        });
        return newOrigins;
      });

      // Trigger auto-validation for the new server
      setServerToValidate(serverIndex);
      return {
        ...prev,
        servers: newServers,
      };
    });
  };

  const addServer = () => {
    const newServer: MCPServer = {
      name: `server-${configuration.servers.length + 1}`,
      url: '',
      status: 'idle',
    };
    setConfiguration((prev) => ({
      ...prev,
      servers: [...prev.servers, newServer],
    }));
  };

  const getPresetButtonLabel = (serverIndex: number): string => {
    const server = configuration.servers[serverIndex];
    const presetOrigin = serverPresetOrigins.get(serverIndex);

    if (!presetOrigin) {
      return 'Save as Preset';
    }

    // Check if there are changes
    const currentTools = Array.from(configuration.selectedTools);
    const originalTools = presetOrigin.originalTools;

    const nameChanged = server.name !== presetOrigin.presetName;
    const toolsChanged =
      currentTools.length !== originalTools.length || currentTools.some((tool) => !originalTools.includes(tool));

    if (nameChanged || toolsChanged) {
      return 'Update Preset';
    }

    return 'Update Preset';
  };

  const saveServerAsPreset = async (serverIndex: number) => {
    const server = configuration.servers[serverIndex];

    if (!server || server.status !== 'valid') {
      alert('Server must be validated before saving as a preset.');
      return;
    }

    // Check if this server came from a preset
    const presetOrigin = serverPresetOrigins.get(serverIndex);
    const isUpdate = presetOrigin !== null && presetOrigin !== undefined;

    // Detect changes
    let hasChanges = false;
    if (isUpdate) {
      // Check if name changed or tool selection changed
      const currentTools = Array.from(configuration.selectedTools);
      const originalTools = presetOrigin.originalTools;

      const nameChanged = server.name !== presetOrigin.presetName;
      const toolsChanged =
        currentTools.length !== originalTools.length || currentTools.some((tool) => !originalTools.includes(tool));

      hasChanges = nameChanged || toolsChanged;
    }

    // Determine preset name
    let presetName: string | null;
    if (isUpdate && !hasChanges) {
      // No changes detected, just update the existing preset
      presetName = presetOrigin.presetName;
    } else if (isUpdate && hasChanges) {
      // Changes detected, ask if they want to update
      presetName = prompt(
        `Update preset "${presetOrigin.presetName}"?\n\nChanges detected. Enter preset name:`,
        presetOrigin.presetName
      );
    } else {
      // New preset
      presetName = prompt(`Save "${server.name}" as a Quick Configuration preset.\n\nEnter preset name:`, server.name);
    }

    if (!presetName) {
      return; // User cancelled
    }

    setSavingPresetForServer(serverIndex);

    try {
      // Get selected tools
      const selectedTools = Array.from(configuration.selectedTools);

      const response = await fetch('/api/save-mcp-preset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: presetName,
          url: server.url,
          tools: selectedTools.length > 0 ? selectedTools : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Update the preset origin for this server
      setServerPresetOrigins((prevOrigins) => {
        const newOrigins = new Map(prevOrigins);
        newOrigins.set(serverIndex, {
          presetName: presetName!,
          originalTools: selectedTools,
        });
        return newOrigins;
      });

      // Refresh preset configs to show the updated preset
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
  };

  const removeServer = (index: number) => {
    setConfiguration((prev) => {
      const newServers = prev.servers.filter((_, i) => i !== index);
      // Remove tools from this server from selectedTools
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
  };

  const updateServer = (index: number, field: keyof MCPServer, value: string) => {
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
  };

  const validateServer = async (index: number) => {
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

      const response = await fetch('/api/validate-mcp-server', {
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

        // Auto-select preset tools if this was a preset server and validation succeeded
        const updatedSelectedTools = new Set(prev.selectedTools);
        if (data.success && prev.servers[index]?.presetTools) {
          const presetTools = prev.servers[index].presetTools!;
          const availableToolNames = new Set((data.tools || []).map((t) => t.name));

          // Add preset tools that are available on the server
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
  };

  const getAllTools = (): MCPTool[] => {
    return configuration.servers
      .filter((server) => server.status === 'valid' && server.tools)
      .flatMap((server) => server.tools!);
  };

  // Get all tools including previously selected ones (even if servers aren't validated)
  const getAllToolsIncludingSelected = (): MCPTool[] => {
    const availableTools = getAllTools();
    const availableToolNames = new Set(availableTools.map((t) => t.name));

    // Create phantom tools for previously selected tools that aren't currently available
    const phantomTools: MCPTool[] = [];
    configuration.selectedTools.forEach((toolName) => {
      if (!availableToolNames.has(toolName)) {
        phantomTools.push({
          name: toolName,
          description: '(Previously selected - server needs revalidation)',
          phantom: true, // Custom property to indicate this is a phantom tool
        });
      }
    });

    return [...availableTools, ...phantomTools];
  };

  const getFilteredTools = (): MCPTool[] => {
    const tools = getAllToolsIncludingSelected();
    if (!searchTerm) return tools;

    return tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const toggleTool = (toolName: string) => {
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      if (newSelectedTools.has(toolName)) {
        newSelectedTools.delete(toolName);
      } else {
        newSelectedTools.add(toolName);
      }
      return { ...prev, selectedTools: newSelectedTools };
    });
  };

  const selectAllTools = () => {
    const allTools = getFilteredTools();
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      allTools.forEach((tool) => newSelectedTools.add(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  };

  const selectNoTools = () => {
    const filteredTools = getFilteredTools();
    setConfiguration((prev) => {
      const newSelectedTools = new Set(prev.selectedTools);
      filteredTools.forEach((tool) => newSelectedTools.delete(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  };

  // Check if configuration has changed from initial state
  const hasConfigurationChanged = (): boolean => {
    // Compare server configurations (name and url only, ignore status and tools)
    const currentServers = configuration.servers.map((s) => ({ name: s.name, url: s.url }));
    const initialServers = initialConfiguration.servers.map((s) => ({ name: s.name, url: s.url }));

    // Check if server arrays are different
    if (currentServers.length !== initialServers.length) {
      return true;
    }

    const serversChanged = currentServers.some((currentServer, index) => {
      const initialServer = initialServers[index];
      return currentServer.name !== initialServer.name || currentServer.url !== initialServer.url;
    });

    // Check if selected tools have changed
    const selectedToolsChanged =
      configuration.selectedTools.size !== initialConfiguration.selectedTools.size ||
      Array.from(configuration.selectedTools).some((tool) => !initialConfiguration.selectedTools.has(tool));

    return serversChanged || selectedToolsChanged;
  };

  const handleSave = () => {
    // Convert configuration back to the format expected by the backend
    const mcp_urls_dict: Record<string, string> = {};
    const mcp_validated_servers: Record<string, string> = {}; // Track servers that have been validated

    configuration.servers
      .filter((server) => {
        // Include servers that are valid, or servers that have name and URL
        // (which means they were previously saved and are being revalidated)
        return (server.status === 'valid' || (server.name && server.url)) && server.name && server.url;
      })
      .forEach((server) => {
        mcp_urls_dict[server.name] = server.url;
        // Track servers that are currently valid (have been validated)
        if (server.status === 'valid') {
          mcp_validated_servers[server.name] = server.url;
        }
      });

    const mcp_tool_filter = Array.from(configuration.selectedTools);

    onSave({
      mcp_urls_dict,
      mcp_tool_filter,
      mcp_validated_servers,
      use_full_trace_for_template: useFullTraceForTemplate,
      use_full_trace_for_rubric: useFullTraceForRubric,
    });
  };

  // Allow saving if configuration has changed from initial state
  const canSave = hasConfigurationChanged();
  const totalTools = getAllToolsIncludingSelected().length;
  const availableTools = getAllTools().length; // Tools from validated servers only
  const selectedCount = configuration.selectedTools.size;
  const filteredTools = getFilteredTools();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-cyan-500/10 dark:from-blue-400/20 dark:via-purple-400/10 dark:to-cyan-400/20"></div>
          <div className="relative flex items-center justify-between p-6 border-b border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-slate-100 dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
                  MCP Configuration
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Configure Model Context Protocol servers and tools
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100/80 dark:hover:bg-slate-700/80 rounded-xl transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30">
          {/* Agent Trace Evaluation Options */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/30 rounded-lg border border-slate-200 dark:border-slate-600">
            <div className="flex items-start space-x-2 mb-3">
              <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600 dark:text-slate-300">
                When using MCP servers, an agent performs multi-step reasoning with tool calls to answer questions.
                Toggle whether the full trace of actions is exposed to validation or just the final answer.
              </div>
            </div>

            <div className="space-y-2 ml-6">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useFullTraceForTemplate}
                  onChange={(e) => setUseFullTraceForTemplate(e.target.checked)}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-slate-700 dark:text-slate-300">Use full trace for template evaluation</span>
              </label>

              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useFullTraceForRubric}
                  onChange={(e) => setUseFullTraceForRubric(e.target.checked)}
                  className="rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-slate-700 dark:text-slate-300">Use full trace for rubric evaluation</span>
              </label>
            </div>
          </div>

          {/* Quick Configuration Section */}
          {Object.keys(presetConfigs).length > 0 && (
            <div className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-yellow-500 to-orange-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Quick Configuration</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
                <div className="px-3 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border border-yellow-200 dark:border-yellow-700 rounded-full text-xs font-medium text-yellow-700 dark:text-yellow-300">
                  {Object.keys(presetConfigs).length} available
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {Object.values(presetConfigs).map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => addPresetServer(preset)}
                    className="group relative p-4 border border-slate-200/60 dark:border-slate-600/60 rounded-xl bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-900/20 dark:to-orange-900/20 hover:from-yellow-100/80 dark:hover:from-yellow-800/40 hover:to-orange-100/80 dark:hover:to-orange-800/40 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md text-left"
                  >
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500/20 via-orange-500/10 to-yellow-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
                    <div className="relative">
                      <div className="flex items-start space-x-3 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-lg shadow-lg">
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-yellow-900 dark:group-hover:text-yellow-100 transition-colors truncate">
                            {preset.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{preset.url}</div>
                        </div>
                      </div>
                      {preset.tools && preset.tools.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <div className="text-xs text-slate-600 dark:text-slate-400">
                            {preset.tools.length} specific tools
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {presetError && (
                <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm text-yellow-700 dark:text-yellow-300 backdrop-blur-sm">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 text-yellow-500" />
                    <div>{presetError}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MCP Servers Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">MCP Servers</h3>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
            </div>

            <div className="space-y-4">
              {configuration.servers.map((server, index) => (
                <div key={index} className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
                  <div className="relative border border-slate-200/60 dark:border-slate-600/60 rounded-xl p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 shadow-sm hover:shadow-md">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Name:
                        </label>
                        <input
                          type="text"
                          value={server.name}
                          onChange={(e) => updateServer(index, 'name', e.target.value)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          URL:
                        </label>
                        <input
                          type="url"
                          value={server.url}
                          onChange={(e) => updateServer(index, 'url', e.target.value)}
                          className="w-full p-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all duration-200 backdrop-blur-sm"
                          placeholder="https://mcp.example.com/mcp/"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => validateServer(index)}
                          disabled={!server.name || !server.url || isValidating === server.name}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                        >
                          {isValidating === server.name ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="font-medium">Validate</span>
                          )}
                        </button>

                        {/* Status indicator */}
                        {server.status === 'valid' && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Valid ({server.tools?.length || 0} tools)
                            </span>
                          </div>
                        )}
                        {server.status === 'invalid' && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-sm font-medium text-red-700 dark:text-red-300">Invalid</span>
                          </div>
                        )}
                        {server.status === 'validating' && (
                          <div className="flex items-center space-x-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Validating...</span>
                          </div>
                        )}

                        {/* Save as Preset button - only show when validated */}
                        {server.status === 'valid' && (
                          <button
                            onClick={() => saveServerAsPreset(index)}
                            disabled={savingPresetForServer === index}
                            className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-sm flex items-center space-x-2 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                          >
                            {savingPresetForServer === index ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            <span className="font-medium">{getPresetButtonLabel(index)}</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => removeServer(index)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 group"
                      >
                        <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>

                    {server.error && (
                      <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300 backdrop-blur-sm">
                        <div className="flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 mt-0.5 text-red-500" />
                          <div>{server.error}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addServer}
              className="mt-4 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:border-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 flex items-center justify-center space-x-2 transition-all duration-200 group backdrop-blur-sm"
            >
              <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Add Server</span>
            </button>
          </div>

          {/* Available Tools Section */}
          {(totalTools > 0 || configuration.selectedTools.size > 0) && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Available Tools</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
                <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
                  {availableTools} available
                  {totalTools > availableTools ? `, ${totalTools - availableTools} previously selected` : ''}
                </div>
              </div>

              <div className="border border-slate-200/60 dark:border-slate-600/60 rounded-xl p-4 bg-gradient-to-br from-white/50 to-slate-50/50 dark:from-slate-800/50 dark:to-slate-900/50 backdrop-blur-sm shadow-sm">
                {/* Search and controls */}
                <div className="mb-3">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tools by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-lg bg-white/80 dark:bg-slate-700/80 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all duration-200 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllTools}
                      className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 font-medium"
                    >
                      Select All
                    </button>
                    <button
                      onClick={selectNoTools}
                      className="px-4 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 backdrop-blur-sm font-medium"
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {/* Tools list */}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {filteredTools.map((tool) => (
                    <div key={tool.name} className="group relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 blur-sm"></div>
                      <div className="relative flex items-start space-x-3 p-3 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent group-hover:border-slate-200/50 dark:group-hover:border-slate-600/50">
                        <button onClick={() => toggleTool(tool.name)} className="mt-0.5 group/checkbox">
                          {configuration.selectedTools.has(tool.name) ? (
                            <div className="relative">
                              <CheckSquare className="w-5 h-5 text-purple-500 group-hover/checkbox:text-purple-600 transition-colors" />
                              <div className="absolute inset-0 bg-purple-500/20 rounded-sm animate-pulse"></div>
                            </div>
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 group-hover/checkbox:text-slate-600 dark:group-hover/checkbox:text-slate-300 transition-colors" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-purple-900 dark:group-hover:text-purple-100 transition-colors">
                            {tool.name}
                          </div>
                          {tool.description && (
                            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {tool.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Selected: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedCount}</span> of{' '}
                  <span className="font-medium text-slate-700 dark:text-slate-300">{totalTools}</span> tools
                </div>
                {selectedCount > 0 && (
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
                    {selectedCount} selected
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 opacity-90"></div>
          <div className="relative flex items-center justify-end space-x-3 p-6 border-t border-slate-200/50 dark:border-slate-600/50 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 font-medium"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
