# General Configurations

In the upper right corner of the Karenina GUI you will find the "General Configurations" button. This will open a modal window that allows you to:

- Change the default model provider and model name
- Modify the environment variables

Crucially, generations with both the LangChain and OpenRouter interfaces assumes that the `.env` file contains the API keys for the selected model provider. For OpenRouter this amounts to setting the `OPENROUTER_API_KEY` variable, whereas for LangChain this amounts to set the API of the selected provider. More details can be found directly on the LangChain [documentation](https://docs.langchain.com/langsmith/integrations#llm-providers).
