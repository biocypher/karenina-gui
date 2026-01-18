/**
 * MSW handlers for preset management endpoints
 */
import { http, HttpResponse } from 'msw';

export const mockPresets = [
  {
    id: 'preset-1',
    name: 'Default Preset',
    description: 'Default verification settings',
    config: {
      replicate_count: 1,
      rubric_enabled: false,
      abstention_enabled: false,
    },
  },
  {
    id: 'preset-2',
    name: 'With Rubric',
    description: 'Verification with rubric evaluation',
    config: {
      replicate_count: 1,
      rubric_enabled: true,
      evaluation_mode: 'template_and_rubric',
    },
  },
];

export const presetHandlers = [
  // V2 endpoints
  // List all presets (V2)
  http.get('/api/v2/presets', () => {
    return HttpResponse.json({
      presets: mockPresets,
    });
  }),

  // Get single preset (V2)
  http.get('/api/v2/presets/:presetId', ({ params }) => {
    const preset = mockPresets.find((p) => p.id === params.presetId);
    if (preset) {
      return HttpResponse.json({ preset });
    }
    return HttpResponse.json({ error: 'Preset not found' }, { status: 404 });
  }),

  // Create preset (V2)
  http.post('/api/v2/presets', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      message: 'Preset created successfully',
      preset: {
        id: 'preset-new',
        ...body,
      },
    });
  }),

  // Update preset (V2)
  http.put('/api/v2/presets/:presetId', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      message: 'Preset updated successfully',
      preset: {
        id: params.presetId,
        ...body,
        updated: true,
      },
    });
  }),

  // Delete preset (V2)
  http.delete('/api/v2/presets/:presetId', () => {
    return HttpResponse.json({
      message: 'Preset deleted successfully',
    });
  }),
];
