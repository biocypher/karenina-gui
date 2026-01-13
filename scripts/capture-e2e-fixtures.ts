#!/usr/bin/env npx tsx
/**
 * E2E Fixture Capture Script
 *
 * This script orchestrates capturing LLM response fixtures for E2E tests.
 * It uses the existing karenina/scripts/capture_fixtures.py Python script
 * to capture real LLM responses, then copies them to the GUI fixtures directory.
 *
 * Usage:
 *   npm run fixtures:capture -- --scenario template_parsing
 *   npm run fixtures:capture -- --all
 *   npm run fixtures:capture -- --list
 *
 * Prerequisites:
 *   - ANTHROPIC_API_KEY environment variable must be set
 *   - karenina package must be installed in the Python environment
 */

import { spawn } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Paths
const KARENINA_DIR = resolve(__dirname, '../../../karenina');
const KARENINA_FIXTURES_DIR = join(KARENINA_DIR, 'tests/fixtures/llm_responses');
const GUI_FIXTURES_DIR = resolve(__dirname, '../tests/fixtures/llm-responses/e2e');

interface CaptureOptions {
  scenario?: string;
  all?: boolean;
  list?: boolean;
  force?: boolean;
  dryRun?: boolean;
  model?: string;
}

/**
 * Run the Python capture script in the karenina directory.
 */
async function runPythonCapture(options: CaptureOptions): Promise<number> {
  const args = ['run', 'python', 'scripts/capture_fixtures.py'];

  if (options.list) {
    args.push('--list');
  } else if (options.all) {
    args.push('--all');
  } else if (options.scenario) {
    args.push('--scenario', options.scenario);
  }

  if (options.force) {
    args.push('--force');
  }

  if (options.dryRun) {
    args.push('--dry-run');
  }

  if (options.model) {
    args.push('--model', options.model);
  }

  console.log(`\n📦 Running: uv ${args.join(' ')}`);
  console.log(`   Working directory: ${KARENINA_DIR}\n`);

  return new Promise((resolve) => {
    const proc = spawn('uv', args, {
      cwd: KARENINA_DIR,
      stdio: 'inherit',
      env: process.env,
    });

    proc.on('error', (error) => {
      console.error('Failed to start Python capture script:', error);
      resolve(1);
    });

    proc.on('exit', (code) => {
      resolve(code ?? 0);
    });
  });
}

/**
 * Copy captured fixtures from karenina to GUI fixtures directory.
 */
function copyFixturesToGui(model: string = 'claude-haiku-4-5'): void {
  const sourceDir = join(KARENINA_FIXTURES_DIR, model);

  if (!existsSync(sourceDir)) {
    console.log(`\n⚠️  No fixtures found at ${sourceDir}`);
    return;
  }

  console.log(`\n📋 Copying fixtures from ${sourceDir} to ${GUI_FIXTURES_DIR}`);

  // Ensure target directory exists
  if (!existsSync(GUI_FIXTURES_DIR)) {
    mkdirSync(GUI_FIXTURES_DIR, { recursive: true });
  }

  // Copy all fixture subdirectories
  const scenarios = readdirSync(sourceDir);
  let copiedCount = 0;

  for (const scenario of scenarios) {
    const scenarioSource = join(sourceDir, scenario);
    const scenarioTarget = join(GUI_FIXTURES_DIR, model, scenario);

    if (statSync(scenarioSource).isDirectory()) {
      // Create target directory
      mkdirSync(scenarioTarget, { recursive: true });

      // Copy JSON files
      const files = readdirSync(scenarioSource).filter((f) => f.endsWith('.json'));
      for (const file of files) {
        cpSync(join(scenarioSource, file), join(scenarioTarget, file));
        copiedCount++;
      }
    }
  }

  console.log(`   ✅ Copied ${copiedCount} fixture files\n`);
}

/**
 * Clean existing fixtures in the GUI directory.
 */
function cleanFixtures(): void {
  if (existsSync(GUI_FIXTURES_DIR)) {
    console.log(`\n🧹 Cleaning existing fixtures at ${GUI_FIXTURES_DIR}`);
    // Remove all contents but keep the directory
    const contents = readdirSync(GUI_FIXTURES_DIR);
    for (const item of contents) {
      const itemPath = join(GUI_FIXTURES_DIR, item);
      rmSync(itemPath, { recursive: true, force: true });
    }
  }
}

/**
 * Display usage information.
 */
function showHelp(): void {
  console.log(`
E2E Fixture Capture Script

Usage:
  npm run fixtures:capture -- [options]

Options:
  --scenario <name>   Capture fixtures for a specific scenario
                      Available: template_parsing, rubric_evaluation, abstention, full_pipeline
  --all               Capture all scenarios
  --list              List available scenarios
  --force             Overwrite existing fixtures
  --dry-run           Show what would be captured without actually capturing
  --model <name>      LLM model to use (default: claude-haiku-4-5)
  --clean             Clean existing GUI fixtures before capturing
  --copy-only         Only copy existing karenina fixtures to GUI (don't capture new ones)
  --help              Show this help message

Examples:
  # List available scenarios
  npm run fixtures:capture -- --list

  # Capture template parsing fixtures
  npm run fixtures:capture -- --scenario template_parsing

  # Capture all fixtures, overwriting existing ones
  npm run fixtures:capture -- --all --force

  # Clean and recapture all fixtures
  npm run fixtures:capture -- --clean --all --force

  # Just copy existing karenina fixtures to GUI
  npm run fixtures:capture -- --copy-only

Prerequisites:
  - ANTHROPIC_API_KEY must be set in the environment
  - karenina must be installed (run from karenina-gui directory)
`);
}

/**
 * Main entry point.
 */
async function main(): Promise<number> {
  const args = process.argv.slice(2);

  // Parse arguments
  const options: CaptureOptions & { clean?: boolean; copyOnly?: boolean; help?: boolean } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--scenario':
      case '-s':
        options.scenario = args[++i];
        break;
      case '--all':
      case '-a':
        options.all = true;
        break;
      case '--list':
      case '-l':
        options.list = true;
        break;
      case '--force':
      case '-f':
        options.force = true;
        break;
      case '--dry-run':
      case '-n':
        options.dryRun = true;
        break;
      case '--model':
      case '-m':
        options.model = args[++i];
        break;
      case '--clean':
        options.clean = true;
        break;
      case '--copy-only':
        options.copyOnly = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        showHelp();
        return 1;
    }
  }

  // Show help
  if (options.help) {
    showHelp();
    return 0;
  }

  // Check for API key
  if (!options.list && !options.copyOnly && !process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is not set.');
    console.error('   Please set it before running fixture capture.');
    return 1;
  }

  // Copy-only mode
  if (options.copyOnly) {
    const model = options.model || 'claude-haiku-4-5';
    copyFixturesToGui(model);
    return 0;
  }

  // Clean if requested
  if (options.clean) {
    cleanFixtures();
  }

  // Validate options
  if (!options.list && !options.all && !options.scenario) {
    showHelp();
    console.error('\n❌ Must specify either --scenario, --all, or --list');
    return 1;
  }

  // Run Python capture script
  const exitCode = await runPythonCapture(options);

  if (exitCode !== 0) {
    console.error(`\n❌ Fixture capture failed with exit code ${exitCode}`);
    return exitCode;
  }

  // Copy fixtures to GUI directory (unless just listing or dry-run)
  if (!options.list && !options.dryRun) {
    const model = options.model || 'claude-haiku-4-5';
    copyFixturesToGui(model);
  }

  console.log('✅ Fixture capture complete!\n');
  return 0;
}

// Run main
main()
  .then((code) => process.exit(code))
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
