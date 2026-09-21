import type { Db } from "./db.js";

export type ChainEvent = {
  txHash: string;
  logIndex: number;
  type: string;
  payload: unknown;
};

/**
 * Apply a confirmed chain log once. Replays of the same (txHash, logIndex)
 * return applied:false and never run `apply`.
 */
export async function applyChainEvent(
  db: Db,
  event: ChainEvent,
  apply: () => Promise<void>,
): Promise<{ applied: boolean }> {
  const inserted = await db.query<{ tx_hash: string }>(
    `INSERT INTO chain_events (tx_hash, log_index, event_type, payload, applied_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tx_hash, log_index) DO NOTHING
     RETURNING tx_hash`,
    [event.txHash, event.logIndex, event.type, JSON.stringify(event.payload), Date.now()],
  );
  if (!inserted.rows.length) return { applied: false };
  await apply();
  return { applied: true };
}
