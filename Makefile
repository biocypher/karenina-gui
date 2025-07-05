.PHONY: help install dev test test-cov test-changed test-e2e lint format format-check type-check dead-code clean build check

help:
	@echo "Available commands:"
	@echo "  make install         Install dependencies"
	@echo "  make dev             Install dev dependencies and setup pre-commit"
	@echo "  make test            Run unit tests"
	@echo "  make test-cov        Run tests with coverage"
	@echo "  make test-changed    Run only tests affected by changes"
	@echo "  make test-e2e        Run E2E tests"
	@echo "  make lint            Run linting"
	@echo "  make format          Format code"
	@echo "  make format-check    Check code formatting"
	@echo "  make type-check      Run type checking"
	@echo "  make dead-code       Find dead code"
	@echo "  make build           Build for production"
	@echo "  make clean           Clean build artifacts"
	@echo "  make check           Run all quality checks"

install:
	npm install

dev:
	npm install
	npm run prepare

test:
	npm run test:run

test-cov:
	npm run test:coverage

test-changed:
	npm run test:changed

test-e2e:
	npm run test:e2e

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

type-check:
	npm run type-check

dead-code:
	npm run dead-code

build:
	npm run build

clean:
	rm -rf dist/ node_modules/ coverage/ test-results/ playwright-report/ .vite/

check: lint type-check dead-code test

all: clean install dev check