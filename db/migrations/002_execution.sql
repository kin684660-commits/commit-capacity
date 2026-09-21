CREATE TABLE IF NOT EXISTS logical_requests (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  epoch INTEGER NOT NULL DEFAULT 1,
  client_request_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL,
  query TEXT NOT NULL,
  locked_unit INTEGER NOT NULL DEFAULT 1,
  created_at BIGINT NOT NULL,
  UNIQUE (reservation_id, epoch, client_request_id)
);

CREATE TABLE IF NOT EXISTS provider_attempts (
  attempt_id TEXT PRIMARY KEY,
  logical_id TEXT NOT NULL REFERENCES logical_requests(id),
  provider_id TEXT NOT NULL,
  started_at BIGINT NOT NULL,
  finished_at BIGINT,
  latency_ms INTEGER,
  reason TEXT,
  status TEXT NOT NULL,
  response_hash TEXT,
  late_response BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS outbox_jobs (
  intent_key TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  state TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  buyer TEXT NOT NULL,
  price TEXT NOT NULL,
  expiry BIGINT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS evidence_runs (
  run_id TEXT PRIMARY KEY,
  reservation_id TEXT,
  created_at BIGINT NOT NULL,
  summary TEXT NOT NULL
);
