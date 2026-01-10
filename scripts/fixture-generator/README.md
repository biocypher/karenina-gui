# LLM Fixture Generator

Captures real LLM responses from the Karenina backend API and saves them as test fixtures.

## Prerequisites

1. **Anthropic API Key**: Ensure `ANTHROPIC_API_KEY` is set in your environment
2. **Backend Server**: The karenina-server must be running

## Quick Start

```bash
# Terminal 1: Start the backend server
cd karenina-server
uv run karenina-server serve --port 5001

# Terminal 2: Generate fixtures
cd karenina-gui
npm run fixtures:capture
```

## Available Commands

| Command                                 | Description                        |
| --------------------------------------- | ---------------------------------- |
| `npm run fixtures:capture`              | Capture all fixture scenarios      |
| `npm run fixtures:capture:verification` | Capture verification fixtures only |
| `npm run fixtures:list`                 | List all existing fixtures         |

## CLI Options

```bash
npm run fixtures:capture -- [options]

Options:
  -e, --endpoint <type>     Endpoint to capture (verification, template-generation, all)
  -u, --backend-url <url>   Backend server URL (default: http://localhost:5001)
  -o, --output <dir>        Output directory (default: src/test-utils/fixtures/llm-responses)
  -q, --quiet               Suppress verbose output
  --model <name>            Model name (default: claude-haiku-4-5)
  --provider <name>         Model provider (default: anthropic)
```

## Verification Scenarios

The fixture generator captures the following verification scenarios:

| Scenario               | Description                              | Output File                                               |
| ---------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `single-question`      | Single question verification             | `verification/claude-haiku-4-5/single-question.json`      |
| `multi-question`       | Multiple questions (3) verification      | `verification/claude-haiku-4-5/multi-question.json`       |
| `with-rubric`          | Verification with rubric evaluation      | `verification/claude-haiku-4-5/with-rubric.json`          |
| `with-replicates`      | Verification with `replicate_count=3`    | `verification/claude-haiku-4-5/with-replicates.json`      |
| `abstention-detection` | Questions designed to trigger abstention | `verification/claude-haiku-4-5/abstention-detection.json` |

## Generated Files

After running `npm run fixtures:capture`, the following files are created/updated:

```
src/test-utils/fixtures/llm-responses/
├── shared/
│   ├── sample-questions.json      # Sample questions used in tests
│   ├── sample-rubric.json         # Sample rubric configuration
│   └── abstention-questions.json  # Questions for abstention testing
└── verification/
    └── claude-haiku-4-5/
        ├── single-question.json       # Single question result
        ├── multi-question.json        # Multi-question results
        ├── with-rubric.json           # Results with rubric evaluation
        ├── with-replicates.json       # Results with 3 replicates
        └── abstention-detection.json  # Results with abstention detection
```

## Fixture Structure

Each captured fixture has the following structure:

```json
{
  "_metadata": {
    "capturedAt": "2026-01-10T12:00:00.000Z",
    "model": "claude-haiku-4-5",
    "scenario": "single-question",
    "backendUrl": "http://localhost:5001"
  },
  "data": {
    "question_id_model_timestamp": {
      "metadata": { ... },
      "template": { ... },
      "rubric": { ... }
    }
  }
}
```

## Troubleshooting

### Backend not reachable

```
ERROR: Backend is not reachable at http://localhost:5001
```

Ensure the karenina-server is running:

```bash
cd karenina-server
uv run karenina-server serve --port 5001
```

### API key not found

```
Error: ANTHROPIC_API_KEY not set
```

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY=your-key-here
```

### Timeout errors

For slow connections or complex scenarios, increase the timeout:

```bash
# The default timeout is 120 seconds for most scenarios
# with-replicates uses 300 seconds due to multiple runs
```

## Adding New Scenarios

To add a new capture scenario:

1. Add the capture function in `scenarios/verification.ts`:

   ```typescript
   async function captureMyScenario(
     client: KareninaApiClient,
     writer: FixtureWriter,
     modelConfig: Partial<ModelConfiguration>,
     verbose: boolean
   ): Promise<string[]> {
     // Implementation
   }
   ```

2. Add it to the scenarios array in `captureVerificationFixtures()`:

   ```typescript
   const scenarios = [
     // ... existing scenarios
     { name: 'my-scenario', fn: captureMyScenario },
   ];
   ```

3. Update `src/test-utils/fixtures/loaders.ts`:
   - Add the import
   - Update `VerificationScenario` type
   - Add to the fixtures registry

4. Create a placeholder JSON file in `llm-responses/verification/claude-haiku-4-5/`
