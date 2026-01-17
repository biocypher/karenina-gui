// API endpoint constants
export const API_ENDPOINTS = {
  // Server info
  TIMESTAMP: '/api/timestamp',

  // Verification endpoints
  START_VERIFICATION: '/api/start-verification',
  VERIFICATION_PROGRESS: (jobId: string) => `/api/verification-progress/${jobId}`,
  CANCEL_VERIFICATION: (jobId: string) => `/api/cancel-verification/${jobId}`,
  EXPORT_VERIFICATION: (jobId: string, format: string) => `/api/export-verification/${jobId}?fmt=${format}`,
  VERIFICATION_SUMMARY: '/api/verification/summary',
  VERIFICATION_COMPARE: '/api/verification/compare-models',

  // Template generation endpoints
  GENERATE_TEMPLATES: '/api/generate-answer-templates',
  GENERATION_PROGRESS: (jobId: string) => `/api/generation-progress/${jobId}`,
  CANCEL_GENERATION: (jobId: string) => `/api/cancel-generation/${jobId}`,

  // File operation endpoints
  UPLOAD_FILE: '/api/upload-file',
  PREVIEW_FILE: '/api/preview-file',
  EXTRACT_QUESTIONS: '/api/extract-questions',
  UPLOAD_TRACES: '/api/upload-manual-traces',

  // Database endpoints
  DATABASE_BENCHMARKS: (storageUrl: string) => `/api/database/benchmarks?storage_url=${encodeURIComponent(storageUrl)}`,
  DATABASE_LOAD: '/api/database/load-benchmark',
  DATABASE_SAVE: '/api/database/save-benchmark',
  DATABASE_CREATE: '/api/database/create-benchmark',
  DATABASE_DELETE: '/api/database/delete-benchmark',
  DATABASE_RESOLVE_DUPLICATES: '/api/database/resolve-duplicates',
  DATABASE_IMPORT_RESULTS: '/api/database/import-results',
  DATABASE_CONNECT: '/api/database/connect',
  DATABASE_LIST: '/api/database/list-databases',
  DATABASE_DELETE_DB: '/api/database/delete',

  // MCP endpoints
  MCP_PRESETS: '/api/get-mcp-preset-configs',
  MCP_VALIDATE: '/api/validate-mcp-server',
  MCP_SAVE_PRESET: '/api/save-mcp-preset',
} as const;

// HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

// Common headers
export const HEADERS = {
  CONTENT_TYPE_JSON: { 'Content-Type': 'application/json' },
} as const;
