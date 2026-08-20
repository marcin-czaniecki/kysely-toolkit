# @janossik/kysely-toolkit

Migration and seed management toolkit for [Kysely](https://kysely.dev/). Provides a CLI and a programmatic API for managing database migrations and seeds with UUIDv7-based file ordering.

## Requirements

- **Node.js >= 22.18** — config, migrations, and seeds are loaded with Node's native TypeScript type stripping (no `tsx` / `ts-node` needed)
- **PostgreSQL** via `pg`
- Generated files use **`.mts`** (always ESM), so they work even if your app `package.json` is CommonJS

Use erasable TypeScript only in those files (`import type`, no `enum` / parameter properties). Prefer `import type` for type-only imports.

## Features

- **Migrations** — up, down, latest, status, reset, redo
- **Seeds** — run, reset, tracked execution (runs each seed only once)
- **Scaffolding** — generate migration and seed files with UUIDv7 timestamps
- **Configuration** — `toolkit.config.mts` (also loads `.ts` / `.mjs` / `.js`)
- **Programmatic API** — import functions directly in your code

## Installation

```bash
npm install @janossik/kysely-toolkit
```

Peer dependencies (install separately):

```bash
npm install kysely pg
```

## Configuration

Scaffold a config file and folders:

```bash
npx kysely-toolkit init
```

This creates `toolkit.config.mts` plus `./migrations` and `./seeds`. You can also create the config manually:

```typescript
import type { ToolkitConfig } from "@janossik/kysely-toolkit";

export default {
  "kysely-toolkit": {
    connectionString: process.env.DATABASE_URL,
    migrationsPath: "./migrations",
    seedsPath: "./seeds",
  },
} satisfies ToolkitConfig;
```

Supported config filenames (first match wins, searched upward): `toolkit.config.mts`, `.ts`, `.mjs`, `.js`.

All fields are optional. Defaults:

| Field               | Default                    | Description                            |
|---------------------|----------------------------|----------------------------------------|
| `connectionString`  | `process.env.DATABASE_URL` | PostgreSQL connection string           |
| `migrationsPath`    | `./migrations`             | Directory for migration files          |
| `seedsPath`         | `./seeds`                  | Directory for seed files               |
| `migrationTemplate` | Kysely up/down stub        | Template for generated migration files |
| `seedTemplate`      | Kysely seed stub           | Template for generated seed files      |

## CLI Usage

```bash
npx kysely-toolkit <command> [args]
```

### Setup

| Command | Description                                       |
|---------|---------------------------------------------------|
| `init`  | Create `toolkit.config.mts`, migrations and seeds |

### Migration commands

| Command   | Description                              |
|-----------|------------------------------------------|
| `up`      | Apply the next pending migration         |
| `down`    | Rollback the last applied migration      |
| `latest`  | Apply all pending migrations             |
| `status`  | Show status of all migrations            |
| `reset`   | Rollback all migrations                  |
| `redo`    | Rollback and re-apply the last migration |
| `make`    | Create a new migration file              |

### Seed commands

| Command      | Description                         |
|--------------|-------------------------------------|
| `seed`       | Run all pending seeds               |
| `seed:make`  | Create a new seed file              |
| `seed:reset` | Clear seed history and re-run all   |

### Examples

```bash
# Scaffold config and folders
npx kysely-toolkit init

# Create a new migration
npx kysely-toolkit make create_users_table

# Apply all pending migrations
npx kysely-toolkit latest

# Check migration status
npx kysely-toolkit status

# Create and run a seed
npx kysely-toolkit seed:make initial_data
npx kysely-toolkit seed
```

## Programmatic API

```typescript
import { createDatabase, migrateToLatest, runSeeds, loadConfig } from "@janossik/kysely-toolkit";

const config = await loadConfig();
const db = createDatabase(config.connectionString);

try {
  await migrateToLatest(db, { migrationFolder: config.migrationsPath });
  await runSeeds(db, { seedFolder: config.seedsPath });
} finally {
  await db.destroy();
}
```

### Available exports

```typescript
// Config
import { initConfig, loadConfig } from "@janossik/kysely-toolkit/config";

// Migrations
import {
  migrateUp,
  migrateDown,
  migrateToLatest,
  migrateStatus,
  migrateReset,
  migrateRedo,
  makeMigration,
} from "@janossik/kysely-toolkit/migrate";

// Seeds
import { runSeeds, resetSeeds, makeSeed } from "@janossik/kysely-toolkit/seed";

// File name utilities
import { buildFileName, parseFileName, slugify } from "@janossik/kysely-toolkit/fileName";
```

## File naming

Generated files use UUIDv7 for ordering and the `.mts` extension (always ESM):

```
019f1758-ba87-731c-b53b-e334dce00e5a_create_users.mts
```

Existing `.ts` / `.js` / `.mjs` / `.cjs` / `.cts` migration and seed files are still loaded. UUIDv7 is time-sortable, so files run in creation order without numeric prefixes.

## Generated migration template

```typescript
import type { Kysely } from "kysely";

export async function up(_db: Kysely<any>): Promise<void> {}

export async function down(_db: Kysely<any>): Promise<void> {}
```

## Generated seed template

```typescript
import type { Kysely } from "kysely";

export async function seed(_db: Kysely<any>): Promise<void> {}
```

Seeds are tracked in a `kysely_seed` table. Each seed runs only once unless you use `seed:reset`.

## License

[MIT](./LICENSE) © Marcin Czaniecki
