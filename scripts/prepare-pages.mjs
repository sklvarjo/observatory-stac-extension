import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function preparePages(root) {
  const schema = JSON.parse(readFileSync(resolve(root, 'schema.json'), 'utf8'));
  const identity = new URL(schema.$id);
  assert.equal(identity.protocol, 'https:');
  assert.equal(identity.pathname, '/observatory-stac-extension/schema.json');
  assert.equal(schema.properties.stac_extensions.contains.const, schema.$id);
  assert.match(schema.title, /development/i);
  assert.doesNotMatch(schema.title, /v?\d+\.\d+\.\d+/);
  const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
  assert(readme.includes(schema.$id), 'README must document the current schema URL');
  assert.doesNotMatch(readme, /HIKET/i);
  const output = resolve(root, '_site');
  rmSync(output, { recursive: true, force: true });
  mkdirSync(output);
  for (const name of ['schema.json', 'README.md']) copyFileSync(resolve(root, name), resolve(output, name));
  writeFileSync(resolve(output, '.nojekyll'), '');
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`Prepared ${preparePages(fileURLToPath(new URL('../', import.meta.url)))}`);
}