/**
 * MSW handlers for template generation endpoints
 */
import { http, HttpResponse } from 'msw';
import type { TemplateGenerationProgress, TemplateGenerationResult } from '../../../types';

export const templateGenerationHandlers = [
  // Start template generation
  http.post('/api/generate-answer-templates', () => {
    return HttpResponse.json({
      job_id: 'job-123',
    });
  }),

  // Get generation progress
  http.get('/api/generation-progress/:jobId', ({ params }) => {
    const progress: TemplateGenerationProgress = {
      job_id: params.jobId as string,
      status: 'completed',
      percentage: 100,
      current_question: 'q2',
      processed_count: 2,
      total_count: 2,
      in_progress_questions: [],
      result: {
        templates: {
          q1: {
            question_id: 'q1',
            template_code: 'class Answer(BaseModel):\n    capital: str = Field(description="Capital city")',
            generation_time: 1500,
            success: true,
          },
          q2: {
            question_id: 'q2',
            template_code: 'class Answer(BaseModel):\n    result: int = Field(description="Math result")',
            generation_time: 1200,
            success: true,
          },
        },
        total_templates: 2,
        successful_generations: 2,
        failed_generations: 0,
        average_generation_time: 1350,
        model_info: {
          name: 'gemini-2.0-flash',
          provider: 'google_genai',
          temperature: 0.1,
        },
      } as TemplateGenerationResult,
    };
    return HttpResponse.json(progress);
  }),

  // Cancel generation
  http.post('/api/cancel-generation/:jobId', () => {
    return HttpResponse.json({ success: true });
  }),
];
