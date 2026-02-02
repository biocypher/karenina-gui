#!/usr/bin/env tsx
/**
 * LLM Fixture Generator CLI
 *
 * Captures real LLM responses from the backend API and saves them as test fixtures.
 *
 * Usage:
 *   npm run fixtures:capture              # Capture all fixtures
 *   npm run fixtures:capture:verification # Capture verification fixtures only
 */

import { program } from 'commander';
import { KareninaApiClient } from './api-client';
import { FixtureWriter } from './fixture-writer';
import { defaultConfig, defaultModelConfig } from './config';
import { captureVerificationFixtures } from './scenarios/verification';

program
  .name('fixture-generator')
  .description('Capture real LLM responses from the Karenina backend as test fixtures')
  .version('1.0.0');

program
  .command('capture')
  .description('Capture LLM response fixtures')
  .option('-e, --endpoint <type>', 'Endpoint to capture (verification, template-generation, all)', 'all')
  .option('-u, --backend-url <url>', 'Backend server URL', defaultConfig.backendUrl)
  .option('-o, --output <dir>', 'Output directory for fixtures', defaultConfig.outputDir)
  .option('-q, --quiet', 'Suppress verbose output', false)
  .option('--model <name>', 'Model name to use', defaultModelConfig.model_name)
  .option('--provider <name>', 'Model provider', defaultModelConfig.model_provider)
  .action(async (options) => {
    const verbose = !options.quiet;
    const client = new KareninaApiClient(options.backendUrl);
    const writer = new FixtureWriter(options.output);

    console.log('LLM Fixture Generator');
    console.log('=====================');
    console.log(`Backend URL: ${options.backendUrl}`);
    console.log(`Output directory: ${options.output}`);
    console.log(`Model: ${options.provider}/${options.model}`);
    console.log('');

    // Check backend health
    console.log('Checking backend connectivity...');
    const isHealthy = await client.healthCheck();
    if (!isHealthy) {
      console.error('ERROR: Backend is not reachable at', options.backendUrl);
      console.error('Please ensure the backend server is running.');
      process.exit(1);
    }
    console.log('Backend is healthy.\n');

    const modelConfig = {
      ...defaultModelConfig,
      model_name: options.model,
      model_provider: options.provider,
    };

    let hasErrors = false;

    // Capture verification fixtures
    if (options.endpoint === 'all' || options.endpoint === 'verification') {
      const result = await captureVerificationFixtures(client, writer, modelConfig, verbose);
      if (!result.success) {
        hasErrors = true;
        console.error('\nVerification fixture capture had errors:');
        result.errors.forEach((e) => console.error(`  - ${e}`));
      } else {
        console.log(`\nVerification fixtures captured: ${result.fixturesPaths.length} files`);
      }
    }

    // Template generation fixtures (placeholder for future implementation)
    if (options.endpoint === 'all' || options.endpoint === 'template-generation') {
      console.log('\nTemplate generation fixtures: Not yet implemented');
      // TODO: Implement template generation capture
    }

    console.log('\n=====================');
    if (hasErrors) {
      console.log('Fixture capture completed with errors.');
      process.exit(1);
    } else {
      console.log('Fixture capture completed successfully!');
    }
  });

program
  .command('list')
  .description('List existing fixtures')
  .option('-o, --output <dir>', 'Fixtures directory', defaultConfig.outputDir)
  .action((options) => {
    const writer = new FixtureWriter(options.output);
    const fixtures = writer.listFixtures();

    if (fixtures.length === 0) {
      console.log('No fixtures found.');
      return;
    }

    console.log(`Found ${fixtures.length} fixtures:\n`);
    fixtures.forEach((f) => console.log(`  ${f}`));
  });

program.parse();
