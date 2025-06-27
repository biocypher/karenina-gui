# Karenina GUI

React frontend application for the Karenina LLM benchmarking system, providing an intuitive web interface for interactive benchmark management and analysis.

## Overview

Karenina GUI is a modern React application that provides:

- **Question Extraction**: Upload and process Excel, CSV, TSV files
- **Answer Template Generation**: AI-powered template creation with real-time progress
- **Question Curation**: Interactive review and management of question sets
- **Benchmark Verification**: Run comprehensive LLM evaluations with live progress tracking
- **Chat Interface**: Direct interaction with various LLM providers
- **Real-time Updates**: WebSocket-powered live progress indicators
- **Export Capabilities**: Download results in multiple formats (JSON, CSV)

## Technology Stack

- **React 18.3.1** with TypeScript for type-safe development
- **Vite 5.4.2** for fast development and optimized builds
- **Tailwind CSS 3.4.1** for modern, responsive styling
- **Zustand 5.0.5** for lightweight state management
- **React Table** for advanced data visualization
- **Vitest** with Testing Library for comprehensive testing
- **MSW** for API mocking during development

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Running Karenina Server (for API backend)

### Installation

```bash
# Clone or navigate to the project
cd karenina-gui

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally

# Testing
npm test             # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage report
npm run test:ui      # Run tests with Vitest UI

# Code Quality
npm run lint         # Run ESLint
```

### Project Structure

```
src/
├── components/           # React components
│   ├── benchmark/       # Benchmark-specific components
│   ├── shared/          # Reusable components
│   └── ui/              # Basic UI components
├── hooks/               # Custom React hooks
├── stores/              # Zustand state management
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # API endpoints and constants
└── __tests__/           # Test files
```

### Key Features

#### Multi-Tab Interface
- **Extractor**: Upload and process question files
- **Generator**: Create answer templates using AI
- **Curator**: Review and refine question sets
- **Benchmark**: Run comprehensive evaluations
- **Chat**: Direct LLM interaction

#### State Management
Clean separation of concerns with Zustand stores:
- `useAppStore`: Global application state and navigation
- `useQuestionStore`: Question data and operations
- `useTemplateStore`: Template generation and management

#### API Integration
- Relative API paths (`/api/*`) for flexible backend integration
- WebSocket support for real-time progress updates
- Comprehensive error handling and loading states

#### Testing
- **Unit Tests**: Component and utility testing
- **Integration Tests**: Full workflow testing
- **API Mocking**: MSW for realistic API simulation
- **95%+ Coverage**: Comprehensive test suite

## Configuration

### Environment Variables

Create a `.env.local` file for development configuration:

```bash
# Optional: Override default API base URL
VITE_API_BASE_URL=http://localhost:8080

# Optional: Enable debug mode
VITE_DEBUG=true
```

### Backend Integration

The frontend expects a Karenina Server running with these API endpoints:

- `POST /api/files/upload` - File upload
- `POST /api/generation/start` - Start template generation
- `GET /api/generation/status/{id}` - Generation progress
- `POST /api/verification/start` - Start benchmark
- `GET /api/verification/status/{id}` - Benchmark progress
- `POST /api/chat/message` - Chat with LLMs

## Deployment

### Static Hosting

The built application is a static SPA that can be deployed to:

- **Netlify**: `npm run build` + drag `dist/` folder
- **Vercel**: Connect GitHub repo with auto-deploy
- **AWS S3 + CloudFront**: Upload `dist/` contents
- **GitHub Pages**: Use GitHub Actions workflow

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api/ {
        proxy_pass http://karenina-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Features in Detail

### File Upload & Processing
- Drag-and-drop interface for Excel/CSV/TSV files
- Real-time file validation and preview
- Automatic question extraction and parsing

### Template Generation
- AI-powered answer template creation
- Multiple LLM provider support (OpenAI, Google, Anthropic)
- Progress tracking with estimated completion times
- Template validation and editing

### Benchmark Management
- Configure multiple model comparisons
- Real-time progress tracking
- Detailed result analysis and visualization
- Export capabilities for further analysis

### Responsive Design
- Mobile-friendly interface
- Dark/light theme support
- Accessible design following WCAG guidelines
- Optimized for various screen sizes

## Contributing

### Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Testing Guidelines

- Write tests for all new components
- Maintain 90%+ code coverage
- Use React Testing Library best practices
- Mock external dependencies with MSW

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for consistent formatting
- Conventional commit messages
- Component-first architecture

## Troubleshooting

### Common Issues

**Development server won't start**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API requests failing**
- Ensure Karenina Server is running on correct port
- Check CORS configuration in server
- Verify API endpoint paths match server routes

**Build errors**
```bash
# Type check the project
npx tsc --noEmit

# Check for unused dependencies
npm run lint
```

## License

MIT License - see LICENSE file for details.

## Related Projects

- **[karenina](https://github.com/yourusername/karenina)**: Core benchmarking library
- **[karenina-server](https://github.com/yourusername/karenina-server)**: FastAPI backend server