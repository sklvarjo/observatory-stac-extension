import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { checkPages, verifySchemaResponse } from './check-pages.mjs';
import { preparePages } from './prepare-pages.mjs';

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'));
const response = (value = schema, headers = {}, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', ...headers },
});

test('public response requires the expected JSON, identity and wildcard CORS', async () => {
  await verifySchemaResponse(response(), schema);
  await verifySchemaResponse(response(schema, { 'Content-Type': 'application/schema+json' }), schema);
  await assert.rejects(verifySchemaResponse(response(schema, { 'Access-Control-Allow-Origin': '' }), schema), /Access-Control-Allow-Origin/);
  await assert.rejects(verifySchemaResponse(response(schema, { 'Access-Control-Allow-Origin': 'https:\/\/example.net' }), schema), /Access-Control-Allow-Origin/);
  await assert.rejects(verifySchemaResponse(response(schema, { 'Content-Type': 'text/html' }), schema), /JSON response/);
  await assert.rejects(verifySchemaResponse(response(schema, {}, 404), schema), /HTTP 404/);
  await assert.rejects(verifySchemaResponse(response({ ...schema, $id: 'https://example.org/old.json' }), schema), /identity differs/);
  await assert.rejects(verifySchemaResponse(response({ ...schema, title: 'Old content' }), schema), /differs from this checkout/);
});

test('deployment check sends Origin without credentials and rejects another deployment URL', async () => {
  let called = false;
  await checkPages('https://sklvarjo.github.io/observatory-stac-extension', schema, async (url, options) => {
    called = true;
    assert.equal(url.pathname, '/observatory-stac-extension/schema.json');
    assert(url.searchParams.has('deployment'));
    assert.equal(options.headers.Origin, 'https://example.net');
    assert.equal(options.credentials, 'omit');
    return response();
  });
  assert(called);
  await assert.rejects(checkPages('https://example.org/wrong/', schema), /Pages URL must match/);
});

test('publication stages only development schema and generic docs, not audit artifacts or old versions', () => {
  const root = mkdtempSync(join(tmpdir(), 'observatory-pages-'));
  try {
    for (const name of ['schema.json', 'README.md']) copyFileSync(new URL(`../${name}`, import.meta.url), join(root, name));
    mkdirSync(join(root, '_site'));
    writeFileSync(join(root, '_site', 'stale.json'), '{}');
    writeFileSync(join(root, 'scan-hints.json'), '{}');
    const output = preparePages(root);
    assert.deepEqual(readdirSync(output).sort(), ['.nojekyll', 'README.md', 'schema.json']);
    assert.deepEqual(JSON.parse(readFileSync(join(output, 'schema.json'), 'utf8')), schema);
    assert.equal(preparePages(root), output);
    const wrongDeclaration = structuredClone(schema);
    wrongDeclaration.properties.stac_extensions.contains.const = 'https://example.org/old.json';
    writeFileSync(join(root, 'schema.json'), JSON.stringify(wrongDeclaration));
    assert.throws(() => preparePages(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});