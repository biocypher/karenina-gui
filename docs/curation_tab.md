# Template Curator

The Template Curator is the place where raw, automatically generated answer templates are turned into polished, production-ready components of a benchmark. While the previous stage focused on extracting questions and drafting initial templates, this stage is dedicated to refinement: editing structures, enriching metadata, adding rubrics, and ensuring that every template is robust enough to be used in real evaluations.

## Overview

At its core, the curator offers a **rich editing environment** that balances flexibility with control. Its main features include:

- **Dual Editing Modes:**
  - _Code Editor_ — For precise programming control, with syntax highlighting and real-time validation.
  - _Form Editor_ — For intuitive, visual editing of template fields, types, and descriptions.

- **Powerful Search & Filtering:**  
  Quickly locate and organize templates using robust search, filtering, and metadata management tools.

These capabilities ensure that even large benchmarks remain organized, accessible, and easy to navigate.

## Getting Started

You can bring data into the curator in several ways. The most common path is to move directly from the Template Generation tab by clicking **Add to Curation**, which loads generated templates along with their source questions. Alternatively, you can restore an older checkpoint (a `.jsonld` file), upload raw question data in JSON format, or simply start from scratch by manually entering new questions. Whatever the method, once a dataset is loaded you’ll also see its descriptive metadata: the benchmark’s name, version, and author, along with the number of questions and their current status.

## Navigating Questions

Efficient navigation is essential when working with large benchmarks. The curator offers a suite of tools to help you quickly find and manage questions:

- **Centralized Search Bar:** Instantly locate questions by searching their text, candidate answers, IDs, or metadata keywords. Searches are case-insensitive and update results in real time.
- **Completion Status Filters:** Easily narrow your view to show only finished questions, only unfinished ones, or all questions at once.
- **Navigation Controls:** Use a dropdown menu to jump directly to any question, sequential next/previous buttons to move through the list, and a live counter to track your current position.
- **Keyboard Shortcuts:** Speed up your workflow with common shortcuts for search, navigation, and editing.

These features work together to ensure that even the largest benchmarks remain organized, accessible, and easy to navigate.

## Editing Templates

The editor is the heart of the curator. It offers two complementary modes. In the **code editor**, templates are displayed as Python classes with syntax highlighting, folding, indentation, and real-time validation. This mode is ideal when you want full control over the logic, such as the `verify` function or the `model_post_init` method. For those who prefer a more visual workflow, the **form editor** represents the same template as a collection of editable fields, where types, descriptions, and default values can be modified without touching the code. Any changes made in one mode are instantly reflected in the other.

To support careful revision, the editor also includes a **diff view** for comparing the current version against the original or the last saved checkpoint, with clear highlighting of additions and deletions. Automatic syntax and structural checks ensure that code remains valid, while error messages provide guidance for corrections. Unsaved changes are clearly flagged, so you are never at risk of losing progress when navigating away.

For complex work, you can expand the editor to full screen, where all features remain available but with maximum space to focus on the template. Metadata and rubric tools are also easily accessible in this expanded view.

## Understanding Template Structure

Every curated template follows a standardized Pydantic structure. It defines fields that describe the components of a valid answer, implements a `model_post_init` method to record the correct values, and provides a `verify` function that checks whether candidate answers match expectations. This structure guarantees consistency across benchmarks while leaving room for complex verification logic where needed.

## Managing Metadata

Each question and template can be annotated with rich metadata. Standard fields include the question ID, text, raw answer, and timestamps, while additional custom fields allow you to track domain-specific information such as category, difficulty, or source. Metadata also supports author attribution and multi-author collaboration, as well as searchable keywords and tags that make organizing large benchmarks easier.

## Adding Few-Shot Examples

Few-shot examples can be attached directly to questions to improve the quality of LLM answers during benchmarking. Each example pairs a question with a structured answer, and multiple examples can be added, reordered, or removed as needed. Providing a small but diverse set of examples—usually between two and five—helps clarify ambiguities and ensures that the Judge LLM better understands the expected structure.

## Rubric Definition

In addition to global rubrics, which apply across an entire benchmark, each question can also have its own evaluation criteria. These are managed through the rubric editor, where you can define traits such as “completeness” or “clarity,” provide textual descriptions, and even encode regex patterns for automated checks. This flexibility makes it possible to apply both broad and fine-grained assessments, depending on the needs of each question.

Global rubrics can also be created with the help of AI. By analyzing questions, the system suggests candidate traits, which you can then review, edit, and incorporate. Manual editing remains available for full control, and traits can be reordered, prioritized, or previewed on sample text before being finalized.

## File and Version Management

Because benchmarks evolve over time, the curator includes a robust checkpoint system. Saving a checkpoint exports all templates, metadata, rubrics, and few-shot examples into a JSON-LD file that can later be reloaded in full. You may export the entire state, only selected questions, or just the Python template code. Restoring from a checkpoint validates the structure before merging or replacing your current data.

### Database Management

In addition to file-based checkpoints, the curator supports persistent database storage for benchmarks and verification results:

- **Manage Database Button:** Access database operations through the "Manage Database" button in the File Management panel.
- **Connect to Database:** Browse for a local SQLite database file or enter a connection string for PostgreSQL or other database types.
- **Create New Database:** Initialize a new database at a specified location with proper schema setup.
- **Load from Database:** Browse available benchmarks in a connected database and load them directly into the curator.
- **Auto-Save Verification Results:** When a benchmark is loaded from a database, all subsequent verification results are automatically saved to that database by default. This behavior can be disabled by setting the `AUTOSAVE_DATABASE` environment variable to `false`.

Database storage provides a centralized, structured approach to managing benchmarks and their verification history, making it easier to track progress over time and share results across teams.

If you ever need a completely fresh start, a reset function clears all loaded content—though not without a confirmation step to avoid accidental loss.

## Visual Status Indicators

To keep track of progress, each question is accompanied by visual badges. A green check mark signals readiness for benchmarking, while a yellow warning indicates that more work is needed. Modified templates are flagged until explicitly saved, and a counter shows how many few-shot examples have been attached. Each template also records the time it was last edited, making collaboration easier by revealing which entries may be outdated.

## Best Practices

Curating templates is often best approached as an iterative process. Many users begin with a small batch of AI-generated templates, refine them, and test verification before scaling up to the full dataset. Saving checkpoints at regular intervals is highly recommended, especially before making major changes, as it creates a safety net and a history of progress. Collaboration becomes smoother when metadata is used to track ownership and topics, and when checkpoints are shared among team members. Over time, recurring verification patterns can be recognized and reused, forming a growing library of tried-and-tested template structures.

## Moving Forward

Once templates are finalized and flagged as ready, the next natural step is to move into the **Benchmark** tab. There, you configure which models will be used for verification, run the benchmarks, and review the results through built-in analysis and reporting tools. In this way, the Template Curator serves as the essential bridge between raw AI-generated drafts and rigorous, trustworthy benchmark execution.
