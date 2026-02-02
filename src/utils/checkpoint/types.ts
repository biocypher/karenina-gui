/**
 * Checkpoint Converter Types
 * Shared types and constants for checkpoint conversion
 */

/**
 * Error class for checkpoint conversion failures
 */
export class CheckpointConversionError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'CheckpointConversionError';
  }
}

/**
 * Options for checkpoint conversion operations
 */
export type ConversionOptions = {
  preserveIds?: boolean; // Whether to preserve question IDs in URN format
  includeMetadata?: boolean; // Whether to include conversion metadata
  validateOutput?: boolean; // Whether to validate the converted output
  isCreation?: boolean; // Whether this is a new checkpoint creation vs. modification
};

/**
 * Default conversion options
 */
export const DEFAULT_CONVERSION_OPTIONS: ConversionOptions = {
  preserveIds: true,
  includeMetadata: true,
  validateOutput: true,
  isCreation: false, // Default to update behavior (preserve existing dateCreated)
};

/**
 * Schema.org JSON-LD context
 */
export const schemaOrgContext = {
  '@context': {
    '@version': 1.1,
    '@vocab': 'http://schema.org/',
    DataFeed: 'DataFeed',
    DataFeedItem: 'DataFeedItem',
    Question: 'Question',
    Answer: 'Answer',
    SoftwareSourceCode: 'SoftwareSourceCode',
    Rating: 'Rating',
    PropertyValue: 'PropertyValue',
    version: 'version',
    name: 'name',
    description: 'description',
    creator: 'creator',
    dateCreated: 'dateCreated',
    dateModified: 'dateModified',
    dataFeedElement: { '@id': 'dataFeedElement', '@container': '@set' },
    item: { '@id': 'item', '@type': '@id' },
    text: 'text',
    acceptedAnswer: { '@id': 'acceptedAnswer', '@type': '@id' },
    programmingLanguage: 'programmingLanguage',
    codeRepository: 'codeRepository',
    rating: { '@id': 'rating', '@container': '@set' },
    bestRating: 'bestRating',
    worstRating: 'worstRating',
    ratingExplanation: 'ratingExplanation',
    additionalType: 'additionalType',
    additionalProperty: { '@id': 'additionalProperty', '@container': '@set' },
    value: 'value',
    url: 'url',
    identifier: 'identifier',
    keywords: { '@id': 'keywords', '@container': '@set' },
  },
} as const;
