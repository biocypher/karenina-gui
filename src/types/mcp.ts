/**
 * MCP (Model Context Protocol) types
 * Data structures for MCP server and tool configuration
 */

export interface MCPTool {
  name: string;
  description?: string;
}

export interface MCPServer {
  name: string;
  url: string;
  status: 'idle' | 'validating' | 'valid' | 'invalid';
  tools?: MCPTool[];
  error?: string;
  presetTools?: string[]; // Tools to auto-select from preset configuration
}

export interface MCPConfiguration {
  servers: MCPServer[];
  selectedTools: Set<string>;
}

export interface MCPValidationRequest {
  server_name: string;
  server_url: string;
}

export interface MCPValidationResponse {
  success: boolean;
  tools?: MCPTool[];
  error?: string;
}

export interface MCPPresetConfig {
  name: string;
  url: string;
  tools?: string[];
}

export interface MCPPresetsResponse {
  presets: Record<string, MCPPresetConfig>;
  error?: string;
}
