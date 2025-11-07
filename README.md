i# Karenina GUI

React/TypeScript web application for the [Karenina](https://github.com/biocypher/karenina) LLM benchmarking system.

## Overview

**Karenina GUI** is the frontend component of the Karenina graphical user interface stack, providing a **no-code web interface** for users who prefer not to work with Python code directly.

**Part of the Karenina stack:**

- **[karenina](https://github.com/biocypher/karenina)** - Core Python library for LLM benchmarking (works standalone)
- **[karenina-server](https://github.com/biocypher/karenina-server)** - FastAPI backend exposing the library as REST API
- **karenina-gui** (this package) - React/TypeScript web application

Together, these three packages enable no-code access to the Karenina framework for domain experts, curators, and non-technical users.

**Note**: The full stack integration is currently a work in progress. Comprehensive instructions for spinning up the complete web-based system will be provided soon.

### Key Features

- **Visual Question Extraction**: Upload and process Excel, CSV, TSV files
- **Template Generation**: AI-powered template creation with interactive preview and editing
- **No-code Rubric Curation**: Create and manage LLM-based, regex, and metric traits
- **Checkpoint Management**: Save and load benchmark states
- **Verification Execution**: Run comprehensive LLM evaluations with real-time progress tracking
- **Results Visualization**: Interactive analysis and export capabilities
- **Chat Interface**: Direct interaction with various LLM providers

## Technology Stack

- React 18.3.1 with TypeScript
- Vite 5.4.2 for fast development builds
- Tailwind CSS 3.4.1 for styling
- Zustand 5.0.5 for state management

## Installation & Setup

For those who want to run this package independently:

### Prerequisites

- Node.js 18+ and npm
- Running [karenina-server](https://github.com/biocypher/karenina-server) instance (for API backend)

### Basic Setup

```bash
# Install dependencies
npm install

# Development mode
npm run dev          # Runs on http://localhost:5173

# Production build
npm run build        # Outputs to dist/
```

### Testing & Development

```bash
# Run tests
npm test

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.
