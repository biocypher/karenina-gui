#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = resolve(scriptDir, '..');
const distDir = join(root, 'dist');
const indexPath = join(distDir, 'index.html');

function fail(message) {
  console.error(`packaged-dist check failed: ${message}`);
  process.exit(1);
}

function walkFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function isLocalReference(ref) {
  return (
    ref &&
    !ref.startsWith('#') &&
    !ref.startsWith('data:') &&
    !ref.startsWith('http://') &&
    !ref.startsWith('https://') &&
    !ref.startsWith('//')
  );
}

if (!existsSync(distDir) || !statSync(distDir).isDirectory()) {
  fail('dist/ directory is missing. Run `npm run build` first.');
}

if (!existsSync(indexPath) || !statSync(indexPath).isFile()) {
  fail('dist/index.html is missing.');
}

const index = readFileSync(indexPath, 'utf8');
const refs = [...index.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter(isLocalReference);

if (refs.length === 0) {
  fail('dist/index.html does not reference any local built files.');
}

const assetRefs = refs.filter((ref) => ref.includes('/assets/'));
if (assetRefs.length === 0) {
  fail('dist/index.html does not reference any built /assets/ files.');
}

for (const ref of refs) {
  const normalized = ref.startsWith('/') ? ref.slice(1) : ref;
  const assetPath = join(distDir, normalized);
  if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
    fail(`referenced local file is missing: ${ref}`);
  }
}

const localhostPattern = /(?:https?|wss?):\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/api|\/ws|\/v2|["'`\s)]|$)/;
const scannedExtensions = new Set(['.html', '.js', '.css', '.json']);
for (const file of walkFiles(distDir)) {
  const extension = file.slice(file.lastIndexOf('.'));
  if (!scannedExtensions.has(extension)) continue;
  const content = readFileSync(file, 'utf8');
  if (localhostPattern.test(content)) {
    fail(`built file contains a hard-coded localhost API/WebSocket origin: ${file}`);
  }
}

console.log(`packaged-dist check passed: ${refs.length} local reference(s), ${assetRefs.length} asset reference(s), no localhost API/WebSocket origins.`);
