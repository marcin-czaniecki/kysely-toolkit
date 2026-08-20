import { promises as fs } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export type KyselyToolkitConfig = {
  connectionString?: string;
  migrationsPath?: string;
  seedsPath?: string;
  migrationTemplate?: string;
  seedTemplate?: string;
};

export type ToolkitConfig = {
  "kysely-toolkit"?: KyselyToolkitConfig;
};

const CONFIG_FILE_NAME = "toolkit.config.ts";

const DEFAULT_CONFIG: Required<KyselyToolkitConfig> = {
  connectionString: "",
  migrationsPath: "./migrations",
  seedsPath: "./seeds",
  migrationTemplate: [
    'import type { Kysely } from "kysely";',
    "",
    "export async function up(_db: Kysely<any>): Promise<void> {}",
    "",
    "export async function down(_db: Kysely<any>): Promise<void> {}",
    "",
  ].join("\n"),
  seedTemplate: [
    'import type { Kysely } from "kysely";',
    "",
    "export async function seed(_db: Kysely<any>): Promise<void> {}",
    "",
  ].join("\n"),
};

const CONFIG_TEMPLATE = [
  'import type { ToolkitConfig } from "@janossik/kysely-toolkit";',
  "",
  "export default {",
  '  "kysely-toolkit": {',
  "    connectionString: process.env.DATABASE_URL,",
  '    migrationsPath: "./migrations",',
  '    seedsPath: "./seeds",',
  "  },",
  "} satisfies ToolkitConfig;",
  "",
].join("\n");

export async function initConfig(cwd?: string): Promise<string> {
  const workingDir = cwd ?? process.cwd();
  const configPath = path.join(workingDir, CONFIG_FILE_NAME);

  try {
    await fs.access(configPath);
    throw new Error(`${CONFIG_FILE_NAME} already exists at ${configPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  await fs.writeFile(configPath, CONFIG_TEMPLATE, "utf8");
  await fs.mkdir(path.join(workingDir, "migrations"), { recursive: true });
  await fs.mkdir(path.join(workingDir, "seeds"), { recursive: true });

  return configPath;
}

async function findConfigFile(cwd: string): Promise<string | null> {
  let current = cwd;

  while (true) {
    const candidate = path.join(current, CONFIG_FILE_NAME);

    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // not found, go up
    }

    const parent = path.dirname(current);

    if (parent === current) {
      return null;
    }

    current = parent;
  }
}

export async function loadConfig(cwd?: string): Promise<Required<KyselyToolkitConfig>> {
  const workingDir = cwd ?? process.cwd();
  const configPath = await findConfigFile(workingDir);

  if (!configPath) {
    return {
      ...DEFAULT_CONFIG,
      connectionString: process.env.DATABASE_URL ?? "",
      migrationsPath: path.resolve(workingDir, DEFAULT_CONFIG.migrationsPath),
      seedsPath: path.resolve(workingDir, DEFAULT_CONFIG.seedsPath),
    };
  }

  const configDir = path.dirname(configPath);
  const module = await import(pathToFileURL(configPath).href);
  const fullConfig: ToolkitConfig = module.default ?? module;
  const userConfig = fullConfig["kysely-toolkit"] ?? {};

  const resolved: Required<KyselyToolkitConfig> = {
    connectionString: userConfig.connectionString ?? process.env.DATABASE_URL ?? "",
    migrationsPath: path.resolve(configDir, userConfig.migrationsPath ?? DEFAULT_CONFIG.migrationsPath),
    seedsPath: path.resolve(configDir, userConfig.seedsPath ?? DEFAULT_CONFIG.seedsPath),
    migrationTemplate: userConfig.migrationTemplate ?? DEFAULT_CONFIG.migrationTemplate,
    seedTemplate: userConfig.seedTemplate ?? DEFAULT_CONFIG.seedTemplate,
  };

  return resolved;
}
