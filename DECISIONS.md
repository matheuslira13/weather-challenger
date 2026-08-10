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

## [2026-08-09] Standalone forecast-fetching service in weather/, no geocoding coupling yet

**Question:** Implementing `WeatherService.getDailyForecast(latitude,
longitude, timezone)` against Open-Meteo's daily forecast endpoint raised:
where should the erroneous `weather.module.ts` stub content go (it actually
contained a duplicate `WeatherResolver` class, not a `@Module()`), should
`WeatherModule` be wired into `AppModule` now even though it exposes no
GraphQL surface yet, and what GraphQL field types (`Int` vs `Float`) fit the
raw Open-Meteo values.

**Explored with AI:** confirmed via a live call to
`api.open-meteo.com/v1/forecast` what shape/type each daily variable
actually comes back as, rather than guessing.

**Decision:**
- `weather.module.ts` now holds a real `@Module()` (`WeatherModule`),
  replacing its previous accidental content (a copy of the `WeatherResolver`
  stub). It imports `HttpModule` directly, provides and exports
  `WeatherService` — exported so a later step (chaining geocoding →
  forecast) can consume it from another module without restructuring.
  `weather.resolver.ts` / `weather.resolver.spec.ts` /
  `models/weather.model.ts` are untouched, still reserved for future
  GraphQL wiring.
- `WeatherModule` is wired into `AppModule` now (same pattern as
  `GeocodingModule`: self-contained, imported independently), even though it
  has no resolver yet — this just makes `WeatherService` part of the app's
  DI graph. It adds no GraphQL types/queries; confirmed `src/schema.gql` is
  byte-for-byte unchanged after this work.
- New `models/daily-forecast.model.ts` (`DailyForecast`) is a GraphQL
  `@ObjectType()`, consistent with the existing `models/` convention
  (`geocoding-result.model.ts`), even though nothing references it yet —
  decorating it is inert until a resolver exists.
- Field types on `DailyForecast`, based on a live Open-Meteo response:
  `temperatureMax`/`temperatureMin`/`snowfallSum`/`windSpeedMax`/
  `windDirectionDominant` as `Float` (continuous measurements — kept
  `windDirectionDominant` as `Float` rather than `Int` since compass-average
  degrees could plausibly be fractional even though the sample was whole
  numbers); `precipitationProbabilityMax` and `weatherCode` as `Int`
  (percentage and WMO code are always whole numbers per Open-Meteo's own
  docs and the sample response).
- Pipeline mirrors `geocoding.service.ts`: `tap` (log raw response) →
  `catchError` (request failures → `InternalServerErrorException`) → `map`
  (zip the seven parallel `daily.*` arrays into `DailyForecast[]`). No
  `NotFoundException`-style empty-check step — unlike geocoding's city
  search, a well-formed lat/lon/timezone always yields forecast data from
  this endpoint, so there's no "not found" case to guard against.
- No coupling to `GeocodingModule`: `WeatherService` takes plain
  `latitude`/`longitude`/`timezone` primitives, has no dependency on
  `GeocodingService` or its types, and no `switchMap`-style chaining exists
  yet.

**Assumption (would confirm with a PM):** none beyond the field-type choices
above — verified against a real API response rather than guessed.

---

## [2026-08-09] WeatherService orchestrates GeocodingService for a combined `cityForecast` query

**Question:** A single query needed to return a city's full 7-day forecast
(geocode the city, then fetch the forecast for the resolved coordinates).
Which service should own the orchestration and depend on the other, where
should the combined result type live, and should the existing geocode-only
`geocodeCity` query be removed once the combined query exists?

**Explored with AI:** discussed `GeocodingService` depending on
`WeatherService` vs. the reverse; discussed adapting `geocodeCity`'s
Promise-returning call into the new RxJS pipeline via `from()` vs. mixing
`await` with an Observable chain; discussed whether to keep the geocode-only
query once a combined query exists.

**Decision:**
- `WeatherService` is the orchestrator: `WeatherModule` imports
  `GeocodingModule`, and `WeatherService` injects `GeocodingService` via its
  constructor. `GeocodingModule` now `exports: [GeocodingService]` so it can
  be consumed this way. `GeocodingService`/`GeocodingModule` have zero
  awareness of `weather/` — no import, injection, or reference in either
  direction back.
- New `WeatherService.getCityForecast(input: GeocodeCityInput):
  Promise<CityForecastResult>` implements the whole thing as one RxJS
  pipeline: `from(this.geocodingService.geocodeCity(input))` adapts the
  already-Promise-returning geocoding call back into an Observable (rather
  than mixing `await` with `switchMap`), `tap`/`catchError` log the
  geocoding leg specifically (the `catchError` here only logs and rethrows
  the original exception — `GeocodingService` already maps failures to
  `NotFoundException` vs `InternalServerErrorException`, so no
  re-wrapping), then `switchMap` feeds the resolved location into a
  `fetchForecast$` private helper (extracted from the pre-existing
  `getDailyForecast` HTTP call, now shared by both) with its own
  `tap`/`catchError` logging, `map`ping the two results together into
  `{ location, forecast }`. `firstValueFrom` converts to a `Promise` only at
  the very end of the combined chain.
- `CityForecastResult` (`{ location: GeocodingResult, forecast:
  WeatherResult[] }`) lives in `weather/models/city-forecast-result.model.ts`,
  not `geocoding/models/`, since it's the orchestrator's return shape and
  keeps `geocoding/models/geocoding-result.model.ts` from having to know
  about `WeatherResult`. It composes the two existing types as fields — no
  `extends`/inheritance between `GeocodingResult` and `WeatherResult`.
- Both the geocode-only `geocodeCity` query (in `geocoding/`, unchanged
  behavior — still just `GeocodingResult`) and the new `cityForecast` query
  (in `weather/weather.resolver.ts`, alongside the existing lat/lon/timezone
  `weather` query) are kept side by side in the schema — confirmed with a
  PM-equivalent decision rather than assumed, since they serve different
  callers (raw geocoding lookup vs. full forecast-by-city-name).
- Incidental cleanup while rewiring: `WeatherResolver` was previously
  registered directly on `AppModule`'s `providers` instead of
  `WeatherModule`'s (worked by accident because `WeatherModule` exports
  `WeatherService` into `AppModule`'s scope) — moved into `WeatherModule` to
  match `GeocodingModule`'s self-contained pattern.

**Assumption (would confirm with a PM):** none beyond the "keep both
queries" call above, which was explicitly asked and confirmed rather than
assumed.

---

## [2026-08-10] Redis caching layer for the `cityForecast` query

**Question:** Repeated `cityForecast` lookups for the same city hit both the
Open-Meteo geocoding API and the forecast API on every request, even though
forecast data doesn't change minute-to-minute. What should back a cache (and
is a database even the right tool for it), where should the caching logic
live, and how should cache keys be derived in a GraphQL API where every
request is a POST to the same `/graphql` endpoint — so HTTP method/URL
can't be used the way a REST cache would use them?

**Explored with AI:** discussed Redis vs. a relational/document database as
the cache store; discussed a global Nest interceptor covering every
resolver vs. per-query opt-in via `@UseInterceptors`; discussed deriving the
cache key from the GraphQL execution context's resolved input args vs. some
HTTP-level signal.

**Decision:**
- Storage: Redis (hosted on Redis Cloud, free tier — connection string in
  `.env` as `REDIS_URL`, gitignored), chosen over a relational/document
  database as overkill for this: the cached data is inherently short-lived
  (forecasts expire naturally after a few hours) and there's no historical
  or audit querying need — a plain expiring key-value store fits the shape
  of the problem.
- New `src/redis/` module: `RedisService` (`redis.service.ts`) wraps
  `ioredis`, connecting via a single `REDIS_URL` env var rather than
  separate host/port/password fields — `new Redis(process.env.REDIS_URL as
  string)`. `ConfigModule.forRoot()` was added to `AppModule` so `.env` is
  actually loaded. `RedisService` exposes only `get(key): Promise<string |
  null>` and `set(key, value, ttlSeconds): Promise<void>` — `ttlSeconds` is
  a required parameter (no default), so every caller has to make an
  explicit TTL decision; `set` writes with `EX` in seconds. It implements
  `OnModuleDestroy` to disconnect the `ioredis` client on shutdown.
  `RedisModule` provides and exports both `RedisService` and
  `CacheInterceptor` — there's no separate `CacheModule`; `RedisModule` is
  the single home for both, and `WeatherModule` imports `RedisModule`
  directly.
- New `src/common/cache/cache.interceptor.ts`: `CacheInterceptor`, a
  `NestInterceptor` injecting `RedisService` via constructor DI. It's
  applied **per-query**, not globally — `@UseInterceptors(CacheInterceptor)`
  sits directly on `WeatherResolver.getCityForecast` only. The plain
  `weather` (lat/lon/timezone) query is not cached.
- Cache key: built from the GraphQL query's resolved input args
  (`city`/`countryCode`) via `GqlExecutionContext.create(context).getArgs()`,
  not from HTTP method/URL — every GraphQL request is a POST to the same
  `/graphql` endpoint, so there's no per-query URL to key off. Key shape:
  `` `forecast:${countryCode.toLowerCase()}:${city.toLowerCase().replace(/\s+/g, '-')}` ``
  (e.g. `forecast:br:sao-paulo`).
- TTL: `CACHE_TTL_SECONDS = 60 * 60 * 3` (3 hours), a named constant at the
  top of `cache.interceptor.ts`. Chosen because forecast data doesn't need
  to be accurate to the minute — a multi-hour-old 7-day forecast is still a
  reasonable answer, so a few hours of staleness is an acceptable trade for
  cutting repeated upstream calls.
- RxJS pattern inside `intercept()`: `from(this.redisService.get(cacheKey))`
  converts the Redis `get` Promise into an Observable; `switchMap` (not
  `map`) branches on the result — a hit returns `of(JSON.parse(cached))`, a
  miss falls through to `next.handle()` — both branches are themselves
  Observables, and `switchMap` flattens them into a single stream instead of
  the Observable-of-Observable that `map` would produce.
- What's cached: the **full `CityForecastResult`** (`{ location, forecast
  }`), not just the raw forecast array — the miss-path `tap` JSON-stringifies
  and stores whatever `next.handle()` emits, which is
  `WeatherResolver.getCityForecast`'s full return value. A cache hit
  therefore skips the geocoding call too, not just the forecast call — both
  upstream Open-Meteo requests are avoided on a repeat lookup for the same
  city/country.

**Assumption (would confirm with a PM):** the cache write on the miss path
(`this.redisService.set(...)` inside `tap`) is not awaited — it's
fire-and-forget, so a Redis write failure wouldn't surface anywhere or block
the response, but a slow write also can't delay it. Left as observed rather
than changed, since that wasn't part of what was being decided here.

---

## [2026-08-10] Activity scoring for all 4 activities, and where scores live in the schema

**Question:** `OutdoorSightseeingScoreService` already existed as the only
implemented scorer. Implementing the other three (skiing, surfing, indoor
sightseeing) raised: what thresholds/weights should each use (only
directions — "penalize warm temps," "penalize strong wind" — were given, not
numbers), how should indoor sightseeing's "inverse of outdoor" relationship
actually be implemented, and — since no `activities`/score field existed
anywhere yet in the schema — where should the 4 scores per day actually live
on the GraphQL types?

**Explored with AI:** discussed nesting an `ActivityScores` object inside
each `WeatherResult` day vs. a separate parallel `activities: ActivityScores[]`
array on `CityForecastResult`; discussed concrete numbers for skiing
(snow cutoff, temperature/wind penalty thresholds) and surfing (wind-only
proxy thresholds), since only the direction of each penalty was specified;
discussed deriving indoor sightseeing from outdoor's score vs. an
independent inverse formula.

**Decision:**
- **Schema shape:** `ActivityScores` (`{ skiing, surfing, outdoorSightseeing,
  indoorSightseeing }`, all `Float`) is nested as an `activities` field
  directly on `WeatherResult` (`weather/models/activity-scores.model.ts`),
  not a parallel array on `CityForecastResult`. Every day's weather and its
  4 scores travel together, so a client never has to zip two arrays by
  index. Consequence: since `WeatherResult` is shared by both the plain
  `weather` (lat/lon/timezone) query and `cityForecast`, **both** queries now
  return per-day activity scores — not just `cityForecast`. This felt like
  the right call rather than a side effect to work around: scores are a pure
  function of a day's weather data, independent of which query fetched it.
- **Where it's computed:** inside the existing `map()` in
  `WeatherService.fetchForecast$` — the one place that already builds every
  `WeatherResult` object (shared by both public methods) — via a new private
  `buildActivityScores(day)` helper that calls all four services'
  `calculateScore(day)`. No new RxJS operators were added to either
  pipeline; only that map's callback body changed. Each day object is built
  first without `activities` (cast to `WeatherResult`, since none of the
  scoring services read `day.activities` back — reading a field the object
  hasn't been given yet would be a real bug, this only works because nothing
  does), then `day.activities` is assigned from the helper before returning.
- **Skiing** (`skiing-score.service.ts`): hard cutoff — `snowfallSum < 1cm`
  (`MIN_SNOWFALL_CM`) returns `0` immediately, no other calculation runs; no
  snow is disqualifying, not partial credit. Otherwise `100 − tempPenalty −
  windPenalty`, clamped to 0: `tempPenalty = (temperatureMax − 2°C) × 4`,
  capped at 50 (warmth above freezing-adjacent degrades snow); `windPenalty =
  (windSpeedMax − 30km/h) × 2`, capped at 30. Caps sum to 80, not 100 — a
  snowy-but-terrible day floors at a score of 20, never 0, so 0 stays
  exclusively meaningful as "no snow" rather than also meaning "snow, but
  awful conditions."
- **Surfing** (`surfing-score.service.ts`): no wave-height/swell data is
  available without Open-Meteo's separate Marine Weather API (out of scope
  for now, same limitation noted in the original 2026-08-08 example entry
  for this project — see the top of this file). `windSpeedMax` is the only
  factor, used as a rough proxy: `100 − windPenalty`, clamped to 0, where
  `windPenalty = 0` at/below 25km/h (`WIND_NEUTRAL_MAX_KMH` — light-to-moderate
  wind treated as neutral/acceptable), else `(windSpeedMax − 25) × 2` capped
  at 90. The low confidence of a wind-only swell proxy is reflected in the
  penalty's magnitude (capped well short of what's needed to zero the score
  — only genuinely extreme wind, ~70km/h+, gets close to 0), not as a
  separate confidence field on the result.
- **Indoor sightseeing** (`indoor-sightseeing-score.service.ts`): derived
  by injecting `OutdoorSightseeingScoreService` and returning `100 −
  outdoorScore`, rather than an independent inverse formula built from the
  same 3 factors (rain/temperature/wind). Chosen because outdoor and indoor
  are meant to be exact mirrors — deriving from the one existing formula
  guarantees that; an independent formula would need every future tweak to
  outdoor's weights/caps re-applied in reverse by hand to stay in sync,
  which is an easy place for the two to silently drift.
- All three new services follow `OutdoorSightseeingScoreService`'s existing
  shape exactly: named constants at the top (no magic numbers), private
  helper methods per penalty factor, a single public `calculateScore(day:
  WeatherResult): number`, "100 − penalties, clamped to 0" pattern. Filenames
  use a `-score.service.ts` suffix (`skiing-score.service.ts`,
  `surfing-score.service.ts`, `indoor-sightseeing-score.service.ts`) per an
  explicit naming example given for this work, even though the pre-existing
  `outdoor-sightseeing.service.ts` doesn't have that suffix — a minor,
  known inconsistency, not corrected here since renaming the existing file
  wasn't part of this change.
- All four registered as providers + exports in `scoring/scoring.module.ts`;
  `WeatherService` injects all four via constructor (`WeatherModule` already
  imported `ScoringModule`).

**Assumption (would confirm with a PM):** every numeric threshold/weight/cap
above (skiing's 1cm/2°C/30km/h cutoffs and their weights/caps; surfing's
25km/h neutral point, weight, and 90 cap) is a reasonable starting point
picked to satisfy the stated direction of each penalty, not derived from any
real product/user feedback or domain data — worth tuning once real usage or
domain expertise (e.g. an actual skier/surfer's sense of "good conditions")
is available. Also unconfirmed: whether the plain `weather` query gaining
activity scores as a side effect of the nested-per-day schema choice is
desired long-term, or whether it should eventually be split back out so that
query stays purely raw-weather.

---

## [2026-08-10] Redis outage resilience — caching must degrade, not crash the app

**Question:** Found via manual testing, not a designed requirement: with no
`REDIS_URL`, wrong credentials, or the Redis instance unreachable/down, the
app failed entirely instead of degrading. Root cause — `ioredis` emits an
`'error'` event on connection failures, and Node's `EventEmitter` throws
(crashing the process) when an `'error'` event has no listener; separately,
even if that were handled, `RedisService.get()`/`set()` would still reject
and that rejection was never caught anywhere in `CacheInterceptor`'s
pipeline. The 2026-08-10 caching entry above already documented the
cache-*write* path as fire-and-forget (not awaited, so a slow/failed write
can't block the response) — but that assumption never actually covered a
failed/rejecting write, or the read path at all. This entry closes both
gaps: caching should be a performance optimization, not a hard dependency
for the API to function.

**Explored with AI:** confirmed the crash mechanism by pointing `REDIS_URL`
at an unreachable address and running the app live before and after the
fix — before: unhandled `'error'` event; after: the app stays up, logs the
connection error repeatedly (`ioredis`'s own retry behavior, untouched by
this change), and a live `cityForecast` query against the real Open-Meteo
APIs still returns correct data with Redis fully down. Discussed where to
add resilience — only in `RedisService` (so every caller automatically gets
safe behavior), or also independently in `CacheInterceptor` — decided both,
since defense-in-depth is cheap here and the interceptor is the only actual
caller today but shouldn't be the only thing standing between a Redis
failure and a broken request.

**Decision:**
- `RedisService` (`src/redis/redis.service.ts`): now injects `LoggerService`
  (added `LoggerModule` to `RedisModule`'s imports for this). The `ioredis`
  client gets an `.on('error', ...)` listener in the constructor that logs
  via `LoggerService` — this alone fixes the hard crash, since it's what
  stops Node's `EventEmitter` from throwing on an unhandled `'error'`
  event. `get()` and `set()` are both wrapped in try/catch: `get()` logs and
  resolves `null` on failure (indistinguishable from a real cache miss to
  every caller); `set()` logs and resolves (void) on failure rather than
  rejecting — consistent with the existing fire-and-forget assumption for
  writes, now actually true even when the write errors, not just when it's
  slow.
- `CacheInterceptor` (`src/common/cache/cache.interceptor.ts`): added as a
  second layer of defense, independent of `RedisService`'s own handling.
  The Redis-read-and-parse step (`redisService.get()` + `JSON.parse` on a
  hit) was pulled into its own `cachedValue$` observable ending in a
  `catchError` that logs (now via an injected `LoggerService`, added as a
  new constructor dependency — the file previously only used raw
  `console.log`/`console.info` for hit/miss messages, which are unchanged)
  and falls back to `of(null)`, i.e. treated exactly like a cache miss. This
  also incidentally guards a corrupted cache entry that fails `JSON.parse`,
  not just a Redis outage. Placement matters: this `catchError` wraps only
  the read/parse step, *not* `next.handle()` — the outer `switchMap` that
  calls `next.handle()` sits after `cachedValue$` in the pipe, so a real
  business-logic error from the resolver (e.g. `NotFoundException`) still
  propagates normally and is never swallowed or retried by this fallback.
  The cache-write `tap()` was already not awaited before returning the
  response to the client (per the 2026-08-10 caching entry); confirmed this
  still holds — no `await` was introduced anywhere in this change, so a slow
  or failing write still can't block or fail the request.
- Nothing about the cache-hit path, the cache key format
  (`forecast:<countryCode>:<city>`), or the TTL (`CACHE_TTL_SECONDS = 60 *
  60 * 3`) changed — this was error handling only.
- Added `src/redis/redis.service.spec.ts` (didn't exist before) covering
  the error-listener registration and both `get()`/`set()` failure paths,
  and extended `cache.interceptor.spec.ts` with the Redis-rejects and
  corrupted-cache-entry fallback cases.

**Assumption (would confirm with a PM):** `ioredis`'s default reconnect/retry
behavior is left completely untouched — the client will keep attempting to
reconnect indefinitely and logging an error on every failed attempt, which
could get noisy in a sustained outage. No backoff/circuit-breaker/max-retry
cap was added, since taming retry behavior wasn't part of what was reported
or asked here; worth revisiting if log volume becomes a real problem during
an extended Redis outage.

---

## [date] Next real entry goes here