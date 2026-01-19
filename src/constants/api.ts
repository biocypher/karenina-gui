// API endpoint constants - V2 API
export const API_ENDPOINTS = {
  // Server info
  TIMESTAMP: '/api/timestamp',

  // Verification endpoints (V2)
  START_VERIFICATION: '/api/v2/verifications',
  VERIFICATION_PROGRESS: (jobId: string) => `/api/v2/verifications/${jobId}/progress`,
  CANCEL_VERIFICATION: (jobId: string) => `/api/v2/verifications/${jobId}`, // method: DELETE
  EXPORT_VERIFICATION: (jobId: string, format: string) => `/api/v2/verifications/${jobId}/export?fmt=${format}`,
  VERIFICATION_SUMMARY: '/api/v2/verifications/summary',
  VERIFICATION_COMPARE: '/api/v2/verifications/compare',

  // Template generation endpoints (V2)
  GENERATE_TEMPLATES: '/api/v2/templates/generation',
  GENERATION_PROGRESS: (jobId: string) => `/api/v2/templates/generation/${jobId}/progress`,
  CANCEL_GENERATION: (jobId: string) => `/api/v2/templates/generation/${jobId}`, // method: DELETE

  // File operation endpoints (V2)
  UPLOAD_FILE: '/api/v2/files',
  PREVIEW_FILE: (fileId: string) => `/api/v2/files/${fileId}/preview`, // method: GET
  EXTRACT_QUESTIONS: (fileId: string) => `/api/v2/files/${fileId}/questions`,
  UPLOAD_TRACES: '/api/v2/traces',

  // Database endpoints (V2)
  DATABASE_BENCHMARKS: (storageUrl: string) => `/api/v2/benchmarks?storage_url=${encodeURIComponent(storageUrl)}`,
  DATABASE_LOAD: (name: string, storageUrl: string) =>
    `/api/v2/benchmarks/${encodeURIComponent(name)}?storage_url=${encodeURIComponent(storageUrl)}`, // method: GET
  DATABASE_SAVE: (name: string) => `/api/v2/benchmarks/${encodeURIComponent(name)}`, // method: PUT
  DATABASE_CREATE: '/api/v2/benchmarks',
  DATABASE_DELETE: (name: string, storageUrl: string) =>
    `/api/v2/benchmarks/${encodeURIComponent(name)}?storage_url=${encodeURIComponent(storageUrl)}`, // method: DELETE
  DATABASE_RESOLVE_DUPLICATES: (name: string) => `/api/v2/benchmarks/${encodeURIComponent(name)}/duplicates`,
  DATABASE_IMPORT_RESULTS: (name: string) => `/api/v2/benchmarks/${encodeURIComponent(name)}/results`,
  DATABASE_CONNECT: '/api/v2/databases/connections',
  DATABASE_LIST: '/api/v2/databases',
  DATABASE_DELETE_DB: '/api/v2/databases', // method: DELETE

  // MCP endpoints (V2)
  MCP_PRESETS: '/api/v2/mcp/presets',
  MCP_VALIDATE: '/api/v2/mcp/servers/validation',
  MCP_SAVE_PRESET: (name: string) => `/api/v2/mcp/presets/${encodeURIComponent(name)}`, // method: PUT

  // Rubric endpoints (V2)
  RUBRIC_CURRENT: '/api/v2/rubrics/current', // GET, PUT, DELETE

  // Auth endpoints (V2)
  CSRF_TOKEN: '/api/v2/auth/csrf-token', // GET

  // Preset endpoints (V2)
  PRESETS_LIST: '/api/v2/presets', // GET, POST
  PRESET_DETAIL: (presetId: string) => `/api/v2/presets/${presetId}`, // GET, PUT, DELETE

  // Config endpoints (V2)
  CONFIG_ENV_VARS: '/api/v2/config/env-vars', // GET (masked), PUT
  CONFIG_ENV_VARS_UNMASKED: '/api/v2/config/env-vars/unmasked', // GET
  CONFIG_ENV_VARS_BULK: '/api/v2/config/env-vars/bulk', // PUT
  CONFIG_ENV_VAR_DELETE: (key: string) => `/api/v2/config/env-vars/${key}`, // DELETE
  CONFIG_ENV_FILE: '/api/v2/config/env-file', // GET, PUT
  CONFIG_DEFAULTS: '/api/v2/config/defaults', // GET, PUT

  // ADeLe classification endpoints (V2)
  ADELE_TRAITS: '/api/v2/adele/traits', // GET
  ADELE_CLASSIFY: '/api/v2/adele/classify', // POST
  ADELE_CLASSIFY_BATCH: '/api/v2/adele/classify-batch', // POST
  ADELE_BATCH_PROGRESS: (jobId: string) => `/api/v2/adele/classify-batch/${jobId}`, // GET
  ADELE_BATCH_RESULTS: (jobId: string) => `/api/v2/adele/classify-batch/${jobId}/results`, // GET
  ADELE_CANCEL_BATCH: (jobId: string) => `/api/v2/adele/classify-batch/${jobId}`, // DELETE
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
