-- Links occupancy rows to Hardhat (or later testnet) commitments.
CREATE TABLE IF NOT EXISTS chain_links (
  reservation_id TEXT PRIMARY KEY REFERENCES reservations(id),
  commitment_id TEXT NOT NULL,
  create_tx TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  success_primary INTEGER NOT NULL DEFAULT 0,
  success_backup INTEGER NOT NULL DEFAULT 0,
  breach_primary INTEGER NOT NULL DEFAULT 0,
  breach_backup INTEGER NOT NULL DEFAULT 0
);
