# Template Generation

The Template Generation tab is the starting point for creating a new benchmark. It brings together two essential steps: first, extracting questions from your source data, and then generating structured answer templates with the help of AI. The idea is to take you smoothly from a raw dataset to curated, ready-to-use templates that can later be refined in the curation stage.

## Overview

The workflow in this tab is designed to guide you from beginning to end without interruptions. In practice, it begins with the extraction of questions and their associated data from a file, and then transitions to the automatic production of Pydantic answer templates. Both phases are closely connected: once questions are successfully extracted, they immediately become available to the template generation step, ensuring continuity in the process.

## Question Extraction

The first part of the tab focuses on uploading your source file and transforming its contents into structured questions. You can provide your data in several formats—Excel:

- Excel (`.xlsx`, `.xls`)
- CSV (`.csv`)
- TSV (`.tsv`)

Once a file is uploaded, the system parses its contents and presents you with a preview so you can confirm that the questions and answers have been correctly recognized. At this stage, you also specify which columns contain the relevant fields: at a minimum, questions and answers are required, but additional metadata such as authorship or keywords can also be included.

Behind the scenes, the platform converts your data into `QuestionData` objects. Each object contains the text of the question, the corresponding raw answer, any metadata that was provided, and a unique identifier. These objects are held in memory and become the input for the next phase: template generation.

## Answer Template Generation

The second part of the tab builds on the extracted questions. Here, Large Language Models (LLMs) are used to generate structured Pydantic templates, ensuring that every question has an associated schema for evaluation. Before launching the generation process, you configure which model to use.

You select the subset of questions you want to process, start the generation, and then monitor progress in real time. The interface shows how many templates have been completed, which one is currently being generated, and whether any failures have occurred. It also estimates how long the job is likely to take. When the run is complete, you are presented with a summary of all the successfully generated templates.

Each template is produced as a Python class derived from a base `Answer` model. The LLM interprets the question-answer pair and structures it into fields with explicit types and descriptions A generated template looks like

```python
class Answer(BaseAnswer):
    field_name: type = Field(description="field description")

    def model_post_init(self, __context):
        self.correct = {"field_name": "expected_value"}

    def verify(self) -> bool:
        return self.field_name == self.correct["field_name"]
```

Because template generation can involve hundreds of questions, the process is designed with robustness in mind. Templates are generated in the background, and you can cancel jobs at any point. Any errors are reported individually, so failed generations do not compromise successful ones. To ensure quality, every template undergoes validation: Python syntax is checked, the Pydantic structure is verified, and required methods are enforced.

Once you are satisfied with the generated templates, you can either download them as JSON or Python files for external use, or load them directly into the Template Curator tab. The latter option is often the most natural next step, since it allows you to immediately review, refine, and annotate the templates in preparation for benchmarking. Clicking **Add to Curation** automatically merges the extracted questions with their corresponding templates and opens them in the curation workspace, ready for editing.

> **Environment note:** Generation runs inherit the async configuration from the backend. You can tune it from the **Configuration** modal (Settings → Configuration) or by editing the project `.env` file:
>
> ```bash
> export KARENINA_ASYNC_ENABLED=true      # false forces strictly sequential calls
> export KARENINA_ASYNC_CHUNK_SIZE=5      # how many questions are grouped per batch
> export KARENINA_ASYNC_MAX_WORKERS=4     # cap on concurrent worker threads
> ```
>
> Larger chunk sizes and worker counts increase throughput but also raise the chance of hitting provider rate limits; dial them down if you see throttling. Template generation also needs the right API credentials for the interface you pick. Set them in the same modal or `.env` file, for example:

## Practical Advice

Although the interface is straightforward, a few practices can make your workflow smoother. Many users find it helpful to _start small_:

- extract a handful of questions
- generate their templates
- evaluate the results before scaling up.

This way, you can verify that the extraction and generation settings are working as intended. Once confident, you can process larger batches or even the entire dataset. Metadata can also be a powerful organizational tool, helping you group questions by topic or difficulty so that template generation remains consistent.

When choosing models, consider using faster and cheaper ones for early iterations and reserve more powerful models for complex or ambiguous cases. You can also experiment with temperature and other generation parameters to balance precision with creativity, depending on the nature of your benchmark.

## Next Steps

The Template Generation tab is not an endpoint but a bridge. Its role is to prepare structured templates that are then carried into the **Template Curator** tab. There, you can refine the generated structures, add evaluation rubrics, incorporate few-shot examples, and mark templates as finalized. By following this progression, you move steadily from raw data toward a complete and trustworthy benchmark.
