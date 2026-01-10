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
  // List all presets
  http.get('/api/presets', () => {
    return HttpResponse.json({
      presets: mockPresets,
    });
  }),

  // Get single preset
  http.get('/api/presets/:presetId', ({ params }) => {
    const preset = mockPresets.find((p) => p.id === params.presetId);
    if (preset) {
      return HttpResponse.json(preset);
    }
    return HttpResponse.json({ error: 'Preset not found' }, { status: 404 });
  }),

  // Create preset
  http.post('/api/presets', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'preset-new',
      ...body,
    });
  }),

  // Update preset
  http.put('/api/presets/:presetId', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: params.presetId,
      ...body,
      updated: true,
    });
  }),

  // Delete preset
  http.delete('/api/presets/:presetId', () => {
    return HttpResponse.json({
      success: true,
      message: 'Preset deleted',
    });
  }),
];
