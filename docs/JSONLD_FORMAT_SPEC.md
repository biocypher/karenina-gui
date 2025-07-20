# Karenina JSON-LD Format Specification

## Version

**Format Version**: 3.0.0-jsonld  
**Schema.org Version**: Latest  
**JSON-LD Version**: 1.1

## Schema.org Context

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
    "version": "version",
    "name": "name",
    "description": "description",
    "creator": "creator",
    "dateCreated": "dateCreated",
    "dateModified": "dateModified",
    "hasPart": { "@id": "hasPart", "@container": "@set" },
    "item": { "@id": "item", "@type": "@id" },
    "text": "text",
    "acceptedAnswer": { "@id": "acceptedAnswer", "@type": "@id" },
    "programmingLanguage": "programmingLanguage",
    "codeRepository": "codeRepository",
    "rating": { "@id": "rating", "@container": "@set" },
    "ratingValue": "ratingValue",
    "bestRating": "bestRating",
    "worstRating": "worstRating",
    "ratingExplanation": "ratingExplanation",
    "author": "author",
    "additionalProperty": { "@id": "additionalProperty", "@container": "@set" },
    "value": "value",
    "url": "url",
    "identifier": "identifier"
  }
}
```

## Root Structure

### Dataset (Root Object)

**Type**: `Dataset`  
**Description**: Represents a collection of benchmark questions

**Required Properties**:

- `@type`: "Dataset"
- `@context`: Schema.org context object
- `version`: "3.0.0-jsonld"
- `hasPart`: Array of DataFeedItem objects

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:karenina-checkpoint-{timestamp})
- `name`: Human-readable name
- `description`: Dataset description
- `creator`: "Karenina Benchmarking System"
- `dateCreated`: ISO 8601 timestamp
- `dateModified`: ISO 8601 timestamp
- `additionalProperty`: Array of PropertyValue objects

## Question Structure

### DataFeedItem (Question Container)

**Type**: `DataFeedItem`  
**Description**: Individual question with temporal metadata

**Required Properties**:

- `@type`: "DataFeedItem"
- `dateModified`: ISO 8601 timestamp (from v2.0 last_modified)
- `item`: Question object

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:{question-id})
- `dateCreated`: ISO 8601 timestamp

### Question (Question Content)

**Type**: `Question`  
**Description**: The actual question content and associated data

**Required Properties**:

- `@type`: "Question"
- `text`: Question text string
- `acceptedAnswer`: Answer object
- `hasPart`: SoftwareSourceCode object (Pydantic template)

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:question-{hash})
- `rating`: Array of Rating objects (rubric traits)
- `additionalProperty`: Array of PropertyValue objects

### Answer (Expected Answer)

**Type**: `Answer`  
**Description**: The canonical/expected answer

**Required Properties**:

- `@type`: "Answer"
- `text`: Answer text string

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:answer-{question-id})

### SoftwareSourceCode (Pydantic Template)

**Type**: `SoftwareSourceCode`  
**Description**: Answer template code

**Required Properties**:

- `@type`: "SoftwareSourceCode"
- `text`: Pydantic class code
- `programmingLanguage`: "Python"

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:template-{question-id})
- `name`: Template name
- `codeRepository`: "karenina-benchmarks"

## Rubric Structure

### Rating (Rubric Trait)

**Type**: `Rating`  
**Description**: Evaluation criterion with scoring

**Required Properties**:

- `@type`: "Rating"
- `name`: Trait name
- `ratingValue`: Numeric value
- `bestRating`: Maximum possible value
- `worstRating`: Minimum possible value

**Optional Properties**:

- `@id`: URN identifier (urn:uuid:rating-{trait-name})
- `description`: Trait description
- `author`: "Global Rubric" | "Question-Specific Rubric"
- `ratingExplanation`: Additional explanation

**Rating Value Conventions**:

- **Boolean traits**: ratingValue ∈ {0, 1}, bestRating = 1, worstRating = 0
- **Score traits**: ratingValue ∈ [worstRating, bestRating], typically [1, 5]

## Metadata Structure

### PropertyValue (Additional Data)

**Type**: `PropertyValue`  
**Description**: Key-value metadata

**Required Properties**:

- `@type`: "PropertyValue"
- `name`: Property name
- `value`: Property value (any type)

**Standard Properties**:

- `finished`: boolean (completion status)
- `original_answer_template`: string (original Pydantic code)
- `global_rubric_traits`: string (JSON serialized traits)
- `checkpoint_format_version`: "3.0.0-jsonld"
- `conversion_metadata`: string (JSON serialized metadata)

## URI Schemes

### Identifier Patterns

All URN identifiers follow the pattern: `urn:uuid:{type}-{identifier}`

- **Dataset**: `urn:uuid:karenina-checkpoint-{timestamp}`
- **DataFeedItem**: `urn:uuid:{question-id}`
- **Question**: `urn:uuid:question-{text-hash}-{numeric-hash}`
- **Answer**: `urn:uuid:answer-{question-id}`
- **SoftwareSourceCode**: `urn:uuid:template-{question-id}`
- **Rating**: `urn:uuid:rating-{trait-name-normalized}`

### Hash Generation

Question identifiers use deterministic hashing:

```javascript
const hash = questionText
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, '')
  .replace(/\s+/g, '-')
  .substring(0, 50);

const numericHash = Math.abs(questionText.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) & a, 0)).toString(
  16
);
```

## Validation Rules

### Structure Validation

1. Root object must be `Dataset` with valid `@context`
2. Version must include "jsonld" string
3. All `hasPart` items must be `DataFeedItem` objects
4. Each `DataFeedItem.item` must be a `Question`
5. Each `Question` must have `acceptedAnswer` and `hasPart`

### Rating Validation

1. `ratingValue` must be numeric
2. `ratingValue` ∈ [worstRating, bestRating]
3. Boolean traits: bestRating = 1, worstRating = 0
4. Score traits: bestRating > worstRating

### Schema.org Compliance

1. All `@type` values must be valid schema.org types
2. Properties must align with schema.org definitions
3. Context must resolve to schema.org vocabulary

## Conversion Mapping

### v2.0 → JSON-LD Mapping

| v2.0 Field                                | JSON-LD Location                                               | Notes                       |
| ----------------------------------------- | -------------------------------------------------------------- | --------------------------- |
| `version`                                 | `Dataset.additionalProperty[name="checkpoint_format_version"]` | Converted to 3.0.0-jsonld   |
| `global_rubric`                           | `Dataset.additionalProperty[name="global_rubric_traits"]`      | JSON serialized             |
| `checkpoint[id].question`                 | `DataFeedItem.item.text`                                       | Direct mapping              |
| `checkpoint[id].raw_answer`               | `DataFeedItem.item.acceptedAnswer.text`                        | Direct mapping              |
| `checkpoint[id].answer_template`          | `DataFeedItem.item.hasPart.text`                               | As SoftwareSourceCode       |
| `checkpoint[id].original_answer_template` | `Question.additionalProperty[name="original_answer_template"]` | Preserved as metadata       |
| `checkpoint[id].last_modified`            | `DataFeedItem.dateModified`                                    | Direct mapping              |
| `checkpoint[id].finished`                 | `Question.additionalProperty[name="finished"]`                 | As PropertyValue            |
| `checkpoint[id].question_rubric.traits[]` | `Question.rating[]`                                            | Converted to Rating objects |

### Rubric Trait → Rating Conversion

**Boolean Trait**:

```json
// v2.0
{
  "name": "Accuracy",
  "kind": "boolean",
  "description": "Is the answer correct?"
}

// JSON-LD
{
  "@type": "Rating",
  "name": "Accuracy",
  "description": "Is the answer correct?",
  "ratingValue": 0,
  "bestRating": 1,
  "worstRating": 0
}
```

**Score Trait**:

```json
// v2.0
{
  "name": "Quality",
  "kind": "score",
  "min_score": 1,
  "max_score": 5
}

// JSON-LD
{
  "@type": "Rating",
  "name": "Quality",
  "ratingValue": 1,
  "bestRating": 5,
  "worstRating": 1
}
```

## File Format

### MIME Type

`application/ld+json`

### File Extension

`.jsonld`

### Encoding

UTF-8

### Size Recommendations

- **Small**: < 1MB (< 100 questions)
- **Medium**: 1-10MB (100-1000 questions)
- **Large**: 10-100MB (1000-10000 questions)

For files > 100MB, consider splitting into multiple datasets.

## Compatibility

### JSON-LD Processors

- **JavaScript**: jsonld.js
- **Python**: PyLD
- **Java**: JSON-LD Java
- **PHP**: ML/JSON-LD

### RDF Tools

- **Triple Stores**: Apache Jena Fuseki, GraphDB, Blazegraph
- **Conversion**: rapper (Redland), RDF4J
- **Validation**: SHACL validators, RDF validators

### Linked Data Tools

- **Visualization**: Cytoscape.js, D3.js force graphs
- **Querying**: SPARQL endpoints
- **Integration**: Apache Camel, RDF4J Spring Boot

## Security Considerations

1. **No executable code**: Pydantic templates stored as text only
2. **URI validation**: All URNs follow standard patterns
3. **Input sanitization**: Escape special characters in text fields
4. **Size limits**: Enforce reasonable file size limits
5. **Schema validation**: Validate against schema.org schemas

## Performance Guidelines

### Generation Performance

- **Target**: < 200ms for 1000 questions
- **Memory**: O(n) space complexity
- **CPU**: O(n) time complexity

### Parsing Performance

- **Target**: < 100ms for 1000 questions
- **Streaming**: Consider streaming for large files
- **Validation**: Optional validation for trusted sources

### Storage Efficiency

- **Compression**: Gzip recommended (typical 70% reduction)
- **Indexing**: Extract key fields for database indexing
- **Caching**: Cache context resolution for performance

---

This specification ensures Karenina checkpoint files are fully compliant with JSON-LD 1.1 and schema.org standards while preserving all original data semantics.
