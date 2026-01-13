/**
 * MSW handlers index - aggregates all domain-specific handlers
 */
import { fileUploadHandlers } from './file-upload';
import { templateGenerationHandlers } from './template-generation';
import { rubricHandlers } from './rubric';
import { verificationHandlers } from './verification';
import { databaseHandlers } from './database';
import { configHandlers } from './config';
import { presetHandlers } from './preset';
import { mcpHandlers } from './mcp';

// Export individual handler groups for selective use in tests
export {
  fileUploadHandlers,
  templateGenerationHandlers,
  rubricHandlers,
  verificationHandlers,
  databaseHandlers,
  configHandlers,
  presetHandlers,
  mcpHandlers,
};

// Export mock data for use in tests
export { mockQuestionData, mockFileInfo, mockPreviewData } from './file-upload';
export { mockRubric } from './rubric';
export { mockVerificationResult, mockVerificationProgress, mockSummaryStats } from './verification';
export { mockBenchmarkList } from './database';
export { mockEnvVars, mockDefaults } from './config';
export { mockPresets } from './preset';
export { mockMcpTools } from './mcp';

// Combined handlers for default server setup
export const handlers = [
  ...fileUploadHandlers,
  ...templateGenerationHandlers,
  ...rubricHandlers,
  ...verificationHandlers,
  ...databaseHandlers,
  ...configHandlers,
  ...presetHandlers,
  ...mcpHandlers,
];
