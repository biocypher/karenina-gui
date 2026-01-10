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
  // Get environment variables (masked)
  http.get('/api/config/env-vars', () => {
    return HttpResponse.json(mockEnvVars);
  }),

  // Get environment variables (unmasked)
  http.get('/api/config/env-vars/unmasked', () => {
    return HttpResponse.json({
      ANTHROPIC_API_KEY: 'sk-ant-test-key',
      OPENAI_API_KEY: 'sk-test-key',
      GOOGLE_API_KEY: 'test-google-key',
    });
  }),

  // Set environment variable
  http.post('/api/config/env-vars', () => {
    return HttpResponse.json({
      success: true,
      message: 'Environment variable set',
    });
  }),

  // Set environment variables in bulk
  http.post('/api/config/env-vars/bulk', () => {
    return HttpResponse.json({
      success: true,
      message: 'Environment variables updated',
    });
  }),

  // Delete environment variable
  http.delete('/api/config/env-vars/:key', () => {
    return HttpResponse.json({
      success: true,
      message: 'Environment variable deleted',
    });
  }),

  // Get env file contents
  http.get('/api/config/env-file', () => {
    return HttpResponse.json({
      content: 'ANTHROPIC_API_KEY=sk-ant-test\nOPENAI_API_KEY=sk-test',
    });
  }),

  // Update env file
  http.post('/api/config/env-file', () => {
    return HttpResponse.json({
      success: true,
      message: 'Env file updated',
    });
  }),

  // Get defaults
  http.get('/api/config/defaults', () => {
    return HttpResponse.json(mockDefaults);
  }),

  // Update defaults
  http.post('/api/config/defaults', () => {
    return HttpResponse.json({
      success: true,
      message: 'Defaults updated',
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
