/**
 * MSW handlers for MCP (Model Context Protocol) endpoints
 */
import { http, HttpResponse } from 'msw';

export const mockMcpTools = [
  { name: 'search', description: 'Search the web' },
  { name: 'calculator', description: 'Perform calculations' },
  { name: 'file_reader', description: 'Read files' },
];

export const mcpHandlers = [
  // Validate MCP server
  http.post('/api/validate-mcp-server', async ({ request }) => {
    const body = (await request.json()) as { server_url?: string };

    // Simulate validation - fail for invalid URLs
    if (!body.server_url || !body.server_url.startsWith('http')) {
      return HttpResponse.json({ success: false, error: 'Invalid server URL' }, { status: 400 });
    }

    return HttpResponse.json({
      success: true,
      tools: mockMcpTools,
    });
  }),

  // Save MCP preset
  http.post('/api/save-mcp-preset', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      preset_id: 'mcp-preset-1',
      ...body,
    });
  }),

  // Get MCP presets
  http.get('/api/get-mcp-preset-configs', () => {
    return HttpResponse.json({
      presets: {
        'local-tools': {
          name: 'local-tools',
          url: 'http://localhost:8000',
          tools: ['search', 'calculator'],
        },
      },
    });
  }),
];
