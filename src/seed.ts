import { promises as fs } from "node:fs";
import path from "node:path";
import { v7 as uuidv7 } from "uuid";
import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { KyselyToolkitConfig } from "./config.js";
import { buildFileName, parseFileName, slugify } from "./fileName.js";
import { hasModuleExtension, loadUserModule, stripModuleExtension } from "./loadUserModule.js";

const SEED_TABLE = "kysely_seed";

export type SeedOptions = {
  seedFolder?: string;
};

async function ensureSeedTable(db: Kysely<any>) {
  await db.schema
    .createTable(SEED_TABLE)
    .ifNotExists()
    .addColumn("name", "varchar(255)", (col) => col.primaryKey())
    .addColumn("timestamp", "varchar(255)", (col) => col.notNull())
    .execute();
}

async function getExecutedSeeds(db: Kysely<any>) {
  const { rows } = await sql<{ name: string }>`SELECT name FROM ${sql.table(SEED_TABLE)}`.execute(db);

  return new Set(rows.map((row) => row.name));
}

async function listSeedFiles(seedFolder: string) {
  let entries: string[];

  try {
    entries = await fs.readdir(seedFolder);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return entries
    .filter((file) => hasModuleExtension(file))
    .filter((file) => parseFileName(file) !== null)
    .sort();
}

export async function runSeeds(db: Kysely<any>, options?: SeedOptions) {
  const folder = options?.seedFolder ?? "./seeds";

  await ensureSeedTable(db);

  const executed = await getExecutedSeeds(db);
  const files = await listSeedFiles(folder);

  for (const file of files) {
    const name = stripModuleExtension(file);

    if (executed.has(name)) {
      console.log(`${name}: already executed`);
      continue;
    }

    const module = await loadUserModule(path.join(folder, file));
    const seed = module.seed;

    if (typeof seed !== "function") {
      throw new Error(`Seed ${file} must export a seed function`);
    }

    await db.transaction().execute(async (trx) => {
      await (seed as (db: Kysely<any>) => Promise<void>)(trx);
      await sql`
        INSERT INTO ${sql.table(SEED_TABLE)} (name, timestamp)
        VALUES (${name}, ${new Date().toISOString()})
      `.execute(trx);
    });

    console.log(`${name}: success`);
  }
}

export async function resetSeeds(db: Kysely<any>, options?: SeedOptions) {
  const folder = options?.seedFolder ?? "./seeds";

  await ensureSeedTable(db);

  await sql`DELETE FROM ${sql.table(SEED_TABLE)}`.execute(db);
  console.log("Cleared seed history");

  await runSeeds(db, { seedFolder: folder });
}

export async function makeSeed(name: string, config: Required<KyselyToolkitConfig>) {
  const slug = slugify(name);
  const fileName = buildFileName(uuidv7(), slug);
  const filePath = path.join(config.seedsPath, fileName);

  await fs.mkdir(config.seedsPath, { recursive: true });
  await fs.writeFile(filePath, config.seedTemplate, "utf8");

  console.log(`Created seed: ${filePath}`);
  return filePath;
}
