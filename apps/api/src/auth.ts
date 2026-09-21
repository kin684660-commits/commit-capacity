import { randomBytes } from "node:crypto";
import { getAddress, verifyMessage } from "viem";
import type { Db } from "./db.js";
import { ApiError } from "./errors.js";

const SESSION_TTL = 60 * 60;
const NONCE_TTL = 10 * 60;

export function normalizeWallet(value: string): `0x${string}` {
  try {
    return getAddress(value);
  } catch {
    throw new ApiError("INVALID_INPUT", "invalid wallet");
  }
}

export async function issueNonce(db: Db, addressRaw: string, nowSec: number) {
  const address = normalizeWallet(addressRaw);
  const nonce = randomBytes(8).toString("hex");
  await db.query(`INSERT INTO auth_nonces (nonce, address, expires_at) VALUES ($1, $2, $3)`, [
    nonce,
    address,
    nowSec + NONCE_TTL,
  ]);
  return { nonce, address, expiresAt: nowSec + NONCE_TTL, chainId: 1952 };
}

export function siweMessage(opts: {
  domain: string;
  address: string;
  uri: string;
  nonce: string;
  chainId: number;
  issuedAt: string;
  expirationTime: string;
}) {
  return `${opts.domain} wants you to sign in with your Ethereum account:\n${opts.address}\n\nCommit reservation login.\n\nURI: ${opts.uri}\nVersion: 1\nChain ID: ${opts.chainId}\nNonce: ${opts.nonce}\nIssued At: ${opts.issuedAt}\nExpiration Time: ${opts.expirationTime}`;
}

export async function verifyLogin(
  db: Db,
  nowSec: number,
  body: { message?: string; signature?: string },
) {
  const message = String(body.message || "");
  const signature = String(body.signature || "") as `0x${string}`;
  if (!message || !signature) throw new ApiError("INVALID_INPUT", "message and signature required");
  const nonce = /Nonce: ([a-f0-9]+)/.exec(message)?.[1];
  const addressLine = message.split("\n")[1]?.trim();
  if (!nonce || !addressLine) throw new ApiError("INVALID_INPUT", "SIWE message missing nonce or address");
  const address = normalizeWallet(addressLine);
  const row = await db.query<{ address: string; expires_at: string }>(
    `SELECT address, expires_at FROM auth_nonces WHERE nonce = $1`,
    [nonce],
  );
  const found = row.rows[0];
  if (!found) throw new ApiError("INVALID_INPUT", "unknown nonce");
  if (Number(found.expires_at) <= nowSec) throw new ApiError("QUOTE_EXPIRED", "nonce expired");
  if (found.address.toLowerCase() !== address.toLowerCase()) {
    throw new ApiError("NOT_OWNER", "nonce wallet mismatch", 401);
  }
  await db.query(`DELETE FROM auth_nonces WHERE nonce = $1`, [nonce]);

  const ok = await verifyMessage({ address, message, signature });
  if (!ok) throw new ApiError("NOT_OWNER", "bad signature", 401);

  const sessionId = randomBytes(16).toString("hex");
  await db.query(`INSERT INTO sessions (id, wallet, expires_at, revoked) VALUES ($1, $2, $3, FALSE)`, [
    sessionId,
    address,
    nowSec + SESSION_TTL,
  ]);
  return { sessionId, wallet: address, expiresAt: nowSec + SESSION_TTL };
}

export async function issueDevSession(db: Db, addressRaw: string, nowSec: number) {
  if (process.env.COMMIT_ALLOW_DEV_SESSION !== "1") {
    throw new ApiError("NOT_OWNER", "dev session disabled", 403);
  }
  const address = normalizeWallet(addressRaw);
  const sessionId = randomBytes(16).toString("hex");
  await db.query(`INSERT INTO sessions (id, wallet, expires_at, revoked) VALUES ($1, $2, $3, FALSE)`, [
    sessionId,
    address,
    nowSec + SESSION_TTL,
  ]);
  return { sessionId, wallet: address, expiresAt: nowSec + SESSION_TTL };
}

export async function sessionWallet(db: Db, sessionId: string | undefined, nowSec: number): Promise<`0x${string}`> {
  if (!sessionId) throw new ApiError("NOT_OWNER", "login required", 401);
  const row = await db.query<{ wallet: string; expires_at: string; revoked: boolean }>(
    `SELECT wallet, expires_at, revoked FROM sessions WHERE id = $1`,
    [sessionId],
  );
  const s = row.rows[0];
  if (!s || s.revoked) throw new ApiError("NOT_OWNER", "session invalid", 401);
  if (Number(s.expires_at) <= nowSec) throw new ApiError("NOT_OWNER", "session expired", 401);
  return normalizeWallet(s.wallet);
}
