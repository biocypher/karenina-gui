import React from 'react';
import { X, AlertCircle, Settings } from 'lucide-react';
import { useMCPState, MCPQuickConfiguration, MCPServerList, MCPTools } from './mcp';

// ============================================================================
// Types
// ============================================================================

export interface MCPConfigurationModalProps {
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

// ============================================================================
// Main Component
// ============================================================================

export const MCPConfigurationModal: React.FC<MCPConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}) => {
  // Use custom hook for all state management
  const {
    configuration,
    searchTerm,
    setSearchTerm,
    isValidating,
    presetConfigs,
    presetError,
    savingPresetForServer,
    useFullTraceForTemplate,
    setUseFullTraceForTemplate,
    useFullTraceForRubric,
    setUseFullTraceForRubric,
    addPresetServer,
    addServer,
    removeServer,
    updateServer,
    validateServer,
    toggleTool,
    selectAllTools,
    selectNoTools,
    getAllToolsIncludingSelected,
    getAllTools,
    getFilteredTools,
    getPresetButtonLabel,
    saveServerAsPreset,
    hasConfigurationChanged,
  } = useMCPState({
    isOpen,
    initialConfig,
  });

  // Handle save
  const handleSave = () => {
    const mcp_urls_dict: Record<string, string> = {};
    const mcp_validated_servers: Record<string, string> = {};

    configuration.servers
      .filter((server) => {
        return (server.status === 'valid' || (server.name && server.url)) && server.name && server.url;
      })
      .forEach((server) => {
        mcp_urls_dict[server.name] = server.url;
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

  const canSave = hasConfigurationChanged();
  const totalTools = getAllToolsIncludingSelected().length;
  const availableTools = getAllTools().length;
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
          <MCPQuickConfiguration
            presetConfigs={presetConfigs}
            presetError={presetError}
            onAddPresetServer={addPresetServer}
          />

          {/* MCP Servers Section */}
          <MCPServerList
            servers={configuration.servers}
            isValidating={isValidating}
            savingPresetForServer={savingPresetForServer}
            onUpdateServer={updateServer}
            onValidateServer={validateServer}
            onRemoveServer={removeServer}
            onAddServer={addServer}
            onSavePreset={saveServerAsPreset}
            getPresetButtonLabel={getPresetButtonLabel}
          />

          {/* Available Tools Section */}
          <MCPTools
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredTools={filteredTools}
            selectedTools={configuration.selectedTools}
            selectedCount={selectedCount}
            totalTools={totalTools}
            availableTools={availableTools}
            onToggleTool={toggleTool}
            onSelectAll={selectAllTools}
            onSelectNone={selectNoTools}
          />
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
