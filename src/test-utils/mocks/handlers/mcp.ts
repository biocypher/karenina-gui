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
  http.post('/api/v2/mcp/servers/validation', async ({ request }) => {
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

  // Save MCP preset (v2: PUT with name in path)
  http.put('/api/v2/mcp/presets/:name', async ({ request, params }) => {
    const body = await request.json();
    const { name } = params;
    return HttpResponse.json({
      success: true,
      preset_id: 'mcp-preset-1',
      name,
      ...body,
    });
  }),

  // Get MCP presets
  http.get('/api/v2/mcp/presets', () => {
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
