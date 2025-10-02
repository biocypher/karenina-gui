# 1. What is Karenina?

Karenina is a framework for defining benchmarks in a rigorous and reproducible way. With Karenina, benchmarks can be created, shared, reviewed, and executed across a wide range of large language models (LLMs).

Evaluation within Karenina can be performed using simple rule-based checks (such as pattern matching) or more advanced **LLM-as-judge** strategies. In this context, _judging_ means that the Judge LLM is asked to parse a candidate answer into a structured format. This parsing follows the instructions encoded in a template, which is automatically translated into a JSON schema from its Pydantic definition. By filling in the schema attributes, the Judge LLM effectively decides how the answer should be interpreted.

A key advantage of this approach is that it allows us to evaluate **natural, unconstrained outputs** — the kinds of free-form answers that models typically produce in real-world settings, where they are not explicitly asked to follow a rigid schema. At the same time, Karenina also supports **regex-based checks** for situations where benchmark designers want to enforce a strict answering format (e.g., requiring answers to be enclosed in brackets or expressed in a particular tokenization). This dual capability makes Karenina flexible: it can capture both realistic usage scenarios and traditional structured benchmarking tasks.

At the heart of the framework lies the concept of **templates**. Templates are executable code snippets that define what attributes should be extracted, how they should be typed, and how they should be compared to ground truth. Karenina (and, importantly, this graphical interface) provides tools that make it easier to scale up both the creation and the evaluation of benchmarks built around templates.

# 2. Fundamental Units of Evaluation

Karenina relies on two core building blocks for evaluation:

- **Answer Templates** are used for _precise, unambiguous outputs_ (e.g., “What is the target of Venetoclax?” → “BCL2”), where programmatic verification against ground truth is possible.
- **Rubrics** are used for _qualitative traits_ (e.g., “Is the answer concise?”, “Does the answer show safety awareness?”), where evaluation cannot be programmatically verified and must be fully judged by an LLM.

## 2.1 Answer Templates

Answer templates are Pydantic models that specify how a Judge LLM should evaluate a model’s output (an “answering trace”). They do this by presenting the Judge LLM with a schema to populate: each attribute in the schema represents part of the expected answer, and the LLM’s task is to parse the candidate response into these attributes. In other words, _the LLM judges by filling in the template_.

Answer templates are best suited for tasks with precise, unambiguous answers.

**Examples:**

- _Question: What is the approved putative target of the drug Venetoclax?_
  _Answer: BCL2_
- _Question: How many chromosomes are there in a typical human somatic cell?_
  _Answer: 46_
- _Question: True or False: The BRCA1 gene is associated with increased risk of breast cancer._
  _Answer: True_

Answer templates can also cover cases where multiple pieces of information must be checked jointly:

- _Question: Is hemoglobin A present in healthy adult humans, and how many protein subunits does it have?_
  _Answer: True, 4_

Each attribute has a data type (e.g. string, integer, boolean), which guides both the Judge LLM’s parsing and the programmatic verification step. For instance:

- In Example 1, `"BCL2"` is parsed as a string.
- In Example 2, `46` is parsed as an integer.
- In Example 3, `True` is parsed as a boolean.

To make parsing easier and judging more reliable, each attribute should include a description of what it is meant to capture. This works just like `Field` descriptors in Pydantic:

```python
class Answer(BaseAnswer):
    putative_target: str = Field(
        description="The putative target of the drug contained in the response"
    )
```

Under the hood, each template implements a `verify` method. Once the Judge LLM has parsed the answer into attributes, `verify` compares them against ground-truth values in a programmatic way:

```python
# Question: In which tissue is KRAS most essential across a wide range of cancer cell lines according to Cancer DepMap?
# Answer: pancreas

class Answer(BaseAnswer):
    tissue: str = Field(
        description="Tissue where KRAS is most essential across cancer cell lines according to Cancer DepMap"
    )

    def model_post_init(self, __context):
        self.correct = {"tissue": "pancreas"}

    def verify(self) -> bool:
        return self.tissue.strip().lower() == self.correct["tissue"].strip().lower()
```

Karenina supports several ways of creating templates, most of which do not require writing any code. Users can generate templates automatically in batch using the built-in tools, or build them interactively through the no-code Template Curator, which makes all of Karenina’s functionality accessible in a step-by-step way. For advanced users who need complete control, templates can also be written directly as Python classes, but in practice this is rarely necessary since the framework already provides extensive functions and helpers that cover the majority of use cases.

### 2.2.1 Regex Traits for Enforcing Formats

In addition to parsing natural free-form answers, answer templates can also encode **regex traits** that enforce a specific answering format. This is useful for benchmarks that want to constrain how models reply, making evaluation easier and fully deterministic.

For example, consider a benchmark where we ask models to provide their answer inside square brackets:

**Prompt to the model:**

```
What is the approved symbol of the drug target Venetoclax?
Please answer using the following format: [ANSWER]
```

**Expected model output:**

```
[BCL2]
```

Here, the regex ensures that the parser only extracts answers that match the enforced format (text enclosed in `[]`). This approach is especially effective when benchmarks are designed to test strict adherence to output conventions.

# 3. Rubrics

Rubrics are the second core evaluation unit in Karenina, and they are designed to assess **qualitative traits of answers** rather than precise factual correctness. While Answer Templates focus on strict outputs that can be verified programmatically, Rubrics capture broader properties of responses, such as **safety**, **conciseness**, or **directness**.

In Karenina, rubrics can be applied in two ways:

- **Benchmark-wide**: evaluated for every item in a benchmark (e.g., always checking that answers are concise).
- **Question-specific**: tied only to a particular question (e.g., only checking safety for a question about drug side effects).

## 3.1 How Rubrics Work

Unlike Answer Templates, rubrics do not implement a `verify` method or compare attributes against ground truth. Instead, their evaluation is **entirely deferred to the Judge LLM**, which acts as a true judge in the everyday sense: it reads the rubric description and applies it directly to the candidate answer.

A rubric is defined through **a short textual description**, which tells the Judge LLM how to evaluate the answer. The rubric’s output is then expected in one of two forms:

1. **Boolean evaluation** (true/false):
   - Example rubric: _“Does the answer include any mention of safety concerns?”_
   - Output: `True` or `False`

2. **Integer score on a defined scale** (e.g., 1–5):
   - Example rubric: _“Rate the conciseness of the answer on a scale from 1 (very verbose) to 5 (extremely concise).”_
   - Output: `3`

This makes rubrics especially flexible: they can be used to introduce subjective, judgment-based dimensions into benchmarks, complementing the objective checks provided by Answer Templates.

### 3.2.1 Regex Rubrics

In addition to text-based rubrics, Karenina also supports **regex rubrics**, which check whether a given textual pattern is present (or absent) verbatim in the candidate answer. Regex rubrics are particularly useful for checking compliance with strict stylistic or structural rules.
