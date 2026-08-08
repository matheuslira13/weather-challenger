# Weather Challenger API

A REST and GraphQL API built with [NestJS](https://nestjs.com/) for the Weather Challenger project. It provides the foundation for serving weather-related challenges and activity-ranking data by city.

> This repository is currently in its initial setup phase. The available HTTP endpoint returns a simple health-style response while the domain features are being implemented.

## Tech stack

- [NestJS](https://nestjs.com/) with TypeScript
- [GraphQL](https://graphql.org/) with Apollo
- Yarn for dependency management
- Jest for testing

## Quick start

### Prerequisites

Install the following before getting started:

- Node.js 20 or later
- Yarn

### Installation

Clone the repository and install its dependencies:

```bash
git clone git@github.com:matheuslira13/weather-challenger.git
cd weather-challenger-api
yarn install
```

### Run locally

Start the API in development mode with automatic reloads:

```bash
yarn dev
```

The server runs at `http://localhost:3000` by default. You can confirm it is running by opening:

```text
http://localhost:3000
```

To use another port, set the `PORT` environment variable before starting the app:

```bash
PORT=3001 yarn dev
```

## Available scripts

| Command | Description |
| --- | --- |
| `yarn dev` | Starts the API in watch mode for development. |
| `yarn start` | Starts the API normally. |
| `yarn build` | Compiles the project into `dist/`. |
| `yarn start:prod` | Runs the compiled production build. |
| `yarn test` | Runs unit tests. |
| `yarn test:e2e` | Runs end-to-end tests. |
| `yarn test:cov` | Runs tests with coverage reporting. |
| `yarn format` | Formats source and test files with Prettier. |
| `yarn lint` | Lints source and test files. |

## Production

Build the application, then run the generated output:

```bash
yarn build
yarn start:prod
```

## Project structure

```text
src/
  app.controller.ts  # HTTP endpoints
  app.service.ts     # Application services
  app.module.ts      # Root module and GraphQL configuration
  main.ts            # Application entry point
test/                # End-to-end test configuration
```

## API status

The base route (`GET /`) currently responds with `Hello World!`. GraphQL and the Weather Challenger domain modules are configured as the basis for future API functionality.

