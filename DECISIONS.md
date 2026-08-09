# Decisions & Process Log

This file is a running log of the design decisions made while building this
project, including where AI was used to explore options. It's meant to be
read as a trail of reasoning, not a polished report — entries are added as
decisions happen, not rewritten after the fact.

Each entry follows roughly this shape:

```
## [date] Short title of the decision

**Question:** what was actually unclear or undecided at this point.

**Explored with AI:** one or two lines summarizing what was discussed/tried
(not a full transcript — just the substance).

**Decision:** what was actually chosen.

**Assumption (would confirm with a PM):** anything decided without a clear
spec, stated explicitly so it's not hidden in the code.
```

---

## [YYYY-MM-DD] Example entry — remove once real entries start

**Question:** Open-Meteo's free tier doesn't return wave height directly —
how should the surf score be computed?

**Explored with AI:** discussed whether to approximate surf conditions from
wind speed/direction alone vs. using Open-Meteo's separate Marine Weather API
for wave_height/wave_period.

**Decision:** use the Marine Weather API when available for the given
coordinates; fall back to a wind-based proxy score (with a lower confidence
flag) when it isn't.

**Assumption (would confirm with a PM):** inland cities with no coastline
get a surf score of 0 rather than being omitted from the response.

---

## [2026-08-08] Geocoding query: file layout, error mapping, admin fields, timeout

**Question:** Implementing a `geocodeCity` GraphQL query backed by Open-Meteo's
geocoding API raised a few things not specified upfront: where the
resolver/service should live relative to the existing (empty) `weather.*`
stubs, what to name the schema types, what exception to throw for upstream
request failures, whether to enforce a client-side request timeout, and
whether `admin1`/`admin2` are always present in Open-Meteo's response.

**Explored with AI:** discussed reusing the existing empty `weather.resolver.ts`
/ `weather.service.ts` stubs vs. adding dedicated `geocoding.*` files inside
`src/weather/`; discussed 500 vs 502 vs 503 for upstream HTTP failures;
discussed adding an explicit RxJS `timeout()` operator vs. relying solely on
`catchError` for whatever the HTTP client throws.

**Decision:**
- New dedicated files inside `src/weather/`: `geocoding.resolver.ts`,
  `geocoding.service.ts`, `geocoding.module.ts`,
  `dto/geocode-city.input.ts`, `models/geocoding-result.model.ts`. The
  existing `weather.resolver.ts`/`weather.service.ts` stubs are left
  untouched for future forecast-fetching work.
- Schema names: query `geocodeCity(input: GeocodeCityInput!): GeocodingResult!`.
- Pipeline order: `tap` (log raw response) → `catchError` (network/timeout
  failures → `InternalServerErrorException`) → `map` (extract `results`) →
  `tap` (log when empty) → `map` (extract first result, throwing
  `NotFoundException` if empty/missing). Placing `catchError` right after the
  HTTP call means it only ever sees transport-level failures — the
  `NotFoundException` thrown later in the pipe flows straight through to the
  resolver untouched, with no need to special-case rethrowing inside
  `catchError`.
- Upstream request failures (network errors, timeouts, non-2xx from Axios)
  map to `InternalServerErrorException` (500) — a generic, undifferentiated
  failure signal.
- No explicit RxJS `timeout()` operator; failures are surfaced only via
  whatever the `HttpService`/Axios call itself throws.
- `admin1` and `admin2` are both nullable on `GeocodingResult` — confirmed via
  a live call that Open-Meteo omits `admin2` for at least some valid results
  (e.g. São Paulo, BR returns `admin1` but no `admin2`).

**Assumption (would confirm with a PM):** no ISO-3166-1 alpha2 format
validation is enforced on `countryCode` beyond GraphQL's own
required-string check — an invalid or malformed code is passed straight to
Open-Meteo, which will simply return no results (surfaced as
`NotFoundException`) rather than a dedicated validation error.

---

## [2026-08-08] Geocoding split into its own module; validation moved to a Zod pipe

**Question:** The previous entry ("Geocoding query: file layout, error
mapping, admin fields, timeout") put the geocoding resolver/service/DTOs
inside `src/weather/`. Since `weather/` is meant for forecast-fetching +
persistence and geocoding is a distinct concern, should it live in its own
top-level module instead? Separately, how should `GeocodeCityInput` be
validated — class-validator decorators on the DTO, or something else?

**Explored with AI:** discussed keeping geocoding inside `weather/` vs.
splitting it into a dedicated module now (before forecast work adds more
weight to `weather/`); discussed class-validator vs. a custom Zod-based
`PipeTransform` for validating the GraphQL input argument.

**Decision:** this supersedes the file-layout part of the previous entry —
the error-mapping/pipeline/admin-fields/timeout decisions there still stand.
- All geocoding code now lives in a dedicated `src/geocoding/` module:
  `geocoding.resolver.ts`, `geocoding.service.ts`, `geocoding.module.ts`,
  `dto/geocode-city.input.ts`, `models/geocoding-result.model.ts`,
  `validations/`. `GeocodingModule` is self-contained (imports `HttpModule`
  itself) and is wired into `AppModule` independently of `WeatherModule`.
  `src/weather/` is reserved for forecast-fetching + persistence and for now
  contains only empty/stub files.
- Input validation for `geocodeCity` uses a custom `ZodValidationPipe`
  (`src/geocoding/validations/validations.pipe.ts`) backed by a Zod schema
  (`src/geocoding/validations/geocoding.schema.ts`), applied at the argument
  level: `@Args('input', new ZodValidationPipe(createGeocodingSchema))`.
  `GeocodeCityInput` carries no class-validator decorators — GraphQL's type
  system already enforces required/string-typed fields, and Zod is the
  single source of truth for the deeper rules (length bounds). This
  Zod-pipe pattern is scoped to the geocoding module only; it is not (yet) a
  project-wide convention.

**Assumption (would confirm with a PM):** the Zod schema validates
`countryCode` as length 2–3, not exactly 2 as ISO-3166-1 alpha-2 requires.
Left as-is since correcting the schema's bounds wasn't part of this change;
worth tightening to `.length(2)` in a follow-up if strict ISO compliance
matters.

---

## [date] Next real entry goes here