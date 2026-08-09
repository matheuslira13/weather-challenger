# AGENTS.md

Context for any AI agent (Claude, Codex, etc.) working on this codebase.

## What this project is

A backend service that takes a city/town and ranks how good the next 7 days
will be for four activities: skiing, surfing, outdoor sightseeing, and indoor
sightseeing. Weather data comes from Open-Meteo and is persisted (not fetched
on every request).

## Stack

- Node.js
- NestJS
- GraphQL
- Supabase

## Project structure

```
src/
  geocoding/     # Open-Meteo geocoding lookup (city + country -> lat/lon/tz)
    dto/         # GraphQL input types
    models/      # GraphQL object types
    validations/ # Zod schemas + ZodValidationPipe
  weather/       # forecast fetching + persistence (stub, not yet implemented)
  scoring/        # activity scoring logic
```
Resolvers and services live next to what they integrate with (e.g.
`geocoding/geocoding.resolver.ts`, `geocoding/geocoding.service.ts`) rather
than in a separate top-level `graphql/` folder. Each module is
self-contained — `GeocodingModule` imports its own `HttpModule`, etc. — and
is wired into `AppModule` independently of sibling modules.

Input validation for a module's GraphQL args uses a custom Zod-backed
`PipeTransform` local to that module (see `geocoding/validations/`), applied
via `@Args('input', new ZodValidationPipe(schema))`, not class-validator
decorators on the DTO. This is currently only established for `geocoding/`.
(update this as the real structure solidifies)

## Conventions

- Keep resolvers thin — business logic (scoring, data shaping) lives in
  services, not resolvers.
- Any non-obvious design decision must be logged in DECISIONS.md, not just
  explained in a PR description or left implicit in code.
- Commit messages should reference the relevant DECISIONS.md entry when a
  design decision drove the change.

## Commands

- `yarn dev` — run in watch mode
- `yarn test` — unit tests
- (fill in as they're set up: lint, e2e, migrations, seed, etc.)

## Open questions currently unresolved

(keep this list current — move items to DECISIONS.md once resolved)

-