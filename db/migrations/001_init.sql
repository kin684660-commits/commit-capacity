-- v0.1 occupancy ledger. Local runtime is PGlite (Postgres dialect).

CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL UNIQUE,
  pool_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  health TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS occupancy_lock (
  id INTEGER PRIMARY KEY
);
INSERT INTO occupancy_lock (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  request_hash TEXT NOT NULL,
  terms_json TEXT NOT NULL,
  terms_hash TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  source_trace_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  quote_id TEXT NOT NULL REFERENCES quotes(id),
  buyer TEXT NOT NULL,
  terms_hash TEXT NOT NULL,
  start_ts BIGINT NOT NULL,
  end_ts BIGINT NOT NULL,
  deadline BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  remaining INTEGER,
  live_used INTEGER NOT NULL DEFAULT 0,
  route TEXT NOT NULL DEFAULT 'PRIMARY',
  last_request_at BIGINT,
  listed BOOLEAN NOT NULL DEFAULT FALSE,
  owner_epoch INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS provider_windows (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL REFERENCES providers(id),
  start_ts BIGINT NOT NULL,
  end_ts BIGINT NOT NULL,
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  status TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS provider_windows_lookup
  ON provider_windows (provider_id, status);

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  wallet TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);
