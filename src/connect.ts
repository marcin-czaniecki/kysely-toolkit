import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";

export function createDatabase(connectionString: string, maxConnections = 10): Kysely<any> {
  return new Kysely({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString, max: maxConnections }),
    }),
  });
}
