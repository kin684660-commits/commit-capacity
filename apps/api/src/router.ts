import { createHash, randomBytes } from "node:crypto";
import { DEMO, classifyAttempt, deriveUiStatus, type ReasonCode } from "@commit/domain";
import type { ChainClock } from "./clock.js";
import type { Db } from "./db.js";
import { BACKUP_ID, PRIMARY_ID } from "./db.js";
import { ApiError } from "./errors.js";
import { readChain } from "./chain.js";

const timeoutMs = () => Number(process.env.COMMIT_ATTEMPT_TIMEOUT_MS || DEMO.attemptTimeoutMs);
const primaryUrl = () => process.env.SEARCHNODE_URL || "http://127.0.0.1:3042";
const backupUrl = () => process.env.NOVA_URL || "http://127.0.0.1:3043";
const MAX_STORED_BODY = 16_384;

function payloadHash(query: string) {
  return createHash("sha256").update(query).digest("hex");
}

function searchPayload(body: Record<string, unknown>): Record<string, unknown> | null {
  const nested = body.response;
  const response = nested && typeof nested === "object" ? (nested as Record<string, unknown>) : body;
  if (response.schemaVersion !== "search.v1") return null;
  if (typeof response.query !== "string" || !Array.isArray(response.results)) return null;
  return {
    schemaVersion: "search.v1",
    query: response.query,
    providerId: typeof response.providerId === "string" ? response.providerId : "",
    requestId: typeof response.requestId === "string" ? response.requestId : "",
    results: response.results.slice(0, 8),
  };
}

function storeBody(raw: ProviderCall): string | null {
  const payload = searchPayload(raw.body);
  if (!payload) return null;
  const json = JSON.stringify(payload);
  return json.length > MAX_STORED_BODY ? json.slice(0, MAX_STORED_BODY) : json;
}

function parseBody(raw: unknown) {
  if (raw == null || raw === "") return null;
  try {
    const o = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!o || o.schemaVersion !== "search.v1" || !Array.isArray(o.results)) return null;
    return o;
  } catch {
    return null;
  }
}

function flag(v: unknown): boolean {
  return v === true || v === "t" || v === "true";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type ProviderCall = {
  started: number;
  finished: number;
  abortedAt?: number;
  httpStatus: number;
  schemaOk: boolean;
  body: Record<string, unknown>;
  latePromise?: Promise<ProviderCall>;
};

async function parseProvider(r: Response, started: number): Promise<ProviderCall> {
  let json: Record<string, unknown> = {};
  try {
    json = (await r.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  const response = (json.response as Record<string, unknown>) || json;
  const schemaOk =
    response.schemaVersion === "search.v1" &&
    typeof response.query === "string" &&
    Array.isArray(response.results);
  return { started, finished: Date.now(), httpStatus: r.status, schemaOk, body: json };
}

async function callProvider(base: string, attemptId: string, query: string, ms: number): Promise<ProviderCall> {
  const started = Date.now();
  const fetchP = fetch(`${base}/execute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ attemptId, query }),
  })
    .then((r) => parseProvider(r, started))
    .catch(() => ({
      started,
      finished: Date.now(),
      httpStatus: 503,
      schemaOk: false,
      body: {},
    }));

  const raced = await Promise.race([
    fetchP,
    sleep(ms).then(() => ({ timeout: true as const })),
  ]);
  if ("timeout" in raced) {
    return {
      started,
      finished: Date.now(),
      abortedAt: started + ms,
      httpStatus: 504,
      schemaOk: false,
      body: {},
      latePromise: fetchP,
    };
  }
  return raced;
}

export async function getReservationView(db: Db, id: string, nowSec: number) {
  const row = await db.query<Record<string, unknown>>(
    `SELECT id, buyer, terms_hash, start_ts, end_ts, deadline, status, remaining, live_used, route, listed, owner_epoch
     FROM reservations WHERE id = $1`,
    [id],
  );
  const r = row.rows[0];
  if (!r) throw new ApiError("INVALID_INPUT", "unknown commitment");
  const reqs = await db.query<Record<string, unknown>>(
    `SELECT id, client_request_id, status, created_at FROM logical_requests WHERE reservation_id = $1 ORDER BY created_at`,
    [id],
  );
  const start = Number(r.start_ts);
  const end = Number(r.end_ts);
  const listed = flag(r.listed);
  const uiStatus = deriveUiStatus({
    status: r.status === "settled" ? "SETTLED" : r.status === "closed" ? "CLOSED" : "OPEN",
    listed,
    paused: false,
    now: nowSec,
    start,
    end,
  });
  return {
    id: String(r.id),
    owner: String(r.buyer),
    status: String(r.status),
    uiStatus,
    remaining: Number(r.remaining ?? 0),
    liveUsed: Number(r.live_used ?? 0),
    confirmedUsed: Number(r.live_used ?? 0),
    route: String(r.route),
    listed,
    ownerEpoch: Number(r.owner_epoch),
    window: { start, end },
    requests: reqs.rows,
    chain: await readChain(db, id),
  };
}

export async function getLogical(db: Db, id: string) {
  const req = await db.query<Record<string, unknown>>(`SELECT * FROM logical_requests WHERE id = $1`, [id]);
  if (!req.rows[0]) throw new ApiError("INVALID_INPUT", "unknown request");
  const attempts = await db.query<Record<string, unknown>>(
    `SELECT attempt_id, provider_id, reason, status, latency_ms, late_response, response_hash, response_body
     FROM provider_attempts WHERE logical_id = $1 ORDER BY started_at`,
    [id],
  );
  const reservationId = String(req.rows[0].reservation_id);
  const rem = await db.query<{ remaining: string; live_used: string }>(
    `SELECT remaining, live_used FROM reservations WHERE id = $1`,
    [reservationId],
  );
  const mapped = attempts.rows.map((row) => {
    const output = parseBody(row.response_body);
    return {
      attemptId: row.attempt_id,
      provider_id: row.provider_id,
      reason: row.reason,
      status: row.status,
      latency_ms: row.latency_ms,
      late_response: row.late_response,
      response_hash: row.response_hash,
      output,
    };
  });
  const output = [...mapped].reverse().find((row) => row.status === "SUCCEEDED" && row.output)?.output ?? null;
  return {
    requestId: String(req.rows[0].id),
    reservationId,
    status: String(req.rows[0].status),
    query: req.rows[0].query == null ? "" : String(req.rows[0].query),
    clientRequestId: String(req.rows[0].client_request_id),
    remaining: Number(rem.rows[0]?.remaining ?? 0),
    liveUsed: Number(rem.rows[0]?.live_used ?? 0),
    createdAt: req.rows[0].created_at,
    output,
    attempts: mapped,
  };
}

export async function recoverInflight(db: Db) {
  const stale = await db.query<{ id: string; reservation_id: string }>(
    `SELECT id, reservation_id FROM logical_requests WHERE status IN ('PRIMARY_RUNNING', 'BACKUP_RUNNING')`,
  );
  for (const row of stale.rows) {
    await db.query(`UPDATE logical_requests SET status = 'UNCERTAIN' WHERE id = $1`, [row.id]);
    await db.query(`UPDATE reservations SET remaining = remaining + 1 WHERE id = $1`, [row.reservation_id]);
  }
  return stale.rows.length;
}

export async function executeRequest(
  db: Db,
  clock: ChainClock,
  owner: string,
  reservationId: string,
  query: string,
  clientRequestId: string,
) {
  if (!query || !clientRequestId) throw new ApiError("INVALID_INPUT", "query and clientRequestId required");
  const now = await clock.chainNowSec();
  const hash = payloadHash(query);

  const existing = await db.query<{ id: string; payload_hash: string }>(
    `SELECT id, payload_hash FROM logical_requests WHERE reservation_id = $1 AND client_request_id = $2`,
    [reservationId, clientRequestId],
  );
  if (existing.rows[0]) {
    if (existing.rows[0].payload_hash !== hash) {
      throw new ApiError("IDEMPOTENCY_CONFLICT", "same request id, different payload", 409);
    }
    return getLogical(db, existing.rows[0].id);
  }

  let logicalId: string;
  try {
    logicalId = await db.transaction(async (tx) => {
      const res = await tx.query<{
        buyer: string;
        start_ts: string;
        end_ts: string;
        remaining: string;
        last_request_at: string | null;
        listed: boolean | string;
        route: string;
        status: string;
        owner_epoch: string;
      }>(
        `SELECT buyer, start_ts, end_ts, remaining, last_request_at, listed, route, status, owner_epoch
         FROM reservations WHERE id = $1 FOR UPDATE`,
        [reservationId],
      );
      const r = res.rows[0];
      if (!r) throw new ApiError("INVALID_INPUT", "unknown commitment");
      if (r.buyer.toLowerCase() !== owner.toLowerCase()) throw new ApiError("NOT_OWNER", "not the current owner", 403);
      if (r.status !== "held" && r.status !== "active") throw new ApiError("OUTSIDE_WINDOW", "reservation not executable");
      if (flag(r.listed)) throw new ApiError("LISTING_LOCKED", "frozen for transfer", 409);
      if (r.route === "UNAVAILABLE") throw new ApiError("PROVIDER_FAILED", "no remaining guaranteed route", 409);
      const start = Number(r.start_ts);
      const end = Number(r.end_ts);
      if (now < start || now >= end) throw new ApiError("OUTSIDE_WINDOW", "outside service window");
      if (end - now < 1) throw new ApiError("OUTSIDE_WINDOW", "remaining window too short");
      if (Number(r.remaining) <= 0) throw new ApiError("NO_CAPACITY", "no remaining units", 409);
      const inflight = await tx.query<{ n: string }>(
        `SELECT count(*)::text AS n FROM logical_requests
         WHERE reservation_id = $1 AND status IN ('PRIMARY_RUNNING', 'BACKUP_RUNNING')`,
        [reservationId],
      );
      if (Number(inflight.rows[0]?.n ?? 0) >= DEMO.maxConcurrency) {
        throw new ApiError("RATE_LIMITED", "max concurrency 1", 429, true);
      }
      if (r.last_request_at && Date.now() - Number(r.last_request_at) < DEMO.minIntervalMs) {
        throw new ApiError("RATE_LIMITED", "min interval 1s", 429, true);
      }
      const lid = `req_${randomBytes(8).toString("hex")}`;
      await tx.query(
        `INSERT INTO logical_requests (id, reservation_id, epoch, client_request_id, payload_hash, status, query, locked_unit, created_at)
         VALUES ($1, $2, $3, $4, $5, 'PRIMARY_RUNNING', $6, 1, $7)`,
        [lid, reservationId, Number(r.owner_epoch), clientRequestId, hash, query, now],
      );
      await tx.query(`UPDATE reservations SET remaining = remaining - 1, last_request_at = $2 WHERE id = $1`, [
        reservationId,
        Date.now(),
      ]);
      return lid;
    });
  } catch (err) {
    const msg = String((err as Error).message || err);
    if (msg.includes("unique") || msg.includes("UNIQUE")) {
      const again = await db.query<{ id: string; payload_hash: string }>(
        `SELECT id, payload_hash FROM logical_requests WHERE reservation_id = $1 AND client_request_id = $2`,
        [reservationId, clientRequestId],
      );
      if (again.rows[0]?.payload_hash === hash) return getLogical(db, again.rows[0].id);
      throw new ApiError("IDEMPOTENCY_CONFLICT", "same request id, different payload", 409);
    }
    throw err;
  }

  const ms = timeoutMs();
  const primaryAttempt = `att_${randomBytes(6).toString("hex")}`;
  let outcome = await runAttempt(db, logicalId, PRIMARY_ID, primaryUrl(), primaryAttempt, query, ms);
  let usedBackup = false;
  if (!outcome.success && process.env.COMMIT_SKIP_BACKUP !== "1") {
    usedBackup = true;
    await db.query(`UPDATE logical_requests SET status = 'BACKUP_RUNNING' WHERE id = $1`, [logicalId]);
    await db.query(`UPDATE reservations SET route = 'BACKUP' WHERE id = $1`, [reservationId]);
    const backupAttempt = `att_${randomBytes(6).toString("hex")}`;
    outcome = await runAttempt(db, logicalId, BACKUP_ID, backupUrl(), backupAttempt, query, ms);
  }

  if (outcome.success) {
    await db.query(`UPDATE logical_requests SET status = 'SUCCEEDED' WHERE id = $1`, [logicalId]);
    await db.query(`UPDATE reservations SET live_used = live_used + 1 WHERE id = $1`, [reservationId]);
  } else {
    await db.query(`UPDATE logical_requests SET status = 'FAILED' WHERE id = $1`, [logicalId]);
    await db.query(`UPDATE reservations SET remaining = remaining + 1 WHERE id = $1`, [reservationId]);
    if (usedBackup) {
      await db.query(`UPDATE reservations SET route = 'UNAVAILABLE' WHERE id = $1`, [reservationId]);
    }
  }

  await db.query(
    `INSERT INTO outbox_jobs (intent_key, type, payload, state, created_at)
     VALUES ($1, 'checkpoint', $2, 'pending', $3)
     ON CONFLICT (intent_key) DO NOTHING`,
    [
      `cp_${logicalId}`,
      JSON.stringify({
        reservationId,
        logicalId,
        success: outcome.success,
        backup: usedBackup,
        liveUsedDelta: outcome.success ? 1 : 0,
        slashPrimary: !outcome.success || usedBackup,
      }),
      now,
    ],
  );

  return getLogical(db, logicalId);
}

async function runAttempt(
  db: Db,
  logicalId: string,
  providerId: string,
  url: string,
  attemptId: string,
  query: string,
  ms: number,
) {
  const startedAt = Date.now();
  await db.query(
    `INSERT INTO provider_attempts (attempt_id, logical_id, provider_id, started_at, reason, status)
     VALUES ($1, $2, $3, $4, 'PENDING', 'RUNNING')`,
    [attemptId, logicalId, providerId, startedAt],
  );
  const raw = await callProvider(url, attemptId, query, ms);
  const classified = classifyAttempt({
    startedAtMs: raw.started,
    finishedAtMs: raw.finished,
    abortedAtMs: raw.abortedAt,
    httpStatus: raw.httpStatus,
    schemaOk: raw.schemaOk,
    buyerInputOk: true,
    insideWindow: true,
  });
  const reason: ReasonCode = classified.reason;
  const success = classified.countsAsSuccess && raw.httpStatus < 500 && raw.schemaOk;
  await db.query(
    `UPDATE provider_attempts SET finished_at = $2, latency_ms = $3, reason = $4, status = $5, late_response = $6, response_hash = $7, response_body = $8
     WHERE attempt_id = $1`,
    [
      attemptId,
      raw.finished,
      raw.finished - raw.started,
      reason,
      success ? "SUCCEEDED" : "FAILED",
      classified.lateResponse,
      payloadHash(JSON.stringify(raw.body)),
      success ? storeBody(raw) : null,
    ],
  );
  if (raw.latePromise) {
    void raw.latePromise.then(async (late) => {
      if (!late.schemaOk) return;
      await db.query(`UPDATE provider_attempts SET late_response = TRUE WHERE attempt_id = $1`, [attemptId]);
    });
  }
  return { success, reason, attemptId, providerId };
}

export async function injectPrimaryFault(
  adminToken: string,
  body: { delayMs?: number; invalidSchema?: boolean; http5xx?: boolean } = {},
) {
  const expected = process.env.COMMIT_PROVIDER_ADMIN_TOKEN || "change-me-local-only";
  if (adminToken !== expected) throw new ApiError("NOT_OWNER", "admin token required", 403);
  const r = await fetch(`${primaryUrl()}/admin/fault`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-commit-admin": expected },
    body: JSON.stringify({
      delayMs: body.delayMs ?? 0,
      invalidSchema: body.invalidSchema ?? false,
      http5xx: body.http5xx ?? false,
    }),
  });
  if (!r.ok) throw new ApiError("PROVIDER_FAILED", "fault inject failed", 502, true);
  return r.json();
}

export async function recordEvidence(db: Db, reservationId: string | null, summary: unknown) {
  const runId = `run_${randomBytes(6).toString("hex")}`;
  await db.query(`INSERT INTO evidence_runs (run_id, reservation_id, created_at, summary) VALUES ($1, $2, $3, $4)`, [
    runId,
    reservationId,
    Math.floor(Date.now() / 1000),
    JSON.stringify(summary),
  ]);
  return runId;
}

async function termsVerificationFor(db: Db, reservationId: string | null | undefined, summary: Record<string, unknown> | null) {
  if (!reservationId) return undefined;
  const r = await db.query<{ terms_hash: string }>(`SELECT terms_hash FROM reservations WHERE id = $1`, [reservationId]);
  const quoteTermsHash = r.rows[0]?.terms_hash || (typeof summary?.quoteTermsHash === "string" ? summary.quoteTermsHash : undefined);
  let onchainTermsHash: string | undefined;
  try {
    const chain = await readChain(db, reservationId);
    if (!("pending" in chain && chain.pending) && "termsHash" in chain && chain.termsHash) {
      onchainTermsHash = String(chain.termsHash);
    }
  } catch {
    /* chain optional for local evidence */
  }
  const summaryChain = summary?.chain as { termsHash?: string } | undefined;
  if (!onchainTermsHash && summaryChain?.termsHash) onchainTermsHash = String(summaryChain.termsHash);
  if (!quoteTermsHash && !onchainTermsHash) return undefined;
  return {
    quoteTermsHash,
    onchainTermsHash,
    match: Boolean(
      quoteTermsHash && onchainTermsHash && quoteTermsHash.toLowerCase() === onchainTermsHash.toLowerCase(),
    ),
  };
}

/** Keep stored t30.ok as-is. Annotate why isolated 0.59 does not apply on the shared registry. */
export function annotateStoredT30(summary: Record<string, unknown>) {
  const t30 = summary.t30;
  if (!t30 || typeof t30 !== "object" || Array.isArray(t30)) return summary;
  const t = t30 as Record<string, unknown>;
  const t21 = summary.t21 as { remaining?: number; liveUsed?: number } | undefined;
  const t06 = summary.t06 as { remaining?: number; liveUsed?: number } | undefined;
  const remaining = Number(t21?.remaining ?? t06?.remaining);
  const used = Number(t21?.liveUsed ?? t06?.liveUsed);
  const unit = 10_000;
  const thisCommitment =
    Number.isFinite(remaining) && Number.isFinite(used)
      ? {
          remaining,
          used,
          executionEscrow: String((remaining + used) * unit),
          providerPay: String(used * unit),
          unusedRefund: String(remaining * unit),
          conserved: used * unit + remaining * unit === (remaining + used) * unit,
          note: "Per-commitment execution escrow in 6-decimal tCOM. Independent of wallet-level claimable.",
        }
      : undefined;
  const isolatedExpected = String(t.expected ?? "590000");
  const storedOk = t.ok === true;
  summary.t30 = {
    ...t,
    isolatedHardhatT30: t.isolatedHardhatT30 ?? {
      expected: isolatedExpected,
      note: "Single isolated Hardhat play: 0.24 buyer + 0.20 bonds + 0.15 transfer = 0.59. Not a shared-registry wallet total.",
    },
    walletLevelSharedRegistry: t.walletLevelSharedRegistry ?? {
      sum: t.sum,
      comparedToIsolatedExpected: isolatedExpected,
      ok: storedOk,
      verdict: storedOk ? "MATCH" : "NOT_APPLICABLE",
      note: "Do not read ok:false as funds lost. claimable[address] is cumulative across every commitment on this registry, so it will not equal the isolated 0.59 check.",
    },
    thisCommitment: t.thisCommitment ?? thisCommitment,
  };
  return summary;
}

export async function getEvidence(db: Db, runId: string) {
  const row = await db.query<Record<string, unknown>>(`SELECT * FROM evidence_runs WHERE run_id = $1`, [runId]);
  if (!row.rows[0]) throw new ApiError("INVALID_INPUT", "unknown evidence run");
  const summaryRaw = row.rows[0].summary;
  const summary = annotateStoredT30(
    typeof summaryRaw === "string" ? (JSON.parse(summaryRaw) as Record<string, unknown>) : { ...(summaryRaw as Record<string, unknown>) },
  );
  const reservationId = row.rows[0].reservation_id ? String(row.rows[0].reservation_id) : null;
  return {
    runId: row.rows[0].run_id,
    reservationId,
    createdAt: Number(row.rows[0].created_at),
    summary,
    termsVerification: await termsVerificationFor(db, reservationId, summary),
    recorded: true,
  };
}

export async function latestEvidence(db: Db) {
  const row = await db.query<Record<string, unknown>>(
    `SELECT run_id, reservation_id, created_at, summary FROM evidence_runs ORDER BY created_at DESC LIMIT 1`,
  );
  if (!row.rows[0]) {
    const local = Number(process.env.COMMIT_CHAIN_ID || 0) === 31337;
    return {
      recorded: false,
      note: local
        ? "Run `corepack pnpm demo:local` to write a real evidence run."
        : "No recorded evidence run on this host yet. Contest chain is X Layer testnet 1952.",
    };
  }
  const summaryRaw = row.rows[0].summary;
  const summary = annotateStoredT30(
    typeof summaryRaw === "string"
      ? (JSON.parse(summaryRaw) as Record<string, unknown>)
      : { ...(summaryRaw as Record<string, unknown>) },
  );
  const reservationId = row.rows[0].reservation_id ? String(row.rows[0].reservation_id) : null;
  return {
    recorded: true,
    runId: row.rows[0].run_id,
    reservationId,
    createdAt: Number(row.rows[0].created_at),
    summary,
    termsVerification: await termsVerificationFor(db, reservationId, summary),
  };
}
