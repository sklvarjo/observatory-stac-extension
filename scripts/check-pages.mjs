import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function verifySchemaResponse(response, expected) {
  assert.equal(response.status, 200, `Schema fetch failed: HTTP ${response.status}`);
  assert.equal(response.headers.get('access-control-allow-origin'), '*', 'Expected Access-Control-Allow-Origin: *; GitHub Pages headers cannot be configured in the repository');
  assert.match(response.headers.get('content-type') ?? '', /^application\/(?:schema\+)?json(?:\s*;|$)/i, 'Expected a JSON response, not a Pages HTML error');
  const actual = await response.json();
  assert.equal(actual.$id, expected.$id, 'Public schema identity differs from this checkout');
  assert.equal(actual.properties?.stac_extensions?.contains?.const, actual.$id, 'Declaration constant differs from schema identity');
  assert.deepEqual(actual, expected, 'Public schema differs from this checkout; check deployment or CDN propagation and rerun');
}

export async function checkPages(base, expected, fetchSchema = fetch) {
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  const url = new URL('schema.json', baseUrl);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.href, expected.$id, 'Pages URL must match the schema identity; review custom domain or repository settings');
  url.searchParams.set('deployment', process.env.GITHUB_SHA ?? String(Date.now()));
  const response = await fetchSchema(url, {
    headers: { Origin: 'https://example.net', Accept: 'application/schema+json, application/json' },
    credentials: 'omit',
    signal: AbortSignal.timeout(30000),
  });
  await verifySchemaResponse(response, expected);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert(process.argv[2], 'Usage: node scripts/check-pages.mjs https://OWNER.github.io/REPOSITORY/');
  const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'));
  await checkPages(process.argv[2], schema);
  console.log(`Verified JSON, development identity, contents and wildcard CORS: ${schema.$id}`);
}