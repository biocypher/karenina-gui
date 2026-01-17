/**
 * MSW handlers for file upload and question extraction endpoints
 */
import { http, HttpResponse } from 'msw';
import type { QuestionData } from '../../../types';

// Mock data
export const mockQuestionData: QuestionData = {
  q1: {
    question: 'What is the capital of France?',
    raw_answer: 'Paris is the capital of France.',
    answer_template: 'class Answer(BaseModel):\n    capital: str = Field(description="The capital city")',
  },
  q2: {
    question: 'What is 2 + 2?',
    raw_answer: 'Two plus two equals four.',
    answer_template: 'class Answer(BaseModel):\n    result: int = Field(description="The mathematical result")',
  },
};

export const mockFileInfo = {
  file_id: 'test-file-123',
  filename: 'test-questions.xlsx',
  size: 1024,
};

export const mockPreviewData = {
  success: true,
  total_rows: 100,
  columns: ['Question', 'Answer', 'Category'],
  preview_rows: 5,
  data: [
    { Question: 'Sample question 1', Answer: 'Sample answer 1', Category: 'Math' },
    { Question: 'Sample question 2', Answer: 'Sample answer 2', Category: 'Science' },
  ],
};

export const fileUploadHandlers = [
  // File upload endpoint (v2)
  http.post('/api/v2/files', () => {
    return HttpResponse.json(mockFileInfo);
  }),

  // File preview endpoint (v2) - method changed from POST to GET
  http.get('/api/v2/files/:id/preview', () => {
    return HttpResponse.json(mockPreviewData);
  }),

  // Question extraction endpoint (v2)
  http.post('/api/v2/files/:id/questions', () => {
    return HttpResponse.json({
      success: true,
      questions_count: Object.keys(mockQuestionData).length,
      questions_data: mockQuestionData,
    });
  }),

  // Python export endpoint (v2)
  http.post('/api/v2/questions/export', () => {
    return new HttpResponse('# Generated Python file\nprint("Hello World")', {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="questions.py"',
      },
    });
  }),
];
