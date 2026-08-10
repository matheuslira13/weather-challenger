# Weather Challenger API

A GraphQL backend, built with [NestJS](https://nestjs.com/), that takes a city
and country, and ranks how good the next 7 days will be for four activities:
**skiing, surfing, outdoor sightseeing, and indoor sightseeing** — based on
[Open-Meteo](https://open-meteo.com/) weather data, cached in Redis rather
than fetched on every request.

For the full reasoning behind every design decision below — including
alternatives considered and open questions — see [DECISIONS.md](./DECISIONS.md).

## How it works

The approach evolved in stages, in roughly this order:

1. **Geocoding first.** A city name alone is ambiguous — the same name can
   match multiple places. Since this is a backend-only exercise (no UI for a
   user to pick from a list of matches), city + country code are both
   required inputs, and the first result Open-Meteo's geocoding API returns
   (ranked by relevance/population) is used. In a full application with a
   front end, this would likely be an incremental search-as-you-type
   experience instead — that's out of scope here.
2. **Forecast, isolated.** A separate service fetches the 7-day daily
   forecast from Open-Meteo given coordinates, independent of geocoding.
3. **Combined into one query.** The two were merged so a single GraphQL
   query resolves a city straight to its full 7-day forecast — geocoding and
   forecast orchestrated together, avoiding a second round trip for the
   client.
4. **Caching.** Once the combined response worked end-to-end, a Redis-backed
   cache (with TTL) was added so repeated requests for the same city don't
   re-fetch from Open-Meteo every time.
5. **Activity scoring.** The last step: turning raw daily weather data into a
   0–100 score per activity, per day.

## Tech stack

- [NestJS](https://nestjs.com/) with TypeScript
- [GraphQL](https://graphql.org/) (code-first, Apollo)
- [Redis](https://redis.io/) (hosted on Redis Cloud) for caching
- RxJS for HTTP orchestration (chaining geocoding → forecast, cache
  read/write) — used deliberately over plain async/await in service layers
- Jest for testing

## Quick start

### Prerequisites

- Node.js 20 or later
- Yarn
- A Redis instance (e.g. a free [Redis Cloud](https://redis.io/try-free/)
  database) — no local Docker setup required

### Installation

```bash
git clone git@github.com:matheuslira13/weather-challenger.git
cd weather-challenger-api
yarn install
```

### Environment variables

##"The REDIS_URL will be sent in the same email as the link to this GitHub repository."

Create a `.env` file in the project root:

```
REDIS_URL=redis://default:<password>@<host>:<port>
```

The REDIS_URL will sent in the same email such as the link of this repositoty github
This is the full connection string your Redis provider gives you (Redis
Cloud shows it directly in the database's connection panel).

### Run locally

```bash
yarn dev
```

The GraphQL endpoint runs at `http://localhost:3000/graphql` by default
(open it in a browser for the interactive Playground/Sandbox).

## Example query

```graphql
query CityForecast {
  cityForecast(input: { city: "Praia Grande", countryCode: "BR" }) {
    location {
      admin1
      admin2
      latitude
      longitude
      timezone
    }
    forecast {
      date
      temperatureMax
      temperatureMin
      precipitationProbabilityMax
      snowfallSum
      windSpeedMax
      windDirectionDominant
      weatherCode
      activities {
        skiing
        surfing
        outdoorSightseeing
        indoorSightseeing
      }
    }
  }
}
```

## Scoring approach

Every activity score is calculated as **100 minus penalties**, clamped to a
0–100 range, per day:

- **Outdoor sightseeing**: penalized by rain probability (heaviest weight),
  temperature outside a comfortable range, and wind.
- **Skiing**: scores 0 outright if no snowfall is forecast — treated as
  disqualifying, not partial. Otherwise, penalized by above-freezing
  temperatures and strong wind.
- **Surfing**: uses wind speed as a rough proxy, since wave-height data
  requires Open-Meteo's separate Marine Weather API (out of scope here).
- **Indoor sightseeing**: the inverse of the outdoor sightseeing score —
  bad weather for being outside makes indoor activities more appealing.

Exact thresholds, weights, and the reasoning behind each are documented in
[DECISIONS.md](./DECISIONS.md).

## Assumptions

- When a city name matches multiple locations, the first result from
  Open-Meteo's geocoding API is used — no disambiguation step, since this is
  a backend-only exercise.
- Country code is expected in ISO-3166-1 alpha2 format (e.g. `BR`); no format
  validation is enforced beyond that — an invalid code simply returns no
  geocoding results, surfaced as a "not found" error.
- Forecast + activity scores are cached in Redis with a TTL, keyed by
  city + country code; requests within that window return cached data
  instead of calling Open-Meteo again.
- Surf scoring is a wind-based proxy, not based on actual wave/swell data.
- Skiing score is 0 whenever no snowfall is forecast, regardless of any
  other condition.
- Indoor sightseeing score is mathematically derived from the outdoor score
  (`100 - outdoorScore`), rather than an independently modeled formula.

## Available scripts

| Command           | Description                                   |
| ----------------- | --------------------------------------------- |
| `yarn dev`        | Starts the API in watch mode for development. |
| `yarn start`      | Starts the API normally.                      |
| `yarn build`      | Compiles the project into `dist/`.            |
| `yarn start:prod` | Runs the compiled production build.           |
| `yarn test`       | Runs unit tests.                              |
| `yarn test:cov`   | Runs tests with coverage reporting.           |
| `yarn test:e2e`   | Runs end-to-end tests.                        |
| `yarn lint`       | Lints source and test files.                  |

## Project structure

```text
src/
  geocoding/        # City name + country code -> coordinates (Open-Meteo geocoding)
  weather/           # Forecast fetching + orchestration (calls geocoding, then forecast)
  scoring/            # One injectable service per activity (skiing, surfing, outdoor/indoor sightseeing)
  redis/               # RedisService — cache read/write via ioredis
  common/
    cache/             # CacheInterceptor — GraphQL-aware caching, applied per-query
    module/logger/     # Custom LoggerService, injected across services
  app.module.ts
  main.ts
```

## What I'd do with more time

- Real wave-height data for surf scoring, via Open-Meteo's Marine Weather API.
- Configurable/tunable scoring weights (currently fixed constants) — e.g. via
  environment variables or a config object, so thresholds can be adjusted
  without a code change.
- Broader e2e test coverage of the full `cityForecast` query, beyond the
  current unit-level coverage.
  sta
