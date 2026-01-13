/**
 * Utility for writing fixtures to the filesystem
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FixtureMetadata {
  capturedAt: string;
  model: string;
  scenario: string;
  backendUrl: string;
}

export class FixtureWriter {
  constructor(private outputDir: string) {}

  /**
   * Ensure the output directory exists
   */
  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Save a verification result fixture
   */
  async saveVerificationResult(
    modelId: string,
    scenario: string,
    data: unknown,
    metadata?: Partial<FixtureMetadata>
  ): Promise<string> {
    const dirPath = path.join(this.outputDir, 'verification', modelId);
    this.ensureDir(dirPath);

    const filePath = path.join(dirPath, `${scenario}.json`);
    const fixture = {
      _metadata: {
        capturedAt: new Date().toISOString(),
        model: modelId,
        scenario,
        ...metadata,
      },
      data,
    };

    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    return filePath;
  }

  /**
   * Save a template generation fixture
   */
  async saveTemplateGenerationResult(
    modelId: string,
    scenario: string,
    data: unknown,
    metadata?: Partial<FixtureMetadata>
  ): Promise<string> {
    const dirPath = path.join(this.outputDir, 'template-generation', modelId);
    this.ensureDir(dirPath);

    const filePath = path.join(dirPath, `${scenario}.json`);
    const fixture = {
      _metadata: {
        capturedAt: new Date().toISOString(),
        model: modelId,
        scenario,
        ...metadata,
      },
      data,
    };

    fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
    return filePath;
  }

  /**
   * Save progress snapshots
   */
  async saveProgressSnapshots(
    endpoint: 'verification' | 'template-generation',
    modelId: string,
    snapshots: Array<{ stage: string; data: unknown }>
  ): Promise<string[]> {
    const dirPath = path.join(this.outputDir, endpoint, modelId, 'progress');
    this.ensureDir(dirPath);

    const savedFiles: string[] = [];

    for (const snapshot of snapshots) {
      const filePath = path.join(dirPath, `${snapshot.stage}.json`);
      const fixture = {
        _metadata: {
          capturedAt: new Date().toISOString(),
          model: modelId,
          stage: snapshot.stage,
        },
        data: snapshot.data,
      };

      fs.writeFileSync(filePath, JSON.stringify(fixture, null, 2));
      savedFiles.push(filePath);
    }

    return savedFiles;
  }

  /**
   * Save shared test data (questions, rubrics)
   */
  async saveSharedData(filename: string, data: unknown): Promise<string> {
    const dirPath = path.join(this.outputDir, 'shared');
    this.ensureDir(dirPath);

    const filePath = path.join(dirPath, `${filename}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return filePath;
  }

  /**
   * List all existing fixtures
   */
  listFixtures(): string[] {
    const fixtures: string[] = [];

    const walkDir = (dir: string): void => {
      if (!fs.existsSync(dir)) return;

      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          walkDir(filePath);
        } else if (file.endsWith('.json')) {
          fixtures.push(filePath);
        }
      }
    };

    walkDir(this.outputDir);
    return fixtures;
  }
}
