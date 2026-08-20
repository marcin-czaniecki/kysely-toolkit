#!/usr/bin/env node
import "dotenv/config";
import { initConfig, loadConfig } from "./config.js";
import { createDatabase } from "./connect.js";
import { makeMigration, migrateDown, migrateRedo, migrateReset, migrateStatus, migrateToLatest, migrateUp } from "./migrate.js";
import { makeSeed, resetSeeds, runSeeds } from "./seed.js";

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  if (command === "init") {
    const configPath = await initConfig();
    console.log(`Created ${configPath}`);
    console.log("Created ./migrations and ./seeds directories");
    return;
  }

  const config = await loadConfig();

  if (command === "make" || command === "seed:make") {
    if (!arg) {
      console.error(`Usage: kysely-toolkit ${command} <name>`);
      process.exit(1);
    }

    if (command === "make") {
      await makeMigration(arg, config);
    } else {
      await makeSeed(arg, config);
    }

    return;
  }

  if (!config.connectionString) {
    console.error("DATABASE_URL is not set. Provide it via environment variable or toolkit.config.ts");
    process.exit(1);
  }

  const db = createDatabase(config.connectionString);

  try {
    switch (command) {
      case "up":
        await migrateUp(db, { migrationFolder: config.migrationsPath });
        break;

      case "down":
        await migrateDown(db, { migrationFolder: config.migrationsPath });
        break;

      case "latest":
        await migrateToLatest(db, { migrationFolder: config.migrationsPath });
        break;

      case "status":
        await migrateStatus(db, { migrationFolder: config.migrationsPath });
        break;

      case "reset":
        await migrateReset(db, { migrationFolder: config.migrationsPath });
        break;

      case "redo":
        await migrateRedo(db, { migrationFolder: config.migrationsPath });
        break;

      case "seed":
        await runSeeds(db, { seedFolder: config.seedsPath });
        break;

      case "seed:reset":
        await resetSeeds(db, { seedFolder: config.seedsPath });
        break;

      default:
        console.error(
          "Unknown command. Available commands:\n" +
          "  init        Create toolkit.config.ts and folders\n" +
          "  up          Apply next migration\n" +
          "  down        Rollback last migration\n" +
          "  latest      Apply all pending migrations\n" +
          "  status      Show migration status\n" +
          "  reset       Rollback all migrations\n" +
          "  redo        Rollback and re-apply last migration\n" +
          "  make        Create a new migration\n" +
          "  seed        Run pending seeds\n" +
          "  seed:make   Create a new seed\n" +
          "  seed:reset  Reset and re-run all seeds"
        );
        process.exit(1);
    }
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
