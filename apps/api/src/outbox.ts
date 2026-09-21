import type { Db } from "./db.js";

export type ChainSender = {
  sendCheckpoint: (payload: Record<string, unknown>) => Promise<string>;
};

export async function pendingOutbox(db: Db) {
  const rows = await db.query<Record<string, unknown>>(
    `SELECT intent_key, type, payload, state, attempts FROM outbox_jobs WHERE state = 'pending' ORDER BY created_at`,
  );
  return rows.rows.map((r) => ({
    intentKey: String(r.intent_key),
    type: String(r.type),
    payload: JSON.parse(String(r.payload)),
    state: String(r.state),
    attempts: Number(r.attempts),
  }));
}

export async function processOutbox(db: Db, chain?: ChainSender) {
  const jobs = await pendingOutbox(db);
  const results: { intentKey: string; state: string; txHash?: string; error?: string }[] = [];
  for (const job of jobs) {
    if (!chain) {
      results.push({ intentKey: job.intentKey, state: "pending" });
      continue;
    }
    const claimed = await db.query<{ intent_key: string }>(
      `UPDATE outbox_jobs SET state = 'sending', attempts = attempts + 1
       WHERE intent_key = $1 AND state = 'pending'
       RETURNING intent_key`,
      [job.intentKey],
    );
    if (!claimed.rows.length) {
      results.push({ intentKey: job.intentKey, state: "skipped" });
      continue;
    }
    try {
      const txHash = await chain.sendCheckpoint(job.payload);
      await db.query(`UPDATE outbox_jobs SET state = 'submitted' WHERE intent_key = $1 AND state = 'sending'`, [
        job.intentKey,
      ]);
      results.push({ intentKey: job.intentKey, state: "submitted", txHash });
    } catch (err) {
      await db.query(`UPDATE outbox_jobs SET state = 'pending' WHERE intent_key = $1 AND state = 'sending'`, [
        job.intentKey,
      ]);
      results.push({ intentKey: job.intentKey, state: "pending", error: (err as Error).message });
    }
  }
  return results;
}
