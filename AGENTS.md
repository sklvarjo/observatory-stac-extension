# Observatory STAC extension: repository guide

## Purpose and relationships

This repository owns the **Observatory metadata schema and its semantics**, not
an Observatory application, runtime library or UI theme. It is a development-only
extension, not an endorsed STAC community standard or a versioned release.

Observatory pins this repository at `schemas/observatory`, copies the schema into
its data package and implements the associated loading/temporal/UI behavior.
`cards-zarr-optim` emits metadata that references this extension; HIKET catalogs
and `hiket-viz` are potential producers/consumers through Observatory.
`stac-schema-explorer` offers the live schema for inspection rather than
maintaining a separate enriched copy. The `sem:` vocabulary-concept proposal
lives in **stac-semantics**: do not conflate scientific concept identity with
Observatory roles, sampling or companion-column metadata.

All projects are pre-alpha and can coordinate breaking interfaces efficiently.
The current schema URL is deliberately mutable:

`https://sklvarjo.github.io/observatory-stac-extension/schema.json`

Keep that URL, `schema.json`'s `$id`, extension declarations and publication checks
consistent. Consumers should pin a source commit/snapshot; do not require every
dependent application to update immediately or claim this URL is immutable.
Read the destination repo's instructions before implementing consumer changes.

## Organization and authoring

- [schema.json](schema.json) is the authoritative machine-readable source.
- [README.md](README.md) is the semantic specification, including rules that
  JSON Schema cannot express, temporal examples and publication policy.
- [scripts/prepare-pages.mjs](scripts/prepare-pages.mjs) stages the schema,
  README and `.nojekyll`; `_site` is generated output.
- [scripts/check-pages.mjs](scripts/check-pages.mjs) checks deployed URL,
  content/identity, content type and wildcard CORS.
- [scripts/pages.test.mjs](scripts/pages.test.mjs) tests publication behavior.
- [.github/workflows/pages.yml](.github/workflows/pages.yml) tests, stages and
  publishes the root development schema from `main`, then checks deployment.

There is no package manifest, dependency installation or application build.
Keep this repo small: schema, normative explanation, examples/checks and
publication tooling. Runtime APIs mentioned in the README are references to
Observatory implementations, not implementations supplied here.

## Contract invariants

- Validate alongside STAC core and the applicable Table/CF/Datacube schemas.
  The extension supports Items (`Feature`) and Collections; do not treat it as
  a standalone replacement for STAC validation.
- Preserve intentional field placement across `table:columns`,
  `cube:variables`, temporal `cube:dimensions` and their schema-defined
  containers. Do not assume every field is allowed everywhere.
- `obs:role` distinguishes `measurement`, `coordinate`, `ancillary` and
  `diagnostic`; absence means **unknown**, not measurement.
  `obs:categories` carries category meanings, not viewer palette selection.
  The schema also extends CF field handling to Table columns.
- `obs:related` names exact sibling columns and relation kinds (quality,
  processing, uncertainty or counts). Preserve conditional metadata:
  confidence intervals require a confidence level; standard error/intervals
  require uncertainty type; multiplier applies only to standard error.
  Target existence, self/cross-asset references and paired scientific
  consistency need semantic checks, not just object-shape validation.
- Station fields belong to Item properties. Keep altitude above sea level and
  its vertical datum distinct from verified sensor height above ground and
  sampling height with an unverified reference surface. Do not infer one from
  the other to satisfy a convenient display.
- Temporal metadata separates timestamp/grid position from integration support:
  `obs:origin`, `obs:timezone_offset`, `obs:nominal_step`,
  `obs:alignment_tolerance`, `obs:timestamp_column`, `obs:timestamp_format`
  and `obs:integration`. Preserve units (offset minutes, tolerance milliseconds),
  calendar/UTC interpretation, and instantaneous versus interval semantics.
  Do not flatten calendar durations into a constant number of seconds.
- JSON Schema checks local shape, types, allowed values and conditional fields.
  Calendar validity, bound ordering, column existence, duplicate category codes,
  unit consistency and relationships between native cells and integration
  remain provider/runtime responsibilities. Do not claim schema validation
  proves scientific correctness.

Change schema definitions, titles/descriptions, README field tables/examples and
consumer-facing guidance together. Preserve meaningful field documentation so
schema-driven tools can explain the extension without hardcoded UI dictionaries.
Do not add logos, application menus or display-theme configuration here.

## Validation and publication

Use Node 22 or later, matching the workflow:

```sh
node --test scripts/pages.test.mjs
node scripts/prepare-pages.mjs
```

After an intentional deployment, `node scripts/check-pages.mjs <pages-base-url>`
checks the served artifact and makes network requests. A local staging check
does not prove hosted CORS or content type. Never publish as an incidental test.

Publication must serve the expected schema body/identity over HTTPS with a
JSON-compatible content type and wildcard CORS for browser clients. Do not
substitute an HTML preview or redirect the schema to an app page.

For the eventual first versioned release, follow the README's release procedure:
coordinate versioned identity, declarations and deployed path, then keep that
released URL immutable. That future policy does not change the current root
development URL's explicit mutability.

## TODO: current gaps

- [ ] Add local schema-validation fixtures/tests for accepted and rejected field
  placements and conditional rules. Existing tests cover Pages publication, not
  Ajv validation of station, companion or temporal metadata.
- [ ] Add targeted semantic-validation examples/tests where JSON Schema cannot
  enforce a rule, keeping responsibility explicit rather than implying an Ajv
  pass verifies references, calendars or scientific equivalence.
- [ ] Establish an explicit repository software license if publishing as open
  source; the current repository has no license declaration. Do not infer one
  from related STAC repositories.

## Keep this guide current

Update this file whenever schema scope, semantic rules, publication identity,
commands, lifecycle/versioning policy or consumer relationships change, or new
information would prevent repeated investigation. Keep detail in the README,
record concrete outstanding discrepancies in TODO, and remove resolved entries.
Do not turn proposed future behavior into a claim about the current schema.
