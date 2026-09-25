# Observatory STAC Extension

Draft **0.1.0**, owned by Observatory. Not an endorsed STAC community extension.

The extension adds variable selection and companion-column semantics to Table
columns and retains the in-situ station metadata previously proposed by Observatory.
It also extends STAC CF v1.0.0 to Table columns; upstream CF v1.0.0 does not traverse
`table:columns`. It does not redefine the CF vocabulary.

## Publication

`v0.1.0/schema.json` is ready for GitHub Pages after choosing the repository URL.
Its current identity, `https://example.org/observatory-stac-extension/v0.1.0/schema.json`,
is a reserved **UNPUBLISHED PLACEHOLDER**, not a live service.

1. Replace both occurrences of the placeholder in the schema (`$id` and the
   declaration constant) with `https://OWNER.github.io/REPOSITORY/v0.1.0/schema.json`.
2. Publish this directory in the separate repository. Enable GitHub Pages from
   the publishing branch root. Keep `.nojekyll`; JSON needs no build step.
3. Verify that the versioned URL returns the schema, not an HTML page. Treat
   published versions as immutable; publish incompatible changes under a new version.
4. Replace the placeholder in the example below and every upstream declaration.
   Preserve other `stac_extensions` entries. Do not declare the example.org URL upstream.
5. Update Observatory's vendored schema identity at
   `packages/data/src/schemas/observatory/v0.1.0/schema.json`, regenerate with
   `node packages/data/scripts/generate-schemas.mjs`, and rebuild. Hints derive their
   URL from this schema. The pinned copy works offline. To fetch *unvendored* future
   versions, explicitly add the actual GitHub Pages hostname to
   `SCHEMA_HOST_ALLOWLIST`; do not allow all github.io hosts.

The application currently registers the placeholder only as an offline draft.
No production hostname has been assumed or allowlisted.

## Placement And Declarations

- `table:columns`: Collection top level, Item `properties`, `assets` and `item_assets`.
- `obs:*` column fields and `cf:*` fields below: inside each Column Object only.
- `in_situ:*`: Item `properties` only, not geometry, Collections, assets or links.
- Declare Table (the current HIKET release is v1.2.0) and this extension for column
  annotations; additionally declare CF v1.0.0 when using its fields. Keep an already
  valid Table declaration; no forced upgrade is implied.
- Validate against STAC core and all declared extension schemas. This schema does
  not replace Table/core validation and does not enumerate all CF names.

```json
{
  "stac_extensions": [
    "https://stac-extensions.github.io/table/v1.2.0/schema.json",
    "https://stac-extensions.github.io/cf/v1.0.0/schema.json",
    "https://example.org/observatory-stac-extension/v0.1.0/schema.json"
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

This is a Collection fragment, not a complete STAC document or a claim about any
HIKET temperature error. Merge it at the appropriate scope without replacing other
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

JSON Schema checks shapes, supported values and conditional requirements. The
Observatory scan additionally checks target existence, duplicate names/category
codes, paired interval metadata and temporal ordering. Neither proves unit or
scientific equivalence, matching sample populations, or the contents of data files.

## CF Semantics

The audit uses [CF standard names v95](https://raw.githubusercontent.com/cf-convention/vocabularies/refs/heads/main/docs/cf-standard-names/version/95/cf-standard-name-table.xml)
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

The four fields from the earlier Observatory in-situ draft are included without
changing their names or units. This combined schema supersedes that standalone
unpublished draft for new adoption; do not declare both drafts.

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

## Audit And Scanner

`variable-audit.md` inventories all 151 distinct variable metadata signatures in
the 541-document local HIKET snapshot. `variable-audit.json` retains exact source
descriptions/units, occurrences, proposed fields, conditions, the 23 reviewed CF
definitions and the XML SHA-256. It includes cube variables as well as table columns;
`obs:*` column roles/relationships are not proposed on cube variables.
`scan-hints.json` is the upstream handoff: exact findings and unconditional JSON
Patch operations for each of the 28 affected documents (494 operations in this snapshot).

The browser's debug Scan shows literal JSON Patch operations with escaped JSON
pointers. Conditional CF candidates appear separately and are **not** unconditional
patches. Apply only adopted recommendations; do not overwrite conflicting existing
annotations. Unknown codebooks and uncertainty definitions remain unresolved.
Exact metadata signatures and audited units guard recommendations, so changed
source descriptions/units need review and regeneration. No input catalog is edited.

Regenerate inside the Observatory workspace after downloading the linked XML to
`temp/cf-standard-name-table-v95.xml` and preparing `temp/hiket-stac`:

```sh
node packages/data/scripts/audit-observatory.mjs
node packages/data/scripts/generate-schemas.mjs
pnpm --filter @observatory/data build
node packages/data/scripts/audit-observatory.mjs --check-hints
node --test --test-name-pattern="Observatory" packages/data/test/build-stac-from.unit.test.mjs
```

The generator overwrites the browser subset and temporary audit/schema files,
but not this README. `--check-hints` uses the freshly built package, validates the
patched in-memory documents and rescan idempotence, and exports `scan-hints.json`.
The full CF XML is not bundled in the application.