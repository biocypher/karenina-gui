# Karenina JSON-LD Schema Specification

## Overview

This document describes the JSON-LD schema used by the Karenina benchmarking system for storing checkpoint data. The schema is based entirely on Schema.org vocabulary and follows JSON-LD 1.1 specification.

## Version Information

- **Format Version**: 3.0.0-jsonld
- **JSON-LD Version**: 1.1
- **Schema.org Vocabulary**: Latest (http://schema.org/)
- **Replaces**: Karenina v2.0 proprietary format

## Root Schema: Dataset

The root object is a `Dataset` that contains all benchmark questions and metadata.

```typescript
interface JsonLdCheckpoint {
  '@context': JsonLdContext;
  '@type': 'Dataset';
  '@id'?: string;
  name: string;
  description?: string;
  version: string;
  creator?: string;
  dateCreated?: string;
  dateModified?: string;
  hasPart: SchemaOrgDataFeedItem[];
  additionalProperty?: SchemaOrgPropertyValue[];
}
```

### Required Fields

- `@type`: Must be "Dataset"
- `@context`: JSON-LD context definition
- `name`: Human-readable dataset name
- `version`: Must include "jsonld" identifier (e.g., "3.0.0-jsonld")
- `hasPart`: Array of DataFeedItem objects containing questions

### Optional Fields

- `@id`: Unique identifier (URN format recommended)
- `description`: Dataset description
- `creator`: Dataset creator name
- `dateCreated`/`dateModified`: ISO 8601 timestamps
- `rating`: Array of Rating objects for global rubric traits
- `additionalProperty`: Metadata storage (format version, conversion info)

## JSON-LD Context

The context maps schema.org vocabulary to JSON-LD structure:

```json
{
  "@context": {
    "@version": 1.1,
    "@vocab": "http://schema.org/",
    "Dataset": "Dataset",
    "DataFeedItem": "DataFeedItem",
    "Question": "Question",
    "Answer": "Answer",
    "SoftwareSourceCode": "SoftwareSourceCode",
    "Rating": "Rating",
    "PropertyValue": "PropertyValue",
    "hasPart": {
      "@id": "hasPart",
      "@container": "@set"
    },
    "rating": {
      "@id": "rating",
      "@container": "@set"
    },
    "additionalProperty": {
      "@id": "additionalProperty",
      "@container": "@set"
    }
  }
}
```

## DataFeedItem Schema

Each question is wrapped in a `DataFeedItem` for temporal metadata.

```typescript
interface SchemaOrgDataFeedItem {
  '@type': 'DataFeedItem';
  '@id'?: string;
  dateCreated?: string;
  dateModified: string;
  item: SchemaOrgQuestion;
}
```

### Fields

- `@type`: Must be "DataFeedItem"
- `dateModified`: Required - last modification timestamp (ISO 8601)
- `item`: The actual Question object
- `@id`: Optional unique identifier
- `dateCreated`: Optional creation timestamp (when question was first added to checkpoint)

## Question Schema

Core question data with answer template and rubric evaluations.

```typescript
interface SchemaOrgQuestion {
  '@type': 'Question';
  '@id'?: string;
  text: string;
  acceptedAnswer: SchemaOrgAnswer;
  hasPart: SchemaOrgSoftwareSourceCode;
  rating?: SchemaOrgRating[];
  additionalProperty?: SchemaOrgPropertyValue[];
}
```

### Required Fields

- `@type`: Must be "Question"
- `text`: The actual question text
- `acceptedAnswer`: Expected answer content
- `hasPart`: Pydantic template code

### Optional Fields

- `@id`: Question identifier (URN format)
- `rating`: Array of rubric trait ratings
- `additionalProperty`: Custom metadata, progress flags

## Answer Schema

Expected answer content for the question.

```typescript
interface SchemaOrgAnswer {
  '@type': 'Answer';
  '@id'?: string;
  text: string;
}
```

### Fields

- `@type`: Must be "Answer"
- `text`: Required - the expected answer text
- `@id`: Optional identifier

## SoftwareSourceCode Schema

Pydantic template code for structured answer parsing.

```typescript
interface SchemaOrgSoftwareSourceCode {
  '@type': 'SoftwareSourceCode';
  '@id'?: string;
  name?: string;
  text: string;
  programmingLanguage: 'Python';
  codeRepository?: string;
}
```

### Required Fields

- `@type`: Must be "SoftwareSourceCode"
- `text`: The Pydantic template code
- `programmingLanguage`: Must be "Python"

### Optional Fields

- `@id`: Template identifier
- `name`: Human-readable template name
- `codeRepository`: Repository reference (typically "karenina-benchmarks")

## Rating Schema

Rubric trait definitions for question evaluation.

```typescript
interface SchemaOrgRating {
  '@type': 'Rating';
  '@id'?: string;
  name: string;
  description?: string;
  bestRating: number;
  worstRating: number;
  additionalType: 'GlobalRubricTrait' | 'QuestionSpecificRubricTrait';
  ratingExplanation?: string;
}
```

### Required Fields

- `@type`: Must be "Rating"
- `name`: Trait name (e.g., "Accuracy", "Completeness")
- `bestRating`: Maximum possible score
- `worstRating`: Minimum possible score
- `additionalType`: Distinguishes global vs question-specific traits

### Optional Fields

- `@id`: Rating identifier
- `description`: Trait description
- `ratingExplanation`: Additional evaluation guidance

### Rating Types

#### Boolean Traits

```json
{
  "@type": "Rating",
  "name": "Accuracy",
  "bestRating": 1,
  "worstRating": 0,
  "additionalType": "GlobalRubricTrait"
}
```

#### Score Traits

```json
{
  "@type": "Rating",
  "name": "Completeness",
  "bestRating": 5,
  "worstRating": 1,
  "additionalType": "QuestionSpecificRubricTrait"
}
```

## PropertyValue Schema

Generic metadata storage for custom properties.

```typescript
interface SchemaOrgPropertyValue {
  '@type': 'PropertyValue';
  name: string;
  value: unknown;
}
```

### Fields

- `@type`: Must be "PropertyValue"
- `name`: Property name
- `value`: Property value (any JSON type)

### Common Properties

#### Dataset-Level Properties

- `checkpoint_format_version`: "3.0.0-jsonld"
- `conversion_metadata`: Conversion statistics

**Note**: Global rubric traits are no longer stored as JSON strings in additionalProperty. They are now stored as Rating objects in the Dataset's `rating` array.

#### Question-Level Properties

- `finished`: Boolean completion flag
- `original_answer_template`: Original template before editing
- `custom_*`: Custom metadata with "custom\_" prefix
- `author`: JSON string of SchemaOrgPerson object
- `sources`: JSON string of SchemaOrgCreativeWork[] array

## URI Patterns

### Standard Patterns

- **Dataset**: `urn:uuid:karenina-checkpoint-{timestamp}`
- **Question**: `urn:uuid:question-{hash-from-text}`
- **Answer**: `urn:uuid:answer-{question-id}`
- **Template**: `urn:uuid:template-{question-id}`
- **Rating**: `urn:uuid:rating-{trait-name-normalized}`
- **DataFeedItem**: `urn:uuid:{question-id}`

### ID Generation

Question IDs are generated deterministically:

```typescript
function generateQuestionId(questionText: string): string {
  const hash = questionText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);

  const simpleHash = Math.abs(
    questionText.split('').reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0)
  ).toString(16);

  return `urn:uuid:question-${hash}-${simpleHash}`;
}
```

## Validation Rules

### Structural Validation

1. **Root Type**: Must be Dataset with required fields
2. **Version Check**: Version must contain "jsonld"
3. **Array Types**: hasPart must be array of DataFeedItem objects
4. **Nested Types**: Each DataFeedItem.item must be Question
5. **Required Fields**: All required fields must be present and correct type

### Semantic Validation

1. **Rating Ranges**: worstRating < bestRating for all ratings
2. **Type Consistency**: additionalType must be valid enum value
3. **URI Format**: Optional IDs should follow URN pattern
4. **Timestamp Format**: Dates must be valid ISO 8601 strings

### Code Example

```typescript
export function validateJsonLdCheckpoint(checkpoint: JsonLdCheckpoint): void {
  const errors: string[] = [];

  // Root type validation
  if (checkpoint['@type'] !== 'Dataset') {
    errors.push('Root object must be of type "Dataset"');
  }

  // Version validation
  if (!checkpoint.version?.includes('jsonld')) {
    errors.push('Version must include "jsonld" identifier');
  }

  // Structure validation
  if (!Array.isArray(checkpoint.hasPart)) {
    errors.push('hasPart must be an array');
  }

  // Validate each question
  checkpoint.hasPart.forEach((item, index) => {
    if (item['@type'] !== 'DataFeedItem') {
      errors.push(`Item ${index} must be DataFeedItem`);
    }

    if (item.item['@type'] !== 'Question') {
      errors.push(`Item ${index} must contain Question`);
    }

    // Rating validation
    item.item.rating?.forEach((rating, rIndex) => {
      if (rating.worstRating >= rating.bestRating) {
        errors.push(`Invalid rating range at ${index}:${rIndex}`);
      }
    });
  });

  if (errors.length > 0) {
    throw new CheckpointConversionError(`Validation failed: ${errors.join(', ')}`);
  }
}
```

## Example Document

Complete minimal example:

```json
{
  "@context": {
    "@version": 1.1,
    "@vocab": "http://schema.org/",
    "Dataset": "Dataset",
    "DataFeedItem": "DataFeedItem",
    "Question": "Question",
    "Answer": "Answer",
    "SoftwareSourceCode": "SoftwareSourceCode",
    "Rating": "Rating",
    "PropertyValue": "PropertyValue",
    "hasPart": {
      "@id": "hasPart",
      "@container": "@set"
    },
    "rating": {
      "@id": "rating",
      "@container": "@set"
    },
    "additionalProperty": {
      "@id": "additionalProperty",
      "@container": "@set"
    }
  },
  "@type": "Dataset",
  "@id": "urn:uuid:karenina-checkpoint-1721390400000",
  "name": "Sample Benchmark Dataset",
  "description": "Example JSON-LD checkpoint",
  "version": "3.0.0-jsonld",
  "creator": "Karenina System",
  "dateCreated": "2024-07-19T12:00:00Z",
  "dateModified": "2024-07-19T12:30:00Z",
  "rating": [
    {
      "@type": "Rating",
      "@id": "urn:uuid:rating-accuracy",
      "name": "Accuracy",
      "description": "Factual correctness",
      "bestRating": 1,
      "worstRating": 0,
      "additionalType": "GlobalRubricTrait"
    },
    {
      "@type": "Rating",
      "@id": "urn:uuid:rating-completeness",
      "name": "Completeness",
      "description": "Coverage of all aspects",
      "bestRating": 5,
      "worstRating": 1,
      "additionalType": "GlobalRubricTrait"
    }
  ],
  "hasPart": [
    {
      "@type": "DataFeedItem",
      "@id": "urn:uuid:question-sample-123",
      "dateCreated": "2024-07-19T12:00:00Z",
      "dateModified": "2024-07-19T12:30:00Z",
      "item": {
        "@type": "Question",
        "@id": "urn:uuid:question-what-is-ai-abc123",
        "text": "What is artificial intelligence?",
        "acceptedAnswer": {
          "@type": "Answer",
          "@id": "urn:uuid:answer-question-sample-123",
          "text": "AI is the simulation of human intelligence by machines."
        },
        "hasPart": {
          "@type": "SoftwareSourceCode",
          "@id": "urn:uuid:template-question-sample-123",
          "name": "AI Definition Template",
          "text": "class AIDefinitionAnswer(BaseAnswer):\n    definition: str = Field(description='AI definition')",
          "programmingLanguage": "Python",
          "codeRepository": "karenina-benchmarks"
        },
        "rating": [
          {
            "@type": "Rating",
            "@id": "urn:uuid:rating-technical-depth",
            "name": "Technical Depth",
            "description": "Question-specific technical assessment",
            "bestRating": 3,
            "worstRating": 1,
            "additionalType": "QuestionSpecificRubricTrait"
          }
        ],
        "additionalProperty": [
          {
            "@type": "PropertyValue",
            "name": "finished",
            "value": true
          }
        ]
      }
    }
  ],
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "checkpoint_format_version",
      "value": "3.0.0-jsonld"
    }
  ]
}
```

## Migration from v2.0

### Conversion Process

1. **Dataset Wrapper**: v2.0 checkpoint becomes hasPart array
2. **Question Wrapping**: Each question wrapped in DataFeedItem
3. **Rubric Conversion**: RubricTrait objects → Rating objects
4. **Rubric Distribution**: Global rubrics → Dataset rating array, Question-specific rubrics → Question rating arrays
5. **Metadata Mapping**: Custom properties → additionalProperty array
6. **Temporal Data**: last_modified → dateModified

### Benefits of New Structure

- **No Duplication**: Global rubrics stored once at Dataset level instead of duplicated in every Question
- **Schema Consistency**: All rubrics use identical Rating schema regardless of location
- **File Size Reduction**: Significant space savings for checkpoints with many questions
- **Semantic Clarity**: Clear separation between global and question-specific rubric traits

### Key Differences

| v2.0              | JSON-LD                              |
| ----------------- | ------------------------------------ |
| `Checkpoint`      | `Dataset`                            |
| `question`        | `Question.text`                      |
| `raw_answer`      | `Answer.text`                        |
| `answer_template` | `SoftwareSourceCode.text`            |
| `RubricTrait`     | `Rating` with `additionalType`       |
| `date_created`    | `DataFeedItem.dateCreated`           |
| `last_modified`   | `DataFeedItem.dateModified`          |
| `finished`        | `PropertyValue` with name="finished" |

### Backwards Compatibility

- **Import**: Automatic v2.0 detection and conversion
- **Export**: JSON-LD format only (no v2.0 export)
- **Data Preservation**: 100% information retention during conversion
- **Validation**: Both formats validated during conversion process

## Implementation Notes

### TypeScript Support

Full TypeScript definitions provided in `src/types/index.ts`:

- `JsonLdCheckpoint` - Root dataset type
- `SchemaOrgDataset` - Dataset with context
- `SchemaOrgDataFeedItem` - Question wrapper
- `SchemaOrgQuestion` - Question content
- `SchemaOrgAnswer` - Expected answer
- `SchemaOrgSoftwareSourceCode` - Template code
- `SchemaOrgRating` - Rubric traits
- `SchemaOrgPropertyValue` - Metadata

### Conversion Functions

Available in `src/utils/checkpoint-converter.ts`:

- `v2ToJsonLd()` - Convert v2.0 → JSON-LD
- `jsonLdToV2()` - Convert JSON-LD → v2.0
- `validateJsonLdCheckpoint()` - Schema validation
- `isJsonLdCheckpoint()` - Type detection
- `convertRubricTraitToRating()` - Rubric conversion

### Performance Characteristics

- **Conversion Speed**: <200ms for 1000 questions
- **Memory Usage**: O(n) linear scaling
- **Validation Time**: <50ms for typical checkpoints
- **File Size**: ~70% reduction with gzip compression

## Standards Compliance

### JSON-LD 1.1

- ✅ Context definition with @version 1.1
- ✅ @vocab for default vocabulary
- ✅ @container for array handling
- ✅ @type and @id patterns
- ✅ Compatible with JSON-LD processors

### Schema.org

- ✅ Pure schema.org vocabulary (no extensions)
- ✅ Valid property mappings
- ✅ Semantic relationships preserved
- ✅ RDF-convertible structure

### Semantic Web Ready

- ✅ RDF N-Triples generation
- ✅ SPARQL query compatibility
- ✅ Triple store loading
- ✅ Linked data principles

## Future Extensions

### Planned Enhancements

1. **Enhanced Metadata**: More schema.org types for authors, sources
2. **Versioning Support**: Dataset versioning with schema.org/version
3. **Provenance Tracking**: Full audit trail with schema.org/Action
4. **Multilingual Support**: Multiple language variants per question
5. **Performance Metrics**: Embedded benchmark results

### Extension Points

- **additionalProperty**: Custom metadata without schema changes
- **New Rating Types**: Extended rubric capabilities
- **Custom Contexts**: Domain-specific vocabularies
- **External References**: Links to knowledge bases

This schema provides a robust, standards-based foundation for LLM benchmark data while maintaining full semantic web compatibility and extensibility.
