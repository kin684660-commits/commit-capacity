import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export type Db = PGlite;

export const PRIMARY_ID = "search-node";
export const BACKUP_ID = "nova";
export const PRIMARY_WALLET = "0x1111111111111111111111111111111111111111";
export const BACKUP_WALLET = "0x2222222222222222222222222222222222222222";

export async function openDb(dataDir?: string): Promise<Db> {
  const db = dataDir ? new PGlite(dataDir) : new PGlite();
  await migrate(db);
  await seed(db);
  return db;
}

export async function migrate(db: Db) {
  for (const name of ["001_init.sql", "002_execution.sql", "003_chain.sql", "004_chain_events.sql", "005_response_body.sql"]) {
    const sql = fs.readFileSync(path.join(root, "db/migrations", name), "utf8");
    await db.exec(sql);
  }
}

export async function seed(db: Db) {
  await db.query(
    `INSERT INTO providers (id, wallet, pool_id, role, schema_version, health)
     VALUES ($1, $2, 'primary-pool', 'primary', 'search.v1', 'up')
     ON CONFLICT (id) DO NOTHING`,
    [PRIMARY_ID, PRIMARY_WALLET],
  );
  await db.query(
    `INSERT INTO providers (id, wallet, pool_id, role, schema_version, health)
     VALUES ($1, $2, 'backup-pool', 'backup', 'search.v1', 'up')
     ON CONFLICT (id) DO NOTHING`,
    [BACKUP_ID, BACKUP_WALLET],
  );
}
