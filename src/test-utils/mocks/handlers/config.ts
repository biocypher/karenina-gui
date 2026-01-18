/**
 * MSW handlers for configuration endpoints
 */
import { http, HttpResponse } from 'msw';

export const mockEnvVars = {
  ANTHROPIC_API_KEY: '***masked***',
  OPENAI_API_KEY: '***masked***',
  GOOGLE_API_KEY: '***masked***',
};

export const mockDefaults = {
  default_model_provider: 'anthropic',
  default_model_name: 'claude-haiku-4-5',
  default_temperature: 0.1,
  default_interface: 'langchain',
};

export const configHandlers = [
  // V2 endpoints
  // Get environment variables - masked (V2)
  http.get('/api/v2/config/env-vars', () => {
    return HttpResponse.json(mockEnvVars);
  }),

  // Get environment variables - unmasked (V2)
  http.get('/api/v2/config/env-vars/unmasked', () => {
    return HttpResponse.json({
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
      OPENAI_API_KEY: 'sk-test-key',
      GOOGLE_API_KEY: 'test-google-key',
    });
  }),

  // Update environment variable (V2 - uses PUT)
  http.put('/api/v2/config/env-vars', () => {
    return HttpResponse.json({
      message: 'Environment variable updated',
    });
  }),

  // Update environment variables in bulk (V2 - uses PUT)
  http.put('/api/v2/config/env-vars/bulk', () => {
    return HttpResponse.json({
      message: 'All variables updated successfully',
      updated: [],
    });
  }),

  // Delete environment variable (V2)
  http.delete('/api/v2/config/env-vars/:key', () => {
    return HttpResponse.json({
      message: 'Environment variable removed',
    });
  }),

  // Get env file contents (V2)
  http.get('/api/v2/config/env-file', () => {
    return HttpResponse.json({
      content: 'ANTHROPIC_API_KEY=sk-ant-test\nOPENAI_API_KEY=sk-test',
    });
  }),

  // Update env file (V2 - uses PUT)
  http.put('/api/v2/config/env-file', () => {
    return HttpResponse.json({
      message: 'Successfully updated .env file',
    });
  }),

  // Get defaults (V2)
  http.get('/api/v2/config/defaults', () => {
    return HttpResponse.json(mockDefaults);
  }),

  // Update defaults (V2 - uses PUT)
  http.put('/api/v2/config/defaults', () => {
    return HttpResponse.json({
      message: 'Default configuration saved successfully',
      config: mockDefaults,
    });
  }),

  // V2 Auth - CSRF token
  http.get('/api/v2/auth/csrf-token', () => {
    return HttpResponse.json({
      token: 'test-csrf-token-v2',
    });
  }),

  // Get server timestamp
  http.get('/api/timestamp', () => {
    return HttpResponse.json({
      timestamp: Date.now(),
      iso: new Date().toISOString(),
    });
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'healthy' });
  }),
];
