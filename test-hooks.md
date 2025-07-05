# Test Git Hooks

This is a test file to verify our Git hooks are working properly.

## What we've implemented:

- Husky for Git hooks
- lint-staged for running tools on staged files
- Prettier for code formatting
- ESLint for linting
- TypeScript checking
- Dead code detection with ts-prune

## The hooks should:

1. Run prettier on staged files
2. Run eslint --fix on staged files
3. Ensure code quality before commits
