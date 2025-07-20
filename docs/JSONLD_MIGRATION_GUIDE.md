# JSON-LD Checkpoint Migration Guide

## Overview

Karenina has upgraded from proprietary `checkpoint_v2.json` format to standard **JSON-LD v3.0** using schema.org vocabulary. This enables semantic web compatibility and better data interoperability.

## What Changed

### ✨ New JSON-LD Format (v3.0)

- **Standards-based**: Uses schema.org vocabulary exclusively
- **Semantic web compatible**: Works with RDF tools and triple stores
- **Better structure**: More explicit relationships between data elements
- **Rubric traits as Rating objects**: Each trait becomes a proper schema.org Rating

### 📁 File Extensions

- **New exports**: `.jsonld` files (application/ld+json MIME type)
- **Legacy imports**: Still supports `.json` files with migration warnings
- **File input**: Now accepts both `.json` and `.jsonld` extensions

## Schema.org Mapping

### Core Structure

| v2.0 Concept      | JSON-LD Schema.org Type | Description                          |
| ----------------- | ----------------------- | ------------------------------------ |
| Checkpoint        | `Dataset`               | Collection of benchmark questions    |
| Question entries  | `DataFeedItem`          | Individual questions with timestamps |
| Question text     | `Question`              | The actual question content          |
| Expected answer   | `Answer`                | Canonical answer content             |
| Pydantic template | `SoftwareSourceCode`    | Answer template code                 |
| Rubric traits     | `Rating`                | Evaluation criteria with scores      |
| Metadata          | `PropertyValue`         | Additional data (finished, etc.)     |

### Rating Objects (Rubric Traits)

**Boolean traits** (true/false):

```json
{
  "@type": "Rating",
  "name": "Accuracy",
  "ratingValue": 1,
  "bestRating": 1,
  "worstRating": 0
}
```

**Score traits** (1-5 scale):

```json
{
  "@type": "Rating",
  "name": "Completeness",
  "ratingValue": 4,
  "bestRating": 5,
  "worstRating": 1
}
```

## Migration Methods

### Method 1: Automatic Migration (Recommended)

The application automatically handles legacy files:

1. **Upload legacy checkpoint** → App detects v2.0 format
2. **Migration notice** → Confirms automatic conversion
3. **Data converted** → Loaded into current session
4. **Download new checkpoint** → Saves in JSON-LD format

### Method 2: CLI Migration Script

Batch convert files using the migration script:

```bash
# Single file conversion
npm run migrate:checkpoint old_checkpoint.json new_checkpoint.jsonld

# Direct node command
node scripts/migrate-checkpoint.js input.json output.jsonld
```

**Example output:**

```
🚀 Starting checkpoint migration...

📂 Loading checkpoint from: checkpoint_2024.json
✅ Valid v2.0 checkpoint loaded with 15 questions
📊 Global rubric found with 3 traits

📊 Converting to JSON-LD format...
💾 Saving JSON-LD to: checkpoint_2024.jsonld
✅ JSON-LD file saved (23KB)

📋 Migration Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migration: v2.0 → JSON-LD v3.0
📊 Questions: 15 → 15
🏁 Finished: 8/15
⭐ Ratings: 45 total rating objects
🌐 Global Rubric: ✅
📝 Question Rubrics: 3
🔍 Data Integrity: ✅
📄 Format Valid: ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 Migration completed successfully!
```

### Method 3: Manual Validation

Verify JSON-LD files using online tools:

1. **JSON-LD Playground**: https://json-ld.org/playground/
2. **Structured Data Testing Tool**: Google's validator
3. **RDF Validators**: Any RDF/N-Triples validator

## Data Preservation

### ✅ What's Preserved

- All question text and expected answers
- Pydantic template code (original and modified)
- Progress status (finished/incomplete)
- Last modified timestamps
- Global and question-specific rubrics
- Complete rubric trait definitions

### 🔄 What's Transformed

- Rubric traits → schema.org Rating objects
- Question entries → DataFeedItem with timestamps
- Templates → SoftwareSourceCode objects
- Metadata → PropertyValue arrays

### 📊 Enhanced Features

- **Semantic relationships**: Explicit links between entities
- **Linked data compatibility**: Works with SPARQL queries
- **RDF export capability**: Convert to N-Triples, Turtle, etc.
- **Schema validation**: Validates against schema.org schemas

## Breaking Changes

### ⚠️ Compatibility Notice

- **Legacy support removed**: v2.0 files no longer supported in exports
- **File extension change**: New files use `.jsonld` extension
- **MIME type update**: Uses `application/ld+json`

### 🔧 Code Changes

If you have custom scripts processing checkpoint files:

**Before (v2.0):**

```javascript
const checkpoint = JSON.parse(fileContent);
const questions = Object.keys(checkpoint.checkpoint);
const globalRubric = checkpoint.global_rubric;
```

**After (JSON-LD v3.0):**

```javascript
import { jsonLdToV2 } from './utils/checkpoint-converter';

const jsonLdData = JSON.parse(fileContent);
const checkpoint = jsonLdToV2(jsonLdData); // Convert if needed
const questions = Object.keys(checkpoint.checkpoint);
const globalRubric = checkpoint.global_rubric;
```

## Example Files

### Legacy v2.0 Format

```json
{
  "version": "2.0",
  "global_rubric": {
    "traits": [
      {
        "name": "Accuracy",
        "kind": "boolean"
      }
    ]
  },
  "checkpoint": {
    "q1": {
      "question": "What is AI?",
      "raw_answer": "Artificial Intelligence",
      "answer_template": "class AIAnswer(BaseAnswer): definition: str",
      "last_modified": "2025-01-15T10:30:00Z",
      "finished": true
    }
  }
}
```

### New JSON-LD v3.0 Format

```json
{
  "@context": {
    "@vocab": "http://schema.org/",
    "Dataset": "Dataset",
    "DataFeedItem": "DataFeedItem"
  },
  "@type": "Dataset",
  "version": "3.0.0-jsonld",
  "name": "Karenina LLM Benchmark Checkpoint",
  "hasPart": [
    {
      "@type": "DataFeedItem",
      "dateModified": "2025-01-15T10:30:00Z",
      "item": {
        "@type": "Question",
        "text": "What is AI?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Artificial Intelligence"
        },
        "hasPart": {
          "@type": "SoftwareSourceCode",
          "text": "class AIAnswer(BaseAnswer): definition: str",
          "programmingLanguage": "Python"
        },
        "rating": [
          {
            "@type": "Rating",
            "name": "Accuracy",
            "ratingValue": 0,
            "bestRating": 1,
            "worstRating": 0
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
  ]
}
```

## Validation & Troubleshooting

### Common Issues

**1. Migration Script Errors**

```bash
❌ Error: Invalid JSON in file: checkpoint.json
```

**Solution**: Ensure the JSON file is valid and well-formed.

**2. Missing Dependencies**

```bash
❌ Error: Cannot find module 'jsonld'
```

**Solution**: Run `npm install` to install required dependencies.

**3. Empty Rating Values**
**Issue**: Some rating values show as 0
**Explanation**: Default values for unevaluated traits (0 for boolean, min_score for numeric)

### Validation Commands

```bash
# Check JSON-LD validity
node -e "
const jsonld = require('jsonld');
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('checkpoint.jsonld'));
jsonld.expand(doc).then(() => console.log('✅ Valid JSON-LD'));
"

# Convert to N-Triples for RDF validation
node -e "
const jsonld = require('jsonld');
const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('checkpoint.jsonld'));
jsonld.toRDF(doc, {format: 'application/n-quads'})
  .then(nquads => console.log('RDF Triples:', nquads.split('\n').length));
"
```

## Benefits of JSON-LD Format

### 🌐 Semantic Web Integration

- **SPARQL queries**: Query checkpoints like a database
- **Linked data**: Connect with external knowledge graphs
- **RDF conversion**: Export to any RDF format
- **Schema validation**: Automatic validation against schema.org

### 🔍 Enhanced Analytics

- **Triple stores**: Load into Fuseki, GraphDB, etc.
- **Graph analysis**: Visualize question relationships
- **Metadata queries**: Complex filtering and analysis
- **Interoperability**: Share data with other research tools

### 📊 Research Applications

- **Benchmark datasets**: Publish as linked open data
- **Citation networks**: Link questions to source papers
- **Evaluation metrics**: Standardized rating vocabularies
- **Reproducibility**: Complete semantic descriptions

## Support & Resources

### Documentation

- **JSON-LD Specification**: https://w3c.github.io/json-ld-syntax/
- **Schema.org**: https://schema.org/
- **JSON-LD Playground**: https://json-ld.org/playground/

### Getting Help

- **GitHub Issues**: Report migration problems
- **Migration Script**: Use `--help` flag for options
- **Validation Tools**: Test files before/after migration

### Migration Timeline

- **Phase 1**: Dual format support (current)
- **Phase 2**: JSON-LD default export
- **Phase 3**: Legacy import deprecation
- **Phase 4**: JSON-LD only (future release)

---

**Ready to migrate?** Start with the automatic migration through the UI, or use the CLI script for batch processing. Your data integrity is guaranteed through the migration process! 🚀
