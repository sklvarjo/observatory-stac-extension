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

## UTC Time Series (Development)

Rasters and tables use the same temporal contract: ordinary Gregorian civil
time at UTC or a declared fixed offset from UTC. Instants are normalized to UTC;
calendar periods need not begin at UTC midnight. No solar time, machine-local
timezone or implicit daylight-saving rules are used. Prefer the existing
[Datacube temporal dimension](https://github.com/stac-extensions/datacube/blob/v2.2.0/README.md#temporal-dimension-object)
for `type`, `extent`, exact `values` and `step`, and
[CF v1.0.0](https://github.com/stac-extensions/cf/tree/v1.0.0) for
`cf:cell_methods`. Native CF coordinate `bounds` describe coordinate cells; the
variable's cell method determines whether its values represent those cells.
In particular, CF `point` variables can share those coordinates without being
integrated over their bounds. STAC core `datetime`, `start_datetime`, `end_datetime` and Collection
extents remain discovery/coverage fields, not inferred per-sample integration
intervals. Core coverage bounds are inclusive; the computation intervals below
are **half-open `[start,end)`**. Do not subtract a second from integration ends.

Declare Datacube and this extension when using the following additions **inside
the temporal `cube:dimensions` object**, at Collection top level, Item properties,
assets or item-asset definitions. `obs:integration` can additionally be placed on
individual `cube:variables` definitions and `table:columns`, overriding dimension
defaults:

| Field | Meaning |
| --- | --- |
| `obs:origin` | RFC 3339 grid anchor, normalized to UTC, including its time of day. Producers should supply it explicitly across file partitions. |
| `obs:timezone_offset` | Fixed integer minutes east of UTC, from -840 to 840. Applies to timezone-free labels and sampling/integration calendar arithmetic. Default: 0 (UTC). Explicit offsets in timestamps still determine their own instants. |
| `obs:nominal_step` | Approximate cadence, alongside actual `step: null`; never replaces exact `values` or file timestamps. Requires origin and tolerance. |
| `obs:alignment_tolerance` | Maximum deviation from a nominal slot, in integer milliseconds; strictly less than half the shortest step. A positive value requires `obs:nominal_step` and actual `step: null`. Duplicate nominal slots are errors, not implicitly averaged. |
| `obs:timestamp_column` | Table column containing sample labels or exact timestamps. |
| `obs:timestamp_format` | `iso8601`, `yyyyMMddHHmm`, `yyyy` or `yyyy-MM`. Shorthand years/months expand to their grid coordinate, including the origin's phase. |
| `obs:integration` | `"instantaneous"` explicitly declares non-integrated observations. Otherwise, an object gives start/end offsets or per-row start/end column names. Omission means unspecified, not instantaneous. Bounds are required for time-aggregated quantities unless equivalent native CF bounds are available. |

### Fixed UTC Offsets And Source Labels

Providers may declare `"obs:timezone_offset": 120` for UTC+02:00, `-300` for
UTC-05:00 or `345` for UTC+05:45. This is a **fixed civil-time offset in minutes**,
not an IANA timezone, solar time or a different clock/time scale. There is no DST
transition, even if a geographical region normally observes one.

The offset applies to all timezone-free sample labels (`yyyyMMddHHmm`, `yyyy`,
`yyyy-MM`, ISO date-only and ISO date/time without an offset), and to timezone-free
CSV integration-bound columns. An embedded `Z` or `+/-HH:MM` remains authoritative:
it is never shifted a second time. Values, bounds, matching and computations use
the resulting UTC-normalized instants.

Calendar years/months and integration-offset years/months are calculated in the
**declared fixed-offset calendar**, then converted back to UTC. This matters near
boundaries: the start of year `2026` at UTC+02:00 is `2025-12-31T22:00:00Z`.
Likewise, consecutive local month starts may fall on different last days of the
preceding UTC month. They must not be generated by stepping UTC months from the
converted origin.

Monthly observations labelled `2020-01`, `2020-02`, etc., integrating local
calendar months at UTC+02:00:

```json
{
  "cube:dimensions": {
    "time": {
      "type": "temporal",
      "extent": ["2020-01-01T00:00:00+02:00", "2020-12-01T00:00:00+02:00"],
      "step": "P1M",
      "obs:origin": "2020-01-01T00:00:00+02:00",
      "obs:timezone_offset": 120,
      "obs:timestamp_column": "month",
      "obs:timestamp_format": "yyyy-MM",
      "obs:integration": { "start": {}, "end": { "months": 1 } }
    }
  }
}
```

The first three UTC sample coordinates are `2019-12-31T22:00:00Z`,
`2020-01-31T22:00:00Z`, `2020-02-29T22:00:00Z`. January and February have
31-day and 29-day integration intervals. For samples at local 00:40, set that
phase in `obs:origin`; use `start: {"minutes": -40}` and
`end: {"months": 1, "minutes": -40}` to integrate whole local months.

The offset written in `obs:origin` only identifies that instant; it does **not**
implicitly set the calendar or column-decoding offset. Supply `obs:timezone_offset`
explicitly for non-UTC calendars. Writing the equivalent UTC origin with `Z`
produces the same result when this field is retained.

STAC core coverage and Datacube exact timestamp values retain their own timestamp
semantics. This field does not reinterpret STAC core timestamps or native CF
coordinate units/epochs, and does not assign a timezone to date-only
`obs:temporal_extent` coverage. Native NetCDF timestamps are decoded as CF
specifies; the declared offset then governs sampling and integration calendar
arithmetic on those instants. When a non-point variable method uses native cells
as integration support, its declared integration offsets must agree with them.

Omission retains the UTC default for compatibility. Existing timezone-free
compact/full CSV timestamp decoding still warns when UTC is assumed; yearly and
monthly shorthand use the profile's UTC default. Explicit zero declares UTC
without that assumption warning. The viewer initializes its offset setting from
the metadata and exposes it for all timestamp formats, including years/months.
Shared timelines, exports and general chart axes remain UTC-labelled; integration
bar edges reflect the declared calendar, not a fabricated UTC-year interval.

### Explicitly Instantaneous Measurements

Use **`"obs:integration": "instantaneous"`** to positively declare that samples
are point observations, not averages, totals or other statistics over time
intervals. This is independent of cadence: yearly, monthly, hourly, approximate
nominal and irregular measurements can all be instantaneous.

For example, one instantaneous measurement each New Year at 00:40 UTC:

```json
{
  "cube:dimensions": {
    "time": {
      "type": "temporal",
      "extent": ["2020-01-01T00:40:00Z", "2026-01-01T00:40:00Z"],
      "step": "P1Y",
      "obs:origin": "2020-01-01T00:40:00Z",
      "obs:timestamp_column": "year",
      "obs:timestamp_format": "yyyy",
      "obs:integration": "instantaneous"
    }
  }
}
```

For irregular observations use `step: null` and exact timestamps instead;
the same `obs:integration` declaration applies. Retain the standard CF `point`
cell method on a variable's temporal axis when publishing CF metadata
(for a one-dimensional time variable, `"cf:cell_methods": ["point"]`). The
Observatory value makes temporal support explicit for both table and raster
consumers; it does not redefine CF. Dimension-level declarations are defaults.
A variable/column `obs:integration` overrides the default; a variable's CF `point`
method also overrides interval defaults. A non-point CF method overrides a
dimension's instantaneous default, but still requires actual integration bounds.
An explicit variable-level instantaneous declaration conflicting with that
variable's non-point method is an error.

Mixed variables can share one time coordinate and its native CF cells:

```json
{
  "cube:variables": {
    "instant_temperature": {
      "dimensions": ["time"], "type": "data",
      "cf:cell_methods": ["point"], "obs:integration": "instantaneous"
    },
    "hourly_temperature": {
      "dimensions": ["time"], "type": "data",
      "cf:cell_methods": ["mean"],
      "obs:integration": { "start": { "hours": -1 }, "end": {} }
    }
  }
}
```

Use the same `obs:integration` field inside a Table column object. A single
Table cell-method entry refers to time; multi-axis methods need an explicit
`dimensions` mapping. Existing colon-qualified Table method strings are read
for compatibility, but new metadata should prefer per-axis method names.

The three states are distinct:

* `"instantaneous"`: positively known to be non-integrated.
* An offsets/bounds-columns object, or a non-point variable cell method with
  native coordinate bounds: interval data.
* No declaration/method establishing integration: semantics are unspecified,
  even if coordinate cells exist. Do not
  infer instantaneous measurement from this absence.

Do not use `null`, `false`, an empty object or a zero-length interval to mean
instantaneous. Explicit instantaneous declarations conflict with integration
intervals for that variable and non-point temporal cell methods;
consumers report errors rather than discarding either declaration.
Shared coordinate-cell bounds are allowed, including zero-width cells; they are
not converted to integration intervals for point variables. Legacy CSV end-column
inference applies only to variables without a more explicit point/interval declaration.
STAC discovery coverage and a nominal cadence are not integration bounds and may
still be present.

The declaration survives CSV decoding, time axes and raster metadata inspection.
Even year-only CSV labels render as point/line data, not whole-year bars, when
explicitly instantaneous. Their sample timestamps retain the grid origin's
phase. Sample mean/sum aggregation remains available; physical time integration
requires an explicitly supplied integration model, not an inferred duration.

### Calendar Steps And Integration Intervals

Steps support positive integer multiples of seconds, minutes, hours, days,
months and years: `PT15S`, `PT30M`, `PT6H`, `P2D`, `P3M`, `P2Y`.
Milliseconds use fractional seconds (`PT0.001S`); weeks, microseconds and
mixed-unit sampling steps are not part of this profile.
For compatibility, the TypeScript reader also accepts older mixed/fractional
clock-only durations (for example `PT1H30M`), normalized to whole milliseconds;
new provider metadata should use a single-unit form such as `PT90M`.
Month/year steps use calendar arithmetic from the original anchor, not repeated
addition of a guessed average duration. Monthly origins must have day 1-28 in the
declared fixed-offset calendar (UTC when omitted); yearly origins must not be
February 29 in that calendar, even for multi-year steps. Invalid dates
are rejected, not clamped. The restrictions deliberately keep a grid stable
indefinitely, including century leap-year exceptions.

Offsets are objects with signed integer `years`, `months`, `days`, `hours`,
`minutes`, `seconds`, `milliseconds`; `{}` means zero. Apply combined years/months
first in the declared fixed-offset calendar, then elapsed days/time, and reject
impossible calendar dates. `reference`
is `sample` (default, the expanded shorthand or exact sample timestamp) or
`nominal` (requires a grid). Specify **both** start and end; intervals must have
positive length. Overlapping source observations (rolling statistics, exposures,
events) are permitted and retain their actual bounds. A continuous partitioned
product must have identical
neighboring end/start boundaries. Sample timestamps need not be inside their
integration intervals (for example, a timestamp at an exclusive end is valid).

Yearly samples labelled `2026`, located at 00:40 UTC on January 1, integrating the
whole calendar year:

```json
{
  "cube:dimensions": {
    "time": {
      "type": "temporal",
      "extent": ["2020-01-01T00:40:00Z", "2026-01-01T00:40:00Z"],
      "step": "P1Y",
      "obs:origin": "2020-01-01T00:40:00Z",
      "obs:timestamp_column": "year",
      "obs:timestamp_format": "yyyy",
      "obs:integration": {
        "start": { "minutes": -40 },
        "end": { "years": 1, "minutes": -40 }
      }
    }
  }
}
```

For irregular event data use `step: null`, preserve every exact timestamp, and
omit nominal metadata. Variable-length integrations can use
`"obs:integration": {"start_column": "begin", "end_column": "end"}`.
Those columns contain actual timestamps, not yearly/monthly shorthand; with
shorthand sample labels use RFC 3339 bounds. Unobserved uniform slots cannot
invent missing per-row bounds: supply offsets or describe the observations as
irregular. Bounds columns are coordinates, not selectable measurements.

For approximately daily imagery (such as Sentinel-2), publish the actual
acquisition timestamps with `step: null` and an explicit daily nominal grid,
for example `obs:nominal_step: "P1D"` plus a producer-reviewed origin and
tolerance. Missing acquisition days are legitimate. **Daily nominal cadence
does not mean a day-long exposure/integration**. Keep real exposure bounds
separate; do not claim a daily integral. Multiple acquisitions in one nominal
slot require explicit selection/aggregation or a separate series.

### Computation, Interoperability And Charts

The Observatory TypeScript `@observatory/data/temporal` entry runs in browsers,
workers and Node.js without the array backend. `regularTimeAxis` constructs
calendar bins; `createTimeAxis` preserves exact timestamps, optional nominal
coordinates and integration bounds. `alignTimeAxes` matches declared nominal
slots or exact integration cells, never merely row positions. It returns `-1`
for unmatched cells. Similar timestamps alone do not make two quantities
scientifically equivalent: also verify units, cell methods, spatial support and
missing-data/quality policies.

`aggregateTime` consumes time-major scalar or raster buffers (`width` = cells
per timestamp). With source bounds, `mean` is duration-weighted, `sum` combines
interval totals and `integral` multiplies rates by elapsed Unix seconds.
Splitting totals requires explicit `splitTotals: "proportional"`; weighting or
splitting assumes a constant representative value within each source cell and
cannot recover unobserved sub-cell variation. Points support sample mean/sum,
not time integration. Results include counts and per-cell coverage fractions
(`NaN` coverage for points). Missing values are `NaN`, never zero. Incomplete
interval coverage gives `NaN` by default; `partial: "allow"` is explicit and still
returns coverage. This reducer requires ordered, non-overlapping source intervals
and target bins to prevent double counting; this is an operation constraint,
not an ingestion restriction. Resolve overlapping observations explicitly before
using this reducer. No implicit interpolation is performed.

Results also carry `aggregation` sufficient statistics (weighted sums, valid
durations or sample weights, contribution counts). To aggregate a result again:

```ts
const second = aggregateTime(first.values, first.axis, coarserBins, {
  method: "mean",
  sourceAggregation: first.aggregation
});
```

Derived axes carry `requiresAggregationState`; dropping the statistics gives an
error rather than converting 50% coverage into 100% or averaging bin means with
the wrong weights. Sample means retain sample weighting, duration means retain
valid-duration weighting, and previously integrated quantities are summed rather
than integrated again. Reaggregation must retain the method and cell width and
consume whole existing bins. Changing methods or splitting derived bins requires
returning to the original observations. Counts are contribution counts, not a
claim of distinct event identities when a raw interval contributes to several
bins. Statistics are per cell and must travel with the corresponding values,
including in producer-side serialization.
Derived ndarray attributes identify `temporal_aggregation` and
`temporal_weighting`. Preserve them when serializing: a reloaded derived variable
without its statistics is rejected. Reattach the serialized statistics through
`sourceAggregation` when the storage adapter does not restore `temporalAggregation`.

`@observatory/data/ndarray` additionally exports `aggregateTimeArray`, preserving
spatial dimensions even when time is not the leading axis. It automatically
carries sufficient statistics in the derived variable's `temporalAggregation`,
preserves non-temporal CF cell methods, and rejects unsupported combined-axis or
climatological method transformations. Initial rate integration requires an
explicit output unit; reaggregation does not multiply by seconds a second time.
These APIs support on-demand browser or
producer-side computation; the viewer does not yet offer an aggregation chooser
or automatically aggregate downloaded imagery.

Chart bars span their actual integration bounds with no decorative padding;
leap years and differing month lengths therefore have proportionate widths.
Clipped bars remain visible even when their sample label is outside the viewport.
Real missing-data gaps remain gaps, not fabricated coverage. Different series
may overlay with transparency; grouping bars into narrower time slots would
misrepresent their integration periods. Overlapping source intervals are rendered
as a line rather than being rejected or squeezed into fictitious disjoint bars.
At subpixel sample densities the viewer keeps its bounded-size envelope line
renderer; zooming in exposes interval bars rather than generating millions of
invisible SVG rectangles.

CSV chunk coordinate ranges and data-support envelopes are distinct. Loading
uses the support envelope, so a sample labelled at an interval's exclusive end
is still loaded when that interval is visible. Per-row bounds may be unknown
until decoding; those chunks are loaded conservatively and the view's available
coverage expands when support is known. Exports include interval samples whose
support intersects the selected range, retaining their exact timestamp labels.

Equal cadence alone does not identify raster partitions. Generic assets remain
separate selectable series. Existing explicitly reported legacy grouping rules
remain for compatibility, with variable-metadata/spatial-grid compatibility
checks; no generic same-cadence assets are silently merged.

### Time Scale And Current Limits

Coordinates use UTC-normalized **Unix milliseconds**, with proleptic Gregorian
calendar arithmetic at the declared fixed UTC offset. There is no machine-local
time or DST behavior. Leap days and century
exceptions work naturally. Unix time does **not** represent leap seconds:
`:60` timestamps, unknown offsets (`-00:00`), sub-millisecond precision and
leap-aware CF calendars are explicitly rejected. A UTC calendar day crossing a
leap second still measures 86,400 Unix seconds; results are **not SI-second-exact
physical integrals across leap insertions**. Such applications need a separate
leap-aware time scale and maintained conversion data, not a silent leap smear.
Do not describe the current implementation as full leap-second support.
Non-Gregorian model calendars (for example `360_day`, `noleap`) are not converted
to invented UTC dates; mixed Gregorian/Julian CF dates before 1582-10-15 are
also rejected.

JSON Schema checks shapes and placements. Calendar validity, half-step tolerance,
column references, ordered bounds and cross-field consistency also require
runtime/semantic validation. Native cells selected by a variable's non-point
method and explicit integration offsets must agree. Existing dataset-specific viewer repairs remain temporary,
visible assumptions; they do not edit provider metadata.

## Placement And Declarations

- `table:columns`: Collection top level, Item `properties`, `assets` and `item_assets`.
- `obs:*` column fields and `cf:*` fields below: inside each Column Object.
  Temporal sampling fields belong inside temporal Datacube dimensions;
  `obs:integration` also belongs on cube variables and Table columns.
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