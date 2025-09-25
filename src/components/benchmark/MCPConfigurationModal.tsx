import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, CheckSquare, Square, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MCPConfiguration, MCPServer, MCPTool, MCPValidationRequest, MCPValidationResponse } from '../../types';

interface MCPConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: { mcp_urls_dict: Record<string, string>; mcp_tool_filter: string[] }) => void;
  initialConfig?: {
    mcp_urls_dict?: Record<string, string>;
    mcp_tool_filter?: string[];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isValidating, setIsValidating] = useState<string | null>(null);

  // Initialize configuration from props
  useEffect(() => {
    if (isOpen && initialConfig) {
      const servers: MCPServer[] = [];
      const selectedTools = new Set(initialConfig.mcp_tool_filter || []);

      if (initialConfig.mcp_urls_dict) {
        Object.entries(initialConfig.mcp_urls_dict).forEach(([name, url]) => {
          servers.push({
            name,
            url,
            status: 'idle',
          });
        });
      }

      setConfiguration({ servers, selectedTools });
    } else if (isOpen && !initialConfig) {
      setConfiguration({
        servers: [],
        selectedTools: new Set(),
      });
    }
  }, [isOpen, initialConfig]);

  const addServer = () => {
    const newServer: MCPServer = {
      name: `server-${configuration.servers.length + 1}`,
      url: '',
      status: 'idle',
    };
    setConfiguration(prev => ({
      ...prev,
      servers: [...prev.servers, newServer],
    }));
  };

  const removeServer = (index: number) => {
    setConfiguration(prev => {
      const newServers = prev.servers.filter((_, i) => i !== index);
      // Remove tools from this server from selectedTools
      const serverToRemove = prev.servers[index];
      const newSelectedTools = new Set(prev.selectedTools);
      if (serverToRemove.tools) {
        serverToRemove.tools.forEach(tool => {
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
    setConfiguration(prev => ({
      ...prev,
      servers: prev.servers.map((server, i) =>
        i === index
          ? { ...server, [field]: value, ...(field === 'url' && { status: 'idle' as const, tools: undefined, error: undefined }) }
          : server
      ),
    }));
  };

  const validateServer = async (index: number) => {
    const server = configuration.servers[index];
    if (!server.name || !server.url) return;

    setIsValidating(server.name);

    // Update server status to validating
    setConfiguration(prev => ({
      ...prev,
      servers: prev.servers.map((s, i) =>
        i === index ? { ...s, status: 'validating', error: undefined } : s
      ),
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

      setConfiguration(prev => ({
        ...prev,
        servers: prev.servers.map((s, i) =>
          i === index
            ? {
                ...s,
                status: data.success ? 'valid' : 'invalid',
                tools: data.tools || [],
                error: data.error,
              }
            : s
        ),
      }));
    } catch (error) {
      setConfiguration(prev => ({
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
      .filter(server => server.status === 'valid' && server.tools)
      .flatMap(server => server.tools!);
  };

  const getFilteredTools = (): MCPTool[] => {
    const tools = getAllTools();
    if (!searchTerm) return tools;

    return tools.filter(
      tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tool.description && tool.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const toggleTool = (toolName: string) => {
    setConfiguration(prev => {
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
    setConfiguration(prev => {
      const newSelectedTools = new Set(prev.selectedTools);
      allTools.forEach(tool => newSelectedTools.add(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  };

  const selectNoTools = () => {
    const filteredTools = getFilteredTools();
    setConfiguration(prev => {
      const newSelectedTools = new Set(prev.selectedTools);
      filteredTools.forEach(tool => newSelectedTools.delete(tool.name));
      return { ...prev, selectedTools: newSelectedTools };
    });
  };

  const handleSave = () => {
    // Convert configuration back to the format expected by the backend
    const mcp_urls_dict: Record<string, string> = {};
    configuration.servers
      .filter(server => server.status === 'valid' && server.name && server.url)
      .forEach(server => {
        mcp_urls_dict[server.name] = server.url;
      });

    const mcp_tool_filter = Array.from(configuration.selectedTools);

    onSave({ mcp_urls_dict, mcp_tool_filter });
  };

  const canSave = configuration.servers.some(server => server.status === 'valid') && configuration.selectedTools.size > 0;
  const totalTools = getAllTools().length;
  const selectedCount = configuration.selectedTools.size;
  const filteredTools = getFilteredTools();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            MCP Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* MCP Servers Section */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-slate-900 dark:text-slate-100 mb-3">
              MCP Servers:
            </h3>

            <div className="space-y-3">
              {configuration.servers.map((server, index) => (
                <div
                  key={index}
                  className="border border-slate-200 dark:border-slate-600 rounded-md p-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Name:
                      </label>
                      <input
                        type="text"
                        value={server.name}
                        onChange={(e) => updateServer(index, 'name', e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
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
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        placeholder="https://mcp.example.com/mcp/"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => validateServer(index)}
                        disabled={!server.name || !server.url || isValidating === server.name}
                        className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm flex items-center space-x-1"
                      >
                        {isValidating === server.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <span>Validate</span>
                        )}
                      </button>

                      {/* Status indicator */}
                      {server.status === 'valid' && (
                        <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Valid ({server.tools?.length || 0} tools)</span>
                        </div>
                      )}
                      {server.status === 'invalid' && (
                        <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">Invalid</span>
                        </div>
                      )}
                      {server.status === 'validating' && (
                        <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Validating...</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeServer(index)}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {server.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-600 dark:text-red-400">
                      {server.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={addServer}
              className="mt-3 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Server</span>
            </button>
          </div>

          {/* Available Tools Section */}
          {totalTools > 0 && (
            <div>
              <h3 className="text-md font-medium text-slate-900 dark:text-slate-100 mb-3">
                Available Tools:
              </h3>

              <div className="border border-slate-200 dark:border-slate-600 rounded-md p-3">
                {/* Search and controls */}
                <div className="mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search tools..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={selectAllTools}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Select All
                    </button>
                    <button
                      onClick={selectNoTools}
                      className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {/* Tools list */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredTools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-start space-x-2 p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                    >
                      <button
                        onClick={() => toggleTool(tool.name)}
                        className="mt-0.5"
                      >
                        {configuration.selectedTools.has(tool.name) ? (
                          <CheckSquare className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tool.name}
                        </div>
                        {tool.description && (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {tool.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Selected: {selectedCount} of {totalTools} tools
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-slate-200 dark:border-slate-600">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};