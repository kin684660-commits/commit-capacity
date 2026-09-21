-- Idempotent chain-event log. Replaying the same (tx, logIndex) must not re-apply.
CREATE TABLE IF NOT EXISTS chain_events (
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  applied_at BIGINT NOT NULL,
  PRIMARY KEY (tx_hash, log_index)
);
