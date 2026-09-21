import { describe, expect, it, beforeEach } from "vitest";
import { openDb, type Db } from "../src/db.js";
import { processOutbox } from "../src/outbox.js";
import { applyChainEvent } from "../src/indexer.js";

describe("T28 replay", () => {
  let db: Db;

  beforeEach(async () => {
    db = await openDb();
  });

  it("does not re-apply the same chain log", async () => {
    const event = {
      txHash: "0xabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabcabca",
      logIndex: 2,
      type: "UsageCheckpoint",
      payload: { used: 1 },
    };
    let hits = 0;
    const first = await applyChainEvent(db, event, async () => {
      hits += 1;
    });
    const second = await applyChainEvent(db, event, async () => {
      hits += 1;
    });
    expect(first.applied).toBe(true);
    expect(second.applied).toBe(false);
    expect(hits).toBe(1);
    const rows = await db.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM chain_events`);
    expect(Number(rows.rows[0].n)).toBe(1);
  });

  it("processOutbox sends a claimed job once", async () => {
    await db.query(
      `INSERT INTO outbox_jobs (intent_key, type, payload, state, attempts, created_at)
       VALUES ('ckpt-once', 'checkpoint', $1, 'pending', 0, $2)`,
      [JSON.stringify({ used: 1 }), Date.now()],
    );
    let sends = 0;
    const sender = {
      sendCheckpoint: async () => {
        sends += 1;
        return "0x1111111111111111111111111111111111111111111111111111111111111111";
      },
    };
    const a = await processOutbox(db, sender);
    const b = await processOutbox(db, sender);
    expect(a[0].state).toBe("submitted");
    expect(b.length).toBe(0);
    expect(sends).toBe(1);
  });
});
