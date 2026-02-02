/**
 * Question and Schema.org types
 * Core data structures for questions and enhanced metadata
 */

export interface Question {
  question: string;
  raw_answer: string;
  answer_template: string;
  metadata?: {
    author?: SchemaOrgPerson;
    url?: string;
    keywords?: string[];
  };
}

export interface QuestionData {
  [key: string]: Question;
}

// Schema.org compliant types for enhanced metadata
export interface SchemaOrgPerson {
  '@type': 'Person';
  name: string;
  email?: string;
  affiliation?: string;
  url?: string;
}

export interface SchemaOrgOrganization {
  '@type': 'Organization';
  name: string;
  description?: string;
  url?: string;
  email?: string;
}

export interface SchemaOrgCreativeWork {
  '@type': 'CreativeWork' | 'ScholarlyArticle' | 'WebPage';
  name: string;
  author?: SchemaOrgPerson;
  url?: string;
  datePublished?: string;
  publisher?: string;
  identifier?: string; // DOI, ISBN, etc.
  description?: string;
}
