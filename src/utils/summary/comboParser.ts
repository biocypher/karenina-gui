/**
 * Combo Parser Utility
 *
 * Parses model combination strings used throughout the benchmark system.
 * Extracted from SummaryView.tsx for reuse.
 */

export interface ParsedCombo {
  answering: string;
  parsing: string;
  mcp: string;
}

/**
 * Parse a model combination string into its components
 * @param combo - comma-separated string like "gpt-4,claude-3,None" or "model1,model2,mcp1,mcp2"
 * @returns Object with answering, parsing, and mcp components
 */
export function parseCombo(combo: string): ParsedCombo {
  const parts = combo.split(',');
  return {
    answering: parts[0] || 'Unknown',
    parsing: parts[1] || 'Unknown',
    mcp: parts[2] === 'None' ? 'None' : parts.slice(2).join(','),
  };
}

/**
 * Format a parsed combo for display
 * @param parsed - The parsed combo object
 * @returns Multi-line string representation
 */
export function formatCombo(parsed: ParsedCombo): string {
  return `Answering: ${parsed.answering}\nParsing: ${parsed.parsing}\nMCP: ${parsed.mcp}`;
}

/**
 * Create a unique key for answering model configuration (model + MCP)
 * @param combo - The combo string
 * @returns A unique key string
 */
export function getAnsweringKey(combo: string): string {
  const parsed = parseCombo(combo);
  return `${parsed.answering}|${parsed.mcp}`;
}
