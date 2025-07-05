// API endpoint constants
export const API_ENDPOINTS = {
  // Server info
  TIMESTAMP: '/api/timestamp',

  // Verification endpoints
  START_VERIFICATION: '/api/start-verification',
  VERIFICATION_PROGRESS: (jobId: string) => `/api/verification-progress/${jobId}`,
  CANCEL_VERIFICATION: (jobId: string) => `/api/cancel-verification/${jobId}`,
  EXPORT_VERIFICATION: (jobId: string, format: string) => `/api/export-verification/${jobId}?fmt=${format}`,
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
