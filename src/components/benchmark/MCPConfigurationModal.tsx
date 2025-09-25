import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, CheckSquare, Square, Loader2, AlertCircle, CheckCircle, Settings } from 'lucide-react';
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
            status: 'idle', // Will be validated automatically
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

  // Removed auto-validation - validation now happens only when user clicks "Validate"

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
      .filter(server => {
        // Include servers that are valid, or servers that have name and URL
        // (which means they were previously saved and are being revalidated)
        return (server.status === 'valid' || (server.name && server.url)) && server.name && server.url;
      })
      .forEach(server => {
        mcp_urls_dict[server.name] = server.url;
      });

    const mcp_tool_filter = Array.from(configuration.selectedTools);

    onSave({ mcp_urls_dict, mcp_tool_filter });
  };

  // Allow saving if we have servers with name/URL and selected tools (regardless of validation status)
  const canSave = configuration.servers.some(server => server.name && server.url) && configuration.selectedTools.size > 0;
  const totalTools = getAllTools().length;
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
                <p className="text-sm text-slate-500 dark:text-slate-400">Configure Model Context Protocol servers and tools</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-900/30">
          {/* MCP Servers Section */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                MCP Servers
              </h3>
              <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
            </div>

            <div className="space-y-4">
              {configuration.servers.map((server, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 via-purple-500/10 to-cyan-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 blur-sm"></div>
                  <div className="relative border border-slate-200/60 dark:border-slate-600/60 rounded-xl p-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all duration-200 shadow-sm hover:shadow-md"
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
          {totalTools > 0 && (
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Available Tools
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-slate-300/50 to-transparent dark:from-slate-600/50"></div>
                <div className="px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
                  {totalTools} discovered
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
                    <div
                      key={tool.name}
                      className="group relative"
                    >
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-blue-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 blur-sm"></div>
                      <div className="relative flex items-start space-x-3 p-3 hover:bg-white/60 dark:hover:bg-slate-800/60 rounded-lg transition-all duration-200 backdrop-blur-sm border border-transparent group-hover:border-slate-200/50 dark:group-hover:border-slate-600/50">
                        <button
                          onClick={() => toggleTool(tool.name)}
                          className="mt-0.5 group/checkbox"
                        >
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
                  Selected: <span className="font-medium text-slate-700 dark:text-slate-300">{selectedCount}</span> of <span className="font-medium text-slate-700 dark:text-slate-300">{totalTools}</span> tools
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
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 font-medium"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};