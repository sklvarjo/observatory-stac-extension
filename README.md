# Observatory STAC Extension

**Work in progress. No versioned release has been published.** Both the schema
and its adoption guidance are under active development. Not an endorsed STAC
community extension.

The extension adds variable selection and companion-column semantics to Table
columns and retains the in-situ station metadata previously proposed by Observatory.
It also extends STAC CF v1.0.0 to Table columns; upstream CF v1.0.0 does not traverse
`table:columns`. It does not redefine the CF vocabulary.

## Development Schema

The source is [schema.json](schema.json). Its unversioned publication URL is:

https://sklvarjo.github.io/observatory-stac-extension/schema.json

This URL follows deployments from `main`, not a release tag. Edit the schema and
merge changes without changing a version number or the URL. Breaking changes are
possible during development. Publishing to Pages does not create a release or
promise compatibility. Feature branches, including pull requests, do not deploy
over the public schema.

Providers adopting this draft should record the source commit and retain a local
schema snapshot for reproducible validation. Review changes before refreshing
cached or vendored copies, and coordinate incompatible changes with consumers.
The same declaration URL may resolve to different schema contents over time.

## GitHub Pages Setup

These steps apply to this extension repository, independently of any consuming app.

1. Merge the schema, documentation and `.github/workflows/pages.yml` into `main`.
2. As a repository administrator, open **Settings > Pages > Build and deployment**
  and select **GitHub Actions** as the source. Enable Actions if repository or
  organization policy has disabled it. This is the one-time enablement step;
  the deployment workflow does not require an administrator token.
3. In **Settings > Environments > github-pages**, allow deployments from `main`
  only. Keep any required reviewer policy appropriate to the repository.
4. Push to `main`, or run **Publish development schema** manually from `main`.
  The workflow stages only the schema and README, deploys them with the Pages
  actions, then verifies the public JSON identity, content and CORS response.
5. Confirm the deployment URL shown by Actions. The intended host/path must match
  both `$id` and the `stac_extensions` constant in the schema. A renamed repository
  or custom domain needs a deliberate URL migration, not a silent declaration change.

The workflow is deliberately restricted to `main`, including manual runs. To use
a different publishing branch, change both its trigger/job guard and the Pages
environment policy together. Working-branch names do not otherwise affect this guide.
See [GitHub's custom Pages workflow instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

### Cross-Origin Access

Public schema responses must include:

```http
Access-Control-Allow-Origin: *
```

GitHub Pages manages HTTP headers; repository `_headers` files, `.htaccess` and
workflow YAML cannot configure its CORS response. Public Pages responses normally
provide this wildcard header. The deployment check verifies it on the actual
schema response instead of pretending to install a header rule. If it is absent,
the workflow fails: inspect custom-domain/proxy behavior and use hosting or a proxy
with configurable response headers if necessary. A failing post-deployment check
does not roll back the deployment.

For an alternative host, configure `Access-Control-Allow-Origin: *` on successful
schema GET/HEAD responses (and error responses where supported). Serve JSON as
`application/json` or `application/schema+json` over HTTPS. Consumers should fetch
public schemas without credentials or custom request headers. Wildcard CORS does
not support credentialed requests; avoid unnecessary preflight requests. If your
host/client needs OPTIONS, configure that host to permit GET/HEAD and the required
request headers. CORS permission does not bypass a client's schema-host allowlist.

After deployment, verify from any machine with Node.js 22 or newer:

```sh
node scripts/check-pages.mjs https://sklvarjo.github.io/observatory-stac-extension/
```

The check sends an `Origin` header, requires wildcard CORS, checks JSON content
type and compares the served schema with the local source. Browser smoke test:

```js
fetch('https://sklvarjo.github.io/observatory-stac-extension/schema.json', {
  credentials: 'omit'
}).then(response => response.json()).then(schema => console.log(schema.$id));
```

## First Versioned Release

Do this only after the field semantics and provider/consumer behavior are ready
for a compatibility commitment. Until then, keep developing the root schema.

1. Review supported STAC/Table/CF versions, schema validation, examples, scientific
  constraints and migration guidance with adopting providers and consumers.
2. Choose the first release version. Copy the reviewed root schema to a new
  `vX.Y.Z/schema.json`; change its `$id` and declaration constant to the matching
  versioned Pages URL. Do not redirect that URL to the mutable root schema.
3. Include release-specific documentation, examples, changelog and migration notes.
  Update the Pages staging and verification scripts to include all released
  directories and check their identities and CORS. Keep older releases available.
4. Merge to `main`, deploy, and verify every released URL before publishing the
  matching Git tag and GitHub Release. Mark prereleases explicitly when applicable.
5. Tell providers to opt into the versioned declaration and update pinned copies
  deliberately. Never silently rewrite declarations in existing catalogs.
6. Freeze published versioned schema files. Further changes need a new release
  version under the chosen compatibility policy. The root `schema.json` remains
  an explicitly mutable development endpoint for subsequent work.

## Placement And Declarations

- `table:columns`: Collection top level, Item `properties`, `assets` and `item_assets`.
- `obs:*` column fields and `cf:*` fields below: inside each Column Object only.
- `in_situ:*`: Item `properties` only, not geometry, Collections, assets or links.
- Declare Table (the example below uses v1.2.0) and this extension for column
  annotations; additionally declare CF v1.0.0 when using its fields. Keep an already
  valid Table declaration; no forced upgrade is implied.
- Validate against STAC core and all declared extension schemas. This schema does
  not replace Table/core validation and does not enumerate all CF names.

```json
{
  "stac_extensions": [
    "https://stac-extensions.github.io/table/v1.2.0/schema.json",
    "https://stac-extensions.github.io/cf/v1.0.0/schema.json",
    "https://sklvarjo.github.io/observatory-stac-extension/schema.json"
  ],
  "table:columns": [
    {
      "name": "temperature",
      "type": "number",
      "unit": "K",
      "cf:standard_name": "air_temperature",
      "obs:role": "measurement",
      "obs:related": [
        {
          "column": "temperature_error",
          "relation": "standard_error",
          "uncertainty_type": "absolute",
          "multiplier": 1
        },
        { "column": "temperature_qc", "relation": "quality_flag" }
      ]
    },
    {
      "name": "temperature_error",
      "type": "number",
      "unit": "K",
      "cf:standard_name": "air_temperature standard_error",
      "obs:role": "ancillary"
    },
    {
      "name": "temperature_qc",
      "type": "integer",
      "obs:role": "ancillary",
      "obs:categories": [
        { "value": 0, "meaning": "good" },
        { "value": 1, "meaning": "mediocre" },
        { "value": 2, "meaning": "bad" }
      ]
    }
  ]
}
```

This is an illustrative Collection fragment, not a complete STAC document or a
claim about a particular dataset. Merge it at the appropriate scope without replacing other
metadata. The example QC codes are valid only for a source using that codebook.

## Column Fields

| Field | Meaning |
| --- | --- |
| `obs:role` | One of `measurement`, `coordinate`, `ancillary`, `diagnostic`. Measurement includes derived and categorical quantities. Coordinates include time/position/index. Ancillary values describe another variable. Diagnostics describe instrument/processing operation. Missing role means unknown, not implicitly measurement. |
| `obs:related` | Nonempty array of relationship objects. Direction is from selected variable to companion. Targets are exact case-sensitive `name` values in the **same** `table:columns` array, aligned row by row. Names must be unique; self references and cross-asset references are invalid. No alignment/interpolation is implied. |
| `obs:categories` | Nonempty array of `{value, meaning, title?, description?}`. Values are typed numbers, strings or booleans; meanings are lowercase snake_case identifiers. Both values and meanings must be unique. Optional human-readable text can retain source wording. Not a bitmask encoding, nodata definition, ordinal ranking or chart color scheme. |
| `obs:temporal_extent` | `[start, end]`, inclusive column coverage. Bounds are valid calendar dates or RFC 3339 timestamps with offsets; either bound may be null, but not both. Dates retain whole-day precision. Start must not be later than end. Omit unknown coverage. This is coverage, not a sampling or integration interval. |
| `cf:standard_name` | CF name plus optional single space and one modifier listed below. Shape is validated; name existence, quantity, sign, reference frame and units still need semantic checking. |
| `cf:cell_methods` | The released CF v1.0.0 array-of-strings/null shape, extended to Table columns. State actual axes and operations, e.g. `["time: standard_deviation"]` only for a known temporal aggregation domain. |

Existing Table/Common Metadata such as `name`, `type`, `unit`, `nodata`,
`data_type`, `statistics`, `description` and `title` remain intact.

## Relationships

Each entry requires `column` and `relation`; optional `description` records
qualifications. Never infer companions solely from a suffix or compatible units.

| Relation | Interpretation |
| --- | --- |
| `quality_flag` | Target codes describe quality of this variable; the codebook is required for interpretation. |
| `processing_flag` | Target codes describe provenance/processing, e.g. measured versus gapfilled. Not a quality ranking. |
| `standard_deviation` | Target gives statistical spread of the same quantity, population, coordinate frame and sample domain. Not automatically uncertainty of the mean or flux. Units are compatible difference units of the parent. |
| `standard_error` | Target gives uncertainty, including systematic/statistical contributions as applicable to the CF definition. Requires `uncertainty_type`. Optional positive `multiplier` defaults to 1: stored target = multiplier times one standard error. Do not infer it from a confidence interval. |
| `confidence_interval_lower`, `confidence_interval_upper` | Targets are interval **endpoints**, not distances from the estimate. Both bounds must be present with equal `confidence_level` and `uncertainty_type`. Confidence level is a fraction strictly between 0 and 1 (e.g. 0.95), not 95. One-sided limits are outside this paired-interval encoding. |
| `number_of_observations` | Target counts the observations underlying this value; unit `1`. |
| `detection_minimum` | Target gives the smallest detectable signal in compatible units of the parent. |

`uncertainty_type: "absolute"` uses parent-compatible units: difference units for
standard error, actual endpoint units for intervals. `"relative"` uses dimensionless
fractions of the parent value (0.05 means 5%); interval endpoints are ratios to the
parent, not relative half-widths. Producers must define behavior near zero and for
negative parent values; clients must not silently turn these into symmetric bars.
Neither `uncertainty_type` nor `confidence_level` applies to a quality flag or spread.

JSON Schema checks shapes, supported values and conditional requirements. Providers
and validators must additionally check target existence, duplicate names/category
codes, paired interval metadata and temporal ordering. Neither check proves unit or
scientific equivalence, matching sample populations, or the contents of data files.

## CF Semantics

Reference vocabulary: [CF standard names v95](https://raw.githubusercontent.com/cf-convention/vocabularies/refs/heads/main/docs/cf-standard-names/version/95/cf-standard-name-table.xml)
and [CF 1.7 Appendix C](https://cfconventions.org/Data/cf-conventions/cf-conventions-1.7/build/apc.html).

| Modifier | Units and meaning |
| --- | --- |
| `detection_minimum` | Dimensionally equivalent to the base quantity; minimum detectable signal. |
| `number_of_observations` | `1`, not the base quantity's unit. |
| `standard_error` | Dimensionally equivalent to the base quantity; one standard error by default. A multiplier must be documented. |
| `status_flag` | Flag codes, not the base quantity's physical unit. CF datasets require `flag_values` and/or `flag_masks` with `flag_meanings`. |

`standard_deviation` is **not** a standard-name modifier. Use the actual CF cell
method when known; do not relabel spread as standard error. A relative uncertainty
column cannot use a base physical-quantity `standard_error` name unless its units
are dimensionally equivalent as CF requires. `obs:categories` describes Table
categorical codes; when exporting CF datasets, map it to the appropriate CF flag
attributes. Do not invent `cf:flag_values` or `cf:ancillary_variables` STAC fields.
For CF export, a relationship multiplier maps to the dataset's
`standard_error_multiplier` attribute, not an invented STAC `cf:*` property.

Scaled compatible units are legitimate: ppm is dimensionless at 1e-6, hPa is 100 Pa,
and Celsius temperatures are convertible to kelvin. Converting temperature spread
uses no 273.15 offset. Mass/amount and area-integrated/per-area quantities are not
interchangeable by editing unit labels.

## In-Situ Metadata

The extension includes these four optional Item properties. Declare this schema
for them; no separate in-situ extension is required.

| Item property | Definition |
| --- | --- |
| `in_situ:station_altitude` | Numeric station elevation above sea level in metres; negative values allowed. ICOS `specificInfo.acquisition.station.location.alt` / `cpmeta:hasElevation`. |
| `in_situ:station_altitude_vertical_datum` | Optional verified nonempty datum/vertical CRS identifier; requires station_altitude. Omit if unknown. |
| `in_situ:sampling_height` | Numeric sampling/inlet height in metres, preserving ICOS `specificInfo.acquisition.samplingHeight` / `cpmeta:hasSamplingHeight` when its reference surface is unverified. |
| `in_situ:sensor_height_above_ground` | Nonnegative sensor/sampling-inlet height in metres, only when the local-ground reference has been verified. |

Sources: [ICOS elevation](https://meta.icos-cp.eu/ontologies/cpmeta/hasElevation),
[sampling height](https://meta.icos-cp.eu/ontologies/cpmeta/hasSamplingHeight),
[metadata registration](https://github.com/ICOS-Carbon-Portal/meta#registering-the-metadata-package).
ICOS sampling height alone does not prove a ground reference. Station altitude plus
sampling height does not prove WGS 84 ellipsoidal GeoJSON z. Preserve station and
sensor locations independently, and do not invent a vertical datum. Missing values
are omitted, not null or sentinels.

## Provider Adoption

Inventory actual column names, descriptions, units and codebooks before annotating
a dataset. Verify quantity, sign convention, reference frame, aggregation domain
and uncertainty interpretation. Units alone do not prove equivalence. Do not infer
error bars from column suffixes, relabel concentration spread as flux uncertainty,
or equate processing provenance with quality.

Preserve existing metadata and extension declarations. Apply only reviewed
annotations; keep conditional candidates separate from executable metadata patches.
Unknown codebooks, reference surfaces and confidence levels must remain unknown
until the producer can establish them. Revalidate against STAC core and every
declared extension, then test with the clients that will consume the catalog.