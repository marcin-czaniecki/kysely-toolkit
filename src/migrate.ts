import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { v7 as uuidv7 } from "uuid";
import type { Kysely } from "kysely";
import { FileMigrationProvider, Migrator } from "kysely/migration";
import type { KyselyToolkitConfig } from "./config.js";
import { buildFileName, slugify } from "./fileName.js";

export type MigrateOptions = {
  migrationFolder?: string;
};

function createMigrator(db: Kysely<any>, migrationFolder: string) {
  const migrationPath = {
    join: (...parts: string[]) => pathToFileURL(path.join(...parts)).href,
  };

  return new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path: migrationPath,
      migrationFolder,
    }),
  });
}

export async function migrateUp(db: Kysely<any>, options?: MigrateOptions) {
  const folder = options?.migrationFolder ?? "./migrations";
  const { error, results } = await createMigrator(db, folder).migrateUp();

  for (const result of results ?? []) {
    console.log(`${result.migrationName}: ${result.status}`);
  }

  if (error) throw error;
}

export async function migrateToLatest(db: Kysely<any>, options?: MigrateOptions) {
  const folder = options?.migrationFolder ?? "./migrations";
  const { error, results } = await createMigrator(db, folder).migrateToLatest();

  for (const result of results ?? []) {
    console.log(`${result.migrationName}: ${result.status}`);
  }

  if (error) throw error;
}

export async function migrateDown(db: Kysely<any>, options?: MigrateOptions) {
  const folder = options?.migrationFolder ?? "./migrations";
  const { error, results } = await createMigrator(db, folder).migrateDown();

  for (const result of results ?? []) {
    console.log(`${result.migrationName}: ${result.status}`);
  }

  if (error) throw error;
}

export async function migrateStatus(db: Kysely<any>, options?: MigrateOptions) {
  const folder = options?.migrationFolder ?? "./migrations";
  const migrator = createMigrator(db, folder);
  const migrations = await migrator.getMigrations();

  for (const migration of migrations) {
    const status = migration.executedAt ? `executed at ${migration.executedAt.toISOString()}` : "pending";
    console.log(`${migration.name}: ${status}`);
  }

  return migrations;
}

export async function migrateReset(db: Kysely<any>, options?: MigrateOptions) {
  const folder = options?.migrationFolder ?? "./migrations";
  const migrator = createMigrator(db, folder);

  let hasMore = true;

  while (hasMore) {
    const { error, results } = await migrator.migrateDown();

    for (const result of results ?? []) {
      console.log(`${result.migrationName}: ${result.status}`);
    }

    if (error) throw error;

    hasMore = (results?.length ?? 0) > 0;
  }
}

export async function migrateRedo(db: Kysely<any>, options?: MigrateOptions) {
  console.log("Rolling back last migration...");
  await migrateDown(db, options);

  console.log("Re-applying last migration...");
  await migrateUp(db, options);
}

export async function makeMigration(name: string, config: Required<KyselyToolkitConfig>) {
  const slug = slugify(name);
  const fileName = buildFileName(uuidv7(), slug);
  const filePath = path.join(config.migrationsPath, fileName);

  await fs.mkdir(config.migrationsPath, { recursive: true });
  await fs.writeFile(filePath, config.migrationTemplate, "utf8");

  console.log(`Created migration: ${filePath}`);
  return filePath;
}
