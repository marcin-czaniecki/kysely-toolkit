import { promises as fs } from "node:fs";
import path from "node:path";
import { loadUserModule } from "./loadUserModule.js";

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

const CONFIG_FILE_NAMES = [
  "toolkit.config.mts",
  "toolkit.config.ts",
  "toolkit.config.mjs",
  "toolkit.config.js",
] as const;

const DEFAULT_CONFIG_FILE_NAME = "toolkit.config.mts";

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

  for (const fileName of CONFIG_FILE_NAMES) {
    const existingPath = path.join(workingDir, fileName);

    try {
      await fs.access(existingPath);
      throw new Error(`${fileName} already exists at ${existingPath}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  const configPath = path.join(workingDir, DEFAULT_CONFIG_FILE_NAME);
  await fs.writeFile(configPath, CONFIG_TEMPLATE, "utf8");
  await fs.mkdir(path.join(workingDir, "migrations"), { recursive: true });
  await fs.mkdir(path.join(workingDir, "seeds"), { recursive: true });

  return configPath;
}

async function findConfigFile(cwd: string): Promise<string | null> {
  let current = cwd;

  while (true) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const candidate = path.join(current, fileName);

      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // try next name / directory
      }
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
  const module = await loadUserModule(configPath);
  const fullConfig: ToolkitConfig = (module.default as ToolkitConfig | undefined) ?? (module as ToolkitConfig);
  const userConfig = fullConfig["kysely-toolkit"] ?? {};

  return {
    connectionString: userConfig.connectionString ?? process.env.DATABASE_URL ?? "",
    migrationsPath: path.resolve(configDir, userConfig.migrationsPath ?? DEFAULT_CONFIG.migrationsPath),
    seedsPath: path.resolve(configDir, userConfig.seedsPath ?? DEFAULT_CONFIG.seedsPath),
    migrationTemplate: userConfig.migrationTemplate ?? DEFAULT_CONFIG.migrationTemplate,
    seedTemplate: userConfig.seedTemplate ?? DEFAULT_CONFIG.seedTemplate,
  };
}
