# Benchmarking

The Benchmark tab is the environment where your curated templates are finally put to the test. It is here that verification runs are executed and performance is measured, transforming the work done in the previous stages into concrete metrics. The tab brings together all the elements needed for this process: configuration of answering and parsing models, careful selection of test items, monitoring of ongoing jobs, and detailed exploration of results. It is the place where ideas about evaluation become measurable evidence.

## 1. Overview

At its heart, the Benchmark tab orchestrates a complete evaluation pipeline. Once templates are ready, you select which questions to include, configure the models that will generate and parse answers, and then launch the benchmark. From this point, the system takes over:

- it submits jobs,
- tracks their progress in real time,
- and collects all outputs in a structured format.

What emerges from this workflow is not just a record of model responses but a set of verifiable outcomes, statistics, and comparative metrics that can inform both research and practical decisions.

## 2. Preparing to Run

Before a benchmark can be launched, a few prerequisites must be in place:

- At least one question must have been finalized in the Template Curator
- Both answering and parsing models must be configured with valid API keys
- If you intend to apply rubric-based evaluations, the traits should also be defined at this stage

Once these conditions are met, the tab becomes your control panel for moving from preparation to execution.

### 2.1 Answering Models

The process begins with model configuration. **Answering models** are those responsible for generating responses, and you may configure one or several, experimenting with different providers, temperatures, or prompts. **Parsing models**, on the other hand, are in charge of turning free-form text into structured fields that can be verified automatically.They often run with stricter settings (such as zero temperature) to maximise consistency. All models can be inspected, reordered, or removed through the configuration panel, which validates each setup and warns of missing information before any job is launched.

Crucially, we support three different types of interface for Answering Models:

- **langchain**: Standard LangChain integration with various providers (see the list [here](https://python.langchain.com/api_reference/langchain/chat_models/langchain.chat_models.base.init_chat_model.html))
- **openrouter**: Direct OpenRouter API access
- **manual**: Manual interface for human evaluation or testing

_Note: because manual verification matches traces by the question's MD5 hash, the Manual interface exposes download actions for both a JSON template (keyed by those hashes) and a CSV mapper, so you can populate answers outside the GUI and upload them later._

### 2.2 MCP Tools

Additionally, answering models can be enhanced by binding to the **MCP** tools. By clicking the dedicated button a dedicated interface will appear and guide user through the process of binding the model to the tools. We also provide to power users the ability to modify the `.env` file to define quick shortcuts for the most used models. Example:

```bash
MCP_CONFIG='{"biocontext":{"url":"https://mcp.biocontext.ai/mcp/","tools":["bc_get_open_targets_graphql_schema","bc_get_open_targets_query_examples","bc_query_open_targets_graphql"]},"opentargets-mcp":{"url":"http://0.0.0.0:8000/mcp"}}'
```

Adding the following line to the `.env` will ad two quick configurations:

- `biocontext` with the tools `bc_get_open_targets_graphql_schema`, `bc_get_open_targets_query_examples`, and `bc_query_open_targets_graphql`
- `opentargets-mcp` with all the tools available

**Remark** Currently Karenina only supports comunication with MCP tools through the `http` protocol.

## 3. Verification Workflow

Running a benchmark is a structured yet flexible process. You begin by deciding which questions to test, either selecting them individually or filtering by keywords, categories, or metadata. Each chosen item is clearly displayed with its text, identifiers, and associated rubric traits, so you always know what is included in the run.

With the set of questions defined, you then configure additional options:

- Replication allows you to repeat the same test multiple times, giving insight into how consistent a model is across runs.
- You may also choose to activate rubric-based evaluation for a more qualitative layer of judgement,
- Enrich the prompts with few-shot examples that guide models towards the expected style of answer.

When everything is ready, the verification run is started with a single click. Each run is given a unique identifier and timestamp, ensuring that results remain traceable even when multiple experiments are carried out in parallel.

## 4. Few-shot Prompting

Few-shot examples help guide models during benchmarking by showing them concrete illustrations of the expected answer style before they tackle new questions. Each example combines a question with its structured answer and is added to the prompt so the model can “see” the desired pattern. There are several ways to use them:

- **Global mode**, where the same set of examples is shown for every question, helping establish general answering patterns.
- **Per-question mode**, where examples are tied to individual questions, providing tailored guidance.
- **Custom selection**, where you manually choose specific examples for each case, giving you fine-grained control.

The number of examples included can be adjusted (typically between one and five), striking a balance between richer guidance and prompt length. When carefully chosen—short, diverse, and representative—few-shot examples often improve both the quality and the consistency of outputs, especially in tasks that are complex or ambiguous.

## 5. Analyzing Results

Once a run is complete, the focus shifts to analysis. Results are displayed in a comprehensive table that brings together all the relevant information: the original question, the generated answer, the structured parsing, the verification outcome, and any rubric scores. Crucially each row can be **expanded to reveal full details**, including step-by-step traces of how the verification was performed and the reasoning behind each pass or fail.

Filtering and search tools allow you to quickly focus on subsets of interest—for instance, all failures from a given model, or all questions containing a specific keyword. Aggregate statistics summarise performance across dimensions such as model, question, or rubric trait, and replication data makes it possible to measure variance and identify unstable items. In this way, the tab not only records outcomes but also helps you interpret them, revealing patterns and guiding further refinement.

## 6. Export and Sharing

The Benchmark tab is designed with openness in mind. Results can be exported in _JSON_ for programmatic processing or _CSV_ for use in spreadsheets and statistical tools. You may export everything at once or select only specific fields and filters, tailoring the output to your analysis needs. This makes it easy to generate tables for publications, archive verification runs, or share data with collaborators.

## 7. Advanced Options

### 7.1 Embedding Check

For cases where strict verification may misclassify answers, you can enable the **embedding check feature**. This mechanism triggers in case of failure and compares embeddings of the ground truth and model responses to detect semantic equivalence, sometimes overriding false negatives.

This feature must be turned on in the environment variables by setting the `EMBEDDING_CHECK` variable to `true` and by setting the `EMBEDDING_CHECK_MODEL` variable to the desired embedding model. Additionally, you can set the `EMBEDDING_CHECK_THRESHOLD` variable to the desired threshold for the embedding check. See below for an example.

```bash
export EMBEDDING_CHECK="true"
export EMBEDDING_CHECK_MODEL="sentence-transformers/embeddinggemma-300m-medical"
export EMBEDDING_CHECK_THRESHOLD="0.3"
```

**Note**: The embedding model is automatically downloaded from the 🤗 Hugging Face Hub and runs locally. The first time you enable this feature, verification may be slower while the model is being downloaded. Afterward, the model will be loaded into memory at the start of each verification session, adding a small overhead to the process.

## Best Practices

Many users find it helpful to start with small runs of just a handful of questions, testing their configurations and rubrics before scaling up to full benchmarks. Iterative refinement, reviewing failures, adjusting templates, and re-running is often the most effective path to robust evaluation. Replications provide valuable insight into consistency, while comparisons across multiple answering models highlight strengths and weaknesses. In practice, the tab becomes not just a testing ground but also a laboratory for experimentation.

## Troubleshooting and Next Steps

If no results appear, the first step is to check job status and configuration. Parsing errors often point to issues with prompts or schema definitions, while performance problems can be mitigated by reducing batch size or using faster models. Once stable runs are achieved, the next natural step is to return to your templates, refine them based on what you have learned, and launch new rounds of benchmarking. In this way, the Benchmark tab closes the loop of the Karenina workflow, turning curated questions into measurable outcomes and paving the way for continuous improvement.
