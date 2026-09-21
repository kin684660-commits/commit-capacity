import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDb, type Db } from "../src/db.js";
import { applyChainEvent } from "../src/indexer.js";

describe("T34 backup restore", () => {
  const dirs: string[] = [];
  const dbs: Db[] = [];

  afterEach(async () => {
    for (const db of dbs.splice(0)) {
      await db.close();
    }
    for (const dir of dirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("reopens a copied PGlite directory with the same ledger rows", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "commit-pg-"));
    dirs.push(dir);
    const db = await openDb(dir);
    dbs.push(db);
    await applyChainEvent(
      db,
      {
        txHash: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        logIndex: 0,
        type: "Created",
        payload: { id: 1 },
      },
      async () => {},
    );
    await db.close();
    dbs.pop();

    const copy = `${dir}-copy`;
    fs.cpSync(dir, copy, { recursive: true });
    dirs.push(copy);
    const restored = await openDb(copy);
    dbs.push(restored);
    const rows = await restored.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM chain_events`);
    expect(Number(rows.rows[0].n)).toBe(1);
  });
});
