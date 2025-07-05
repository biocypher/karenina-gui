# OtarBench Webapp Test Suite

_Created: 2024-12-19_

## Overview

This directory contains a comprehensive test suite for the OtarBench webapp, implementing systematic unit and integration testing for all React components, hooks, and utilities. The test suite is designed to ensure robust functionality and catch regressions early in the development cycle.

## Test Framework Stack

- **Vitest**: Fast unit test runner with native ESM support
- **React Testing Library**: Component testing with user-centric approach
- **JSdom**: Browser environment simulation
- **MSW (Mock Service Worker)**: API mocking for realistic testing
- **User Event**: Realistic user interaction simulation

## Directory Structure

```
src/__tests__/
├── README.md                    # This file
├── components/                  # Component tests
│   ├── QuestionExtractor.test.tsx
│   ├── FileManager.test.tsx
│   ├── AnswerTemplateGenerator.test.tsx
│   ├── ChatInterface.test.tsx
│   ├── CodeEditor.test.tsx
│   ├── DiffViewer.test.tsx
│   ├── QuestionVisualizer.test.tsx
│   ├── QuestionSelector.test.tsx
│   └── StatusBadge.test.tsx
├── hooks/                       # Hook tests
│   └── useLocalStorage.test.ts
├── utils/                       # Utility tests
│   └── dataLoader.test.ts
└── App.test.tsx                 # Main app integration tests

src/test-utils/
├── test-helpers.tsx            # Common test utilities
├── mocks/
│   ├── server.ts              # MSW server setup
│   └── handlers.ts            # API mock handlers
```

## Test Categories

### 1. Component Tests

Each component has comprehensive tests covering:

- **Initial Rendering**: Default states and props
- **User Interactions**: Click, type, drag-drop, etc.
- **State Management**: Internal state changes
- **Props Handling**: Different prop combinations
- **Error Scenarios**: Invalid inputs, network errors
- **Accessibility**: Keyboard navigation, ARIA attributes

### 2. Hook Tests

Custom hooks are tested for:

- **Initial Values**: Default behavior
- **State Updates**: Functional and direct updates
- **Error Handling**: Storage failures, invalid data
- **Performance**: Memory leaks, unnecessary re-renders
- **Edge Cases**: Concurrent access, large data

### 3. Integration Tests

Full workflow testing:

- **Cross-Component Communication**: Data flow between components
- **API Integration**: Real API interaction patterns
- **Routing and Navigation**: Tab switching, state preservation
- **Data Persistence**: localStorage/sessionStorage behavior

## Running Tests

### Basic Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

### Specific Test Patterns

```bash
# Run specific test file
npm run test QuestionExtractor

# Run tests matching pattern
npm run test -- --grep "file upload"

# Run tests for specific component
npm run test components/

# Run only failed tests
npm run test -- --reporter=verbose --run
```

## Test Utilities

### Mock Data Generators

```typescript
import { createMockQuestionData, createMockCheckpoint, createMockFile } from '../test-utils/test-helpers';

// Generate mock question data
const questions = createMockQuestionData(5); // 5 questions

// Generate corresponding checkpoint
const checkpoint = createMockCheckpoint(questions);

// Create mock file for upload tests
const file = createMockFile('test.xlsx', 1024);
```

### Custom Render Function

```typescript
import { render, screen, userEvent } from '../test-utils/test-helpers';

// Enhanced render with providers and utilities
render(<MyComponent />);

// User event simulation
const user = userEvent.setup();
await user.click(screen.getByRole('button'));
```

### API Mocking

```typescript
import { mockFetchSuccess, mockFetchError } from '../test-utils/test-helpers';

// Mock successful API response
mockFetchSuccess({ data: 'success' });

// Mock API error
mockFetchError('Network error');
```

## Writing New Tests

### Component Test Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, userEvent } from '../../test-utils/test-helpers';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  const mockProps = {
    onAction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render with default props', () => {
      render(<MyComponent {...mockProps} />);
      expect(screen.getByText('Expected Text')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const user = userEvent.setup();
      render(<MyComponent {...mockProps} />);

      await user.click(screen.getByRole('button'));
      expect(mockProps.onAction).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle error states gracefully', () => {
      render(<MyComponent {...mockProps} hasError={true} />);
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });
});
```

### Best Practices

1. **Test Behavior, Not Implementation**
   - Focus on what the user sees and does
   - Avoid testing internal component details
   - Use semantic queries (getByRole, getByLabelText)

2. **Comprehensive Error Testing**
   - Test all error scenarios
   - Verify error messages and recovery
   - Mock network failures and edge cases

3. **Accessibility Testing**
   - Test keyboard navigation
   - Verify ARIA attributes
   - Check focus management

4. **Performance Considerations**
   - Test with large datasets
   - Verify memory cleanup
   - Check for unnecessary re-renders

5. **Realistic User Simulation**
   - Use userEvent for interactions
   - Test complete user workflows
   - Include timing and async operations

## Mock Configurations

### localStorage/sessionStorage

```typescript
import { mockLocalStorage } from '../test-utils/test-helpers';

const mockStorage = mockLocalStorage();
Object.defineProperty(window, 'localStorage', { value: mockStorage });
```

### File Operations

```typescript
// Mock file upload
const file = createMockFile('test.xlsx', 1024);
await user.upload(input, file);

// Mock drag and drop
await simulateDragAndDrop(dropZone, file);
```

### API Calls

All API endpoints are mocked through MSW. See `src/test-utils/mocks/handlers.ts` for available endpoints.

## Coverage Goals

- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

Coverage reports are generated in `coverage/` directory.

## Debugging Tests

### Common Issues

1. **Async Operations**: Use `waitFor` for async state changes
2. **DOM Updates**: Ensure proper cleanup with `cleanup()`
3. **Mock Persistence**: Clear mocks in `beforeEach`
4. **Event Simulation**: Use `userEvent` instead of `fireEvent`

### Debug Tools

```typescript
// Debug DOM state
screen.debug();

// Log queries
screen.logTestingPlaygroundURL();

// Check element accessibility
screen.getByRole('button', { name: /submit/i });
```

## CI/CD Integration

Tests run automatically on:

- Pull requests
- Push to main branch
- Nightly builds

Configuration in `.github/workflows/test.yml`.

## Contributing

When adding new components or features:

1. Write tests first (TDD approach)
2. Ensure all test categories are covered
3. Add integration tests for cross-component features
4. Update this README if adding new test patterns
5. Maintain coverage above threshold

## Performance Benchmarks

- Full test suite should complete in <30 seconds
- Individual component tests should complete in <2 seconds
- Coverage generation should complete in <10 seconds

## Troubleshooting

### Common Test Failures

1. **Element not found**: Check if component rendered correctly
2. **Async timeout**: Increase waitFor timeout or check async logic
3. **Mock not called**: Verify mock setup and function calls
4. **Storage errors**: Ensure storage mocks are properly configured

### Getting Help

- Check existing test patterns in similar components
- Review React Testing Library documentation
- Use `screen.debug()` to inspect DOM state
- Check MSW handlers for API mock issues
