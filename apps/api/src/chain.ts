import fs from "node:fs";
import path from "node:path";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
  stringToHex,
  type Hex,
} from "viem";
import { mnemonicToAccount, privateKeyToAccount } from "viem/accounts";
import { hardhat, xLayerTestnet } from "viem/chains";
import { DEMO, termsHash, type Terms } from "@commit/domain";
import type { Db } from "./db.js";
import { ApiError } from "./errors.js";
import { applyChainEvent } from "./indexer.js";

const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";

const CREATE_TYPES = {
  CreateCommitment: [
    { name: "buyer", type: "address" },
    { name: "reservationId", type: "uint256" },
    { name: "termsHash", type: "bytes32" },
    { name: "primary", type: "address" },
    { name: "backup", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
} as const;

const CP_TYPES = {
  Checkpoint: [
    { name: "commitmentId", type: "uint256" },
    { name: "ownerEpoch", type: "uint64" },
    { name: "sequence", type: "uint64" },
    { name: "successPrimary", type: "uint256" },
    { name: "successBackup", type: "uint256" },
    { name: "breachPrimary", type: "uint256" },
    { name: "breachBackup", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "purpose", type: "uint8" },
    { name: "deadline", type: "uint256" },
    { name: "listingPrice", type: "uint256" },
    { name: "designatedBuyer", type: "address" },
    { name: "listingExpiry", type: "uint256" },
  ],
} as const;

const REGISTRY_ABI = [
  {
    type: "function",
    name: "createCommitment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "reservationId", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "primary", type: "address" },
      { name: "backup", type: "address" },
      {
        name: "terms",
        type: "tuple",
        components: [
          { name: "schemaVersion", type: "string" },
          { name: "serviceClass", type: "string" },
          { name: "quantity", type: "uint256" },
          { name: "start", type: "uint64" },
          { name: "end", type: "uint64" },
          { name: "maxConcurrency", type: "uint32" },
          { name: "minIntervalMs", type: "uint32" },
          { name: "attemptTimeoutMs", type: "uint32" },
          { name: "maxAttempts", type: "uint32" },
          { name: "primaryName", type: "string" },
          { name: "backupName", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "asset", type: "address" },
          { name: "unitPrice", type: "uint256" },
          { name: "primaryReservationFee", type: "uint256" },
          { name: "backupReservationFee", type: "uint256" },
          { name: "bondPerProvider", type: "uint256" },
          { name: "penaltyPerAttempt", type: "uint256" },
          { name: "termsVersion", type: "string" },
        ],
      },
      {
        name: "sigs",
        type: "tuple",
        components: [
          { name: "buyer", type: "bytes" },
          { name: "primary", type: "bytes" },
          { name: "backup", type: "bytes" },
          { name: "verifier", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "submitCheckpoint",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "cp",
        type: "tuple",
        components: [
          { name: "commitmentId", type: "uint256" },
          { name: "ownerEpoch", type: "uint64" },
          { name: "sequence", type: "uint64" },
          { name: "successPrimary", type: "uint256" },
          { name: "successBackup", type: "uint256" },
          { name: "breachPrimary", type: "uint256" },
          { name: "breachBackup", type: "uint256" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "purpose", type: "uint8" },
          { name: "deadline", type: "uint256" },
          { name: "listingPrice", type: "uint256" },
          { name: "designatedBuyer", type: "address" },
          { name: "listingExpiry", type: "uint256" },
        ],
      },
      { name: "verifierSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "checkpointAndList",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "cp",
        type: "tuple",
        components: [
          { name: "commitmentId", type: "uint256" },
          { name: "ownerEpoch", type: "uint64" },
          { name: "sequence", type: "uint64" },
          { name: "successPrimary", type: "uint256" },
          { name: "successBackup", type: "uint256" },
          { name: "breachPrimary", type: "uint256" },
          { name: "breachBackup", type: "uint256" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "purpose", type: "uint8" },
          { name: "deadline", type: "uint256" },
          { name: "listingPrice", type: "uint256" },
          { name: "designatedBuyer", type: "address" },
          { name: "listingExpiry", type: "uint256" },
        ],
      },
      { name: "verifierSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "buyListing",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "closeWithCheckpoint",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "cp",
        type: "tuple",
        components: [
          { name: "commitmentId", type: "uint256" },
          { name: "ownerEpoch", type: "uint64" },
          { name: "sequence", type: "uint64" },
          { name: "successPrimary", type: "uint256" },
          { name: "successBackup", type: "uint256" },
          { name: "breachPrimary", type: "uint256" },
          { name: "breachBackup", type: "uint256" },
          { name: "evidenceHash", type: "bytes32" },
          { name: "purpose", type: "uint8" },
          { name: "deadline", type: "uint256" },
          { name: "listingPrice", type: "uint256" },
          { name: "designatedBuyer", type: "address" },
          { name: "listingExpiry", type: "uint256" },
        ],
      },
      { name: "verifierSig", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "settle",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "freeBond",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "commitments",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "ownerEpoch", type: "uint64" },
      { name: "primary", type: "address" },
      { name: "backup", type: "address" },
      { name: "start", type: "uint64" },
      { name: "end", type: "uint64" },
      { name: "totalUnits", type: "uint256" },
      { name: "unitPrice", type: "uint256" },
      { name: "penaltyPerAttempt", type: "uint256" },
      { name: "successPrimary", type: "uint256" },
      { name: "successBackup", type: "uint256" },
      { name: "breachPrimary", type: "uint256" },
      { name: "breachBackup", type: "uint256" },
      { name: "lockedBondP", type: "uint256" },
      { name: "lockedBondB", type: "uint256" },
      { name: "escrow", type: "uint256" },
      { name: "termsHash", type: "bytes32" },
      { name: "sequence", type: "uint64" },
      { name: "status", type: "uint8" },
      { name: "listed", type: "bool" },
      { name: "finalReady", type: "bool" },
      { name: "listPrice", type: "uint256" },
      { name: "designatedBuyer", type: "address" },
      { name: "listingExpiry", type: "uint64" },
      { name: "graceSeconds", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "claimable",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Created",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "termsHash", type: "bytes32", indexed: false },
      { name: "escrow", type: "uint256", indexed: false },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function chainEnabled() {
  return Boolean(process.env.COMMIT_RPC_URL && process.env.COMMIT_REGISTRY && process.env.COMMIT_TOKEN);
}

function rpc() {
  return process.env.COMMIT_RPC_URL || "http://127.0.0.1:8545";
}

function registryAddr() {
  return process.env.COMMIT_REGISTRY as `0x${string}`;
}

function tokenAddr() {
  return process.env.COMMIT_TOKEN as `0x${string}`;
}

function configuredChainId() {
  const id = Number(process.env.COMMIT_CHAIN_ID || DEMO.chainId);
  if (id === 196) {
    throw new ApiError("CHAIN_UNAVAILABLE", "mainnet 196 disabled", 503, true);
  }
  return id;
}

function viemChain() {
  const id = configuredChainId();
  if (id === 31337) return hardhat;
  if (id === 1952) {
    return { ...xLayerTestnet, rpcUrls: { default: { http: [rpc()] as const } } };
  }
  throw new ApiError("CHAIN_UNAVAILABLE", `unsupported chainId ${id}`, 503, true);
}

function loadXlayerRoleWallets(): Array<{ address?: string; privateKey?: string }> {
  const dest = process.env.COMMIT_XLAYER_WALLETS || path.resolve(process.cwd(), ".local/xlayer-wallets.json");
  if (!fs.existsSync(dest)) return [];
  const w = JSON.parse(fs.readFileSync(dest, "utf8")) as Record<string, { address?: string; privateKey?: string }>;
  return [w.deployer, w.seller, w.buyer, w.primary, w.backup, w.verifier].filter(Boolean);
}

function accountFor(address: string) {
  const id = configuredChainId();
  if (id === 1952) {
    if (process.env.COMMIT_ALLOW_XLAYER !== "1") {
      throw new ApiError("CHAIN_UNAVAILABLE", "xlayer keys disabled", 503, true);
    }
    for (const w of loadXlayerRoleWallets()) {
      if (w.address && w.privateKey && w.address.toLowerCase() === address.toLowerCase()) {
        const pk = (w.privateKey.startsWith("0x") ? w.privateKey : `0x${w.privateKey}`) as Hex;
        return privateKeyToAccount(pk);
      }
    }
    throw new ApiError("NOT_OWNER", `no testnet key for ${address}`, 403);
  }
  if (process.env.COMMIT_ALLOW_HARDHAT_KEYS !== "1") {
    throw new ApiError("CHAIN_UNAVAILABLE", "hardhat keys disabled", 503, true);
  }
  for (let i = 0; i < 10; i++) {
    const account = mnemonicToAccount(HARDHAT_MNEMONIC, { addressIndex: i });
    if (account.address.toLowerCase() === address.toLowerCase()) return account;
  }
  throw new ApiError("NOT_OWNER", `no local key for ${address}`, 403);
}

function publicClient() {
  return createPublicClient({ chain: viemChain(), transport: http(rpc()) });
}

function wallet(address: string) {
  const account = accountFor(address);
  return createWalletClient({ account, chain: viemChain(), transport: http(rpc()) });
}

function domain(chainId: number, verifyingContract: `0x${string}`) {
  return { name: "CommitProtocol", version: "1", chainId, verifyingContract };
}

export function reservationUint(id: string): bigint {
  return BigInt(keccak256(stringToHex(id)));
}

function termsFromRow(terms: Record<string, string>, asset: `0x${string}`, chainId: bigint): Terms {
  return {
    schemaVersion: String(terms.schemaVersion),
    serviceClass: String(terms.serviceClass),
    quantity: BigInt(terms.quantity),
    start: BigInt(terms.start),
    end: BigInt(terms.end),
    maxConcurrency: BigInt(terms.maxConcurrency),
    minIntervalMs: BigInt(terms.minIntervalMs),
    attemptTimeoutMs: BigInt(terms.attemptTimeoutMs),
    maxAttempts: BigInt(terms.maxAttempts),
    primaryName: String(terms.primaryName),
    backupName: String(terms.backupName),
    chainId,
    asset,
    unitPrice: BigInt(terms.unitPrice),
    primaryReservationFee: BigInt(terms.primaryReservationFee),
    backupReservationFee: BigInt(terms.backupReservationFee),
    bondPerProvider: BigInt(terms.bondPerProvider),
    penaltyPerAttempt: BigInt(terms.penaltyPerAttempt),
    termsVersion: String(terms.termsVersion),
  };
}

function termsTuple(terms: Terms) {
  return {
    schemaVersion: terms.schemaVersion,
    serviceClass: terms.serviceClass,
    quantity: terms.quantity,
    start: terms.start,
    end: terms.end,
    maxConcurrency: Number(terms.maxConcurrency),
    minIntervalMs: Number(terms.minIntervalMs),
    attemptTimeoutMs: Number(terms.attemptTimeoutMs),
    maxAttempts: Number(terms.maxAttempts),
    primaryName: terms.primaryName,
    backupName: terms.backupName,
    chainId: terms.chainId,
    asset: terms.asset,
    unitPrice: terms.unitPrice,
    primaryReservationFee: terms.primaryReservationFee,
    backupReservationFee: terms.backupReservationFee,
    bondPerProvider: terms.bondPerProvider,
    penaltyPerAttempt: terms.penaltyPerAttempt,
    termsVersion: terms.termsVersion,
  };
}

function chainFail(err: unknown): never {
  const e = err as { shortMessage?: string; message?: string };
  throw new ApiError("CHAIN_UNAVAILABLE", e.shortMessage || e.message || "chain call failed", 502, true);
}

function errText(err: unknown) {
  const e = err as { shortMessage?: string; message?: string };
  return `${e.shortMessage || ""} ${e.message || ""} ${String(err)}`;
}

function alreadySettled(err: unknown) {
  return /AlreadySettled|0x560ff900/.test(errText(err));
}

async function loadTerms(db: Db, reservationId: string) {
  const row = await db.query<{ terms_json: string; buyer: string; owner_epoch: string; terms_hash: string }>(
    `SELECT q.terms_json, r.buyer, r.owner_epoch, r.terms_hash
     FROM reservations r JOIN quotes q ON q.id = r.quote_id WHERE r.id = $1`,
    [reservationId],
  );
  if (!row.rows[0]) throw new ApiError("INVALID_INPUT", "unknown commitment");
  return {
    terms: JSON.parse(row.rows[0].terms_json) as Record<string, string>,
    buyer: row.rows[0].buyer,
    ownerEpoch: Number(row.rows[0].owner_epoch),
    termsHash: row.rows[0].terms_hash as Hex,
  };
}

export async function warp(seconds: number) {
  if (!chainEnabled()) throw new ApiError("CHAIN_UNAVAILABLE", "no local chain", 503, true);
  const r = await fetch(rpc(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "evm_increaseTime", params: [seconds] }),
  });
  await r.json();
  await fetch(rpc(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "evm_mine", params: [] }),
  });
  return publicClient().getBlock({ blockTag: "latest" });
}

export async function createOnchain(db: Db, owner: string, reservationId: string) {
  if (!chainEnabled()) throw new ApiError("CHAIN_UNAVAILABLE", "no local chain", 503, true);
  const existing = await db.query<{ commitment_id: string }>(
    `SELECT commitment_id FROM chain_links WHERE reservation_id = $1`,
    [reservationId],
  );
  if (existing.rows[0]) {
    return { commitmentId: existing.rows[0].commitment_id, already: true };
  }
  const loaded = await loadTerms(db, reservationId);
  if (loaded.buyer.toLowerCase() !== owner.toLowerCase()) throw new ApiError("NOT_OWNER", "not the current owner", 403);

  const client = publicClient();
  const chainId = Number(await client.getChainId());
  const primary = process.env.COMMIT_PRIMARY as `0x${string}`;
  const backup = process.env.COMMIT_BACKUP as `0x${string}`;
  const verifier = process.env.COMMIT_VERIFIER as `0x${string}`;
  if (!primary || !backup || !verifier) throw new ApiError("CHAIN_UNAVAILABLE", "provider addresses missing", 503, true);

  const typed = termsFromRow(loaded.terms, tokenAddr(), BigInt(chainId));
  const tuple = termsTuple(typed);
  const hashed = termsHash(typed);
  const now = Number((await client.getBlock({ blockTag: "latest" })).timestamp);
  const deadline = BigInt(now + 120);
  const nonce = (await client.readContract({
    address: registryAddr(),
    abi: REGISTRY_ABI,
    functionName: "nonces",
    args: [loaded.buyer as `0x${string}`],
  })) as bigint;

  const value = {
    buyer: loaded.buyer as `0x${string}`,
    reservationId: reservationUint(reservationId),
    termsHash: hashed,
    primary,
    backup,
    nonce,
    deadline,
  };
  const d = domain(chainId, registryAddr());
  const buyerAcct = accountFor(loaded.buyer);
  const sigs = {
    buyer: await buyerAcct.signTypedData({ domain: d, types: CREATE_TYPES, primaryType: "CreateCommitment", message: value }),
    primary: await accountFor(primary).signTypedData({
      domain: d,
      types: CREATE_TYPES,
      primaryType: "CreateCommitment",
      message: value,
    }),
    backup: await accountFor(backup).signTypedData({
      domain: d,
      types: CREATE_TYPES,
      primaryType: "CreateCommitment",
      message: value,
    }),
    verifier: await accountFor(verifier).signTypedData({
      domain: d,
      types: CREATE_TYPES,
      primaryType: "CreateCommitment",
      message: value,
    }),
  };

  const w = wallet(loaded.buyer);
  const buyerTotal = DEMO.unitPrice * BigInt(tuple.quantity) + DEMO.primaryReservationFee + DEMO.backupReservationFee;
  let approveHash: Hex;
  let hash: Hex;
  try {
    approveHash = await w.writeContract({
      address: tokenAddr(),
      abi: ERC20_ABI,
      functionName: "approve",
      args: [registryAddr(), buyerTotal],
    });
    await client.waitForTransactionReceipt({ hash: approveHash });
    hash = await w.writeContract({
      address: registryAddr(),
      abi: REGISTRY_ABI,
      functionName: "createCommitment",
      args: [value.reservationId, nonce, deadline, primary, backup, tuple, sigs],
    });
  } catch (err) {
    chainFail(err);
  }
  const receipt = await client.waitForTransactionReceipt({ hash });
  let commitmentId = "";
  let createdLogIndex = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = decodeEventLog({ abi: REGISTRY_ABI, data: log.data, topics: log.topics });
      if (parsed.eventName === "Created") {
        commitmentId = (parsed.args.id as bigint).toString();
        createdLogIndex = Number(log.logIndex ?? 0);
      }
    } catch {
      /* other logs */
    }
  }
  if (!commitmentId) throw new ApiError("COMMIT_BUG", "create emitted no id", 500);
  await applyChainEvent(
    db,
    { txHash: hash, logIndex: createdLogIndex, type: "Created", payload: { commitmentId, reservationId } },
    async () => {
      await db.query(
        `INSERT INTO chain_links (reservation_id, commitment_id, create_tx, sequence) VALUES ($1, $2, $3, 0)
         ON CONFLICT (reservation_id) DO NOTHING`,
        [reservationId, commitmentId, hash],
      );
    },
  );
  return { commitmentId, txHash: hash, already: false };
}

async function attemptCounts(db: Db, reservationId: string) {
  const rows = await db.query<{ provider_id: string; reason: string; status: string }>(
    `SELECT a.provider_id, a.reason, a.status
     FROM provider_attempts a
     JOIN logical_requests l ON l.id = a.logical_id
     WHERE l.reservation_id = $1`,
    [reservationId],
  );
  let successPrimary = 0;
  let successBackup = 0;
  let breachPrimary = 0;
  let breachBackup = 0;
  for (const row of rows.rows) {
    const primary = row.provider_id === "search-node";
    if (row.status === "SUCCEEDED" && row.reason === "OK") {
      if (primary) successPrimary += 1;
      else successBackup += 1;
    } else if (row.reason === "TIMEOUT" || row.reason === "HTTP_5XX" || row.reason === "INVALID_SCHEMA") {
      if (primary) breachPrimary += 1;
      else breachBackup += 1;
    }
  }
  return { successPrimary, successBackup, breachPrimary, breachBackup };
}

async function signAndSubmitCheckpoint(
  db: Db,
  reservationId: string,
  purpose: number,
  opts: { listingPrice?: bigint; designatedBuyer?: `0x${string}`; listingExpiry?: bigint; caller?: string } = {},
) {
  if (!chainEnabled()) return { skipped: true as const };
  const link = await db.query<{ commitment_id: string; sequence: string }>(
    `SELECT commitment_id, sequence FROM chain_links WHERE reservation_id = $1`,
    [reservationId],
  );
  if (!link.rows[0]) return { skipped: true as const };
  const counts = await attemptCounts(db, reservationId);
  const { ownerEpoch } = await loadTerms(db, reservationId);
  const client = publicClient();
  const chainId = Number(await client.getChainId());
  const now = Number((await client.getBlock({ blockTag: "latest" })).timestamp);
  const nextSeq = Number(link.rows[0].sequence) + 1;
  const cp = {
    commitmentId: BigInt(link.rows[0].commitment_id),
    ownerEpoch: BigInt(ownerEpoch),
    sequence: BigInt(nextSeq),
    successPrimary: BigInt(counts.successPrimary),
    successBackup: BigInt(counts.successBackup),
    breachPrimary: BigInt(counts.breachPrimary),
    breachBackup: BigInt(counts.breachBackup),
    evidenceHash: "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex,
    purpose,
    deadline: BigInt(now + 300),
    listingPrice: opts.listingPrice ?? 0n,
    designatedBuyer: (opts.designatedBuyer ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
    listingExpiry: opts.listingExpiry ?? 0n,
  };
  const verifier = process.env.COMMIT_VERIFIER as `0x${string}`;
  const sig = await accountFor(verifier).signTypedData({
    domain: domain(chainId, registryAddr()),
    types: CP_TYPES,
    primaryType: "Checkpoint",
    message: cp,
  });
  const caller = opts.caller ?? verifier;
  const w = wallet(purpose === 1 || purpose === 2 ? caller : verifier);
  const fn = purpose === 1 ? "checkpointAndList" : purpose === 2 ? "closeWithCheckpoint" : "submitCheckpoint";
  let hash: Hex;
  try {
    hash = await w.writeContract({
      address: registryAddr(),
      abi: REGISTRY_ABI,
      functionName: fn,
      args: [cp, sig],
    });
    await client.waitForTransactionReceipt({ hash });
  } catch (err) {
    chainFail(err);
  }
  await db.query(
    `UPDATE chain_links SET sequence = $2, success_primary = $3, success_backup = $4, breach_primary = $5, breach_backup = $6
     WHERE reservation_id = $1`,
    [reservationId, nextSeq, counts.successPrimary, counts.successBackup, counts.breachPrimary, counts.breachBackup],
  );
  return { txHash: hash, sequence: nextSeq, counts, skipped: false as const };
}

export async function checkpointUsage(db: Db, reservationId: string) {
  return signAndSubmitCheckpoint(db, reservationId, 0);
}

export async function listOnchain(db: Db, owner: string, reservationId: string, designatedBuyer: string) {
  const now = Number((await publicClient().getBlock({ blockTag: "latest" })).timestamp);
  return signAndSubmitCheckpoint(db, reservationId, 1, {
    listingPrice: DEMO.transferPrice,
    designatedBuyer: designatedBuyer as `0x${string}`,
    listingExpiry: BigInt(now + 3600),
    caller: owner,
  });
}

export async function closeOnchain(db: Db, owner: string, reservationId: string) {
  try {
    return await signAndSubmitCheckpoint(db, reservationId, 2, { caller: owner });
  } catch (err) {
    if (alreadySettled(err)) return { skipped: true as const, already: true as const };
    throw err;
  }
}

export async function settleOnchain(reservationId: string, db: Db) {
  if (!chainEnabled()) return { skipped: true as const };
  const link = await db.query<{ commitment_id: string }>(
    `SELECT commitment_id FROM chain_links WHERE reservation_id = $1`,
    [reservationId],
  );
  if (!link.rows[0]) return { skipped: true as const };
  const client = publicClient();
  const w = wallet(process.env.COMMIT_VERIFIER as string);
  try {
    const hash = await w.writeContract({
      address: registryAddr(),
      abi: REGISTRY_ABI,
      functionName: "settle",
      args: [BigInt(link.rows[0].commitment_id)],
    });
    await client.waitForTransactionReceipt({ hash });
    return { txHash: hash, skipped: false as const };
  } catch (err) {
    if (alreadySettled(err)) return { already: true as const, skipped: false as const };
    chainFail(err);
  }
}

export async function t30Snapshot(addrs: { seller: string; buyer: string; primary: string; backup: string }) {
  if (!chainEnabled()) return { pending: true as const };
  const client = publicClient();
  const claim = async (a: string) =>
    (
      await client.readContract({
        address: registryAddr(),
        abi: REGISTRY_ABI,
        functionName: "claimable",
        args: [a as `0x${string}`],
      })
    ) as bigint;
  const bond = async (a: string) =>
    (
      await client.readContract({
        address: registryAddr(),
        abi: REGISTRY_ABI,
        functionName: "freeBond",
        args: [a as `0x${string}`],
      })
    ) as bigint;
  const claimable = {
    seller: await claim(addrs.seller),
    buyer: await claim(addrs.buyer),
    primary: await claim(addrs.primary),
    backup: await claim(addrs.backup),
  };
  const freeBond = { primary: await bond(addrs.primary), backup: await bond(addrs.backup) };
  const sum = claimable.seller + claimable.buyer + claimable.primary + claimable.backup + freeBond.primary + freeBond.backup;
  const isolatedExpected = 590_000n;
  const matchedIsolated = sum === isolatedExpected;
  return {
    pending: false as const,
    isolatedHardhatT30: {
      expected: isolatedExpected.toString(),
      note: "Single isolated Hardhat play: 0.24 buyer + 0.20 bonds + 0.15 transfer = 0.59. Not a shared-registry wallet total.",
    },
    walletLevelSharedRegistry: {
      claimable: Object.fromEntries(Object.entries(claimable).map(([k, v]) => [k, v.toString()])),
      freeBond: { primary: freeBond.primary.toString(), backup: freeBond.backup.toString() },
      sum: sum.toString(),
      comparedToIsolatedExpected: isolatedExpected.toString(),
      matchedIsolatedExpected: matchedIsolated,
      ok: matchedIsolated,
      verdict: matchedIsolated ? "MATCH" : "NOT_APPLICABLE",
      note: "Do not read ok:false as funds lost. claimable[address] is cumulative across every commitment on this registry, so it will not equal the isolated 0.59 check.",
    },
    claimable: Object.fromEntries(Object.entries(claimable).map(([k, v]) => [k, v.toString()])),
    freeBond: { primary: freeBond.primary.toString(), backup: freeBond.backup.toString() },
    sum: sum.toString(),
    expected: isolatedExpected.toString(),
    ok: matchedIsolated,
  };
}

export async function registryBlock() {
  if (!chainEnabled()) return null;
  return Number(await publicClient().getBlockNumber());
}

export async function buyOnchain(buyer: string, commitmentId: string) {
  if (!chainEnabled()) return { skipped: true as const };
  const client = publicClient();
  const w = wallet(buyer);
  try {
    const approveHash = await w.writeContract({
      address: tokenAddr(),
      abi: ERC20_ABI,
      functionName: "approve",
      args: [registryAddr(), DEMO.transferPrice],
    });
    await client.waitForTransactionReceipt({ hash: approveHash });
    const hash = await w.writeContract({
      address: registryAddr(),
      abi: REGISTRY_ABI,
      functionName: "buyListing",
      args: [BigInt(commitmentId)],
    });
    await client.waitForTransactionReceipt({ hash });
    return { txHash: hash, skipped: false as const };
  } catch (err) {
    chainFail(err);
  }
}

export async function readChain(db: Db, reservationId: string) {
  if (!chainEnabled()) return { pending: true, note: "no local chain configured" };
  const link = await db.query<{ commitment_id: string; create_tx: string; sequence: string }>(
    `SELECT commitment_id, create_tx, sequence FROM chain_links WHERE reservation_id = $1`,
    [reservationId],
  );
  if (!link.rows[0]) return { pending: true, note: "occupancy held; on-chain create not sent yet" };
  const client = publicClient();
  const raw = await client.readContract({
    address: registryAddr(),
    abi: REGISTRY_ABI,
    functionName: "commitments",
    args: [BigInt(link.rows[0].commitment_id)],
  });
  const c = raw as unknown as Record<string, unknown> & unknown[];
  const owner = (c.owner ?? c[0]) as `0x${string}`;
  const primary = (c.primary ?? c[2]) as `0x${string}`;
  const backup = (c.backup ?? c[3]) as `0x${string}`;
  const num = (v: unknown) => (typeof v === "bigint" ? v.toString() : String(v));
  const claim = async (a: `0x${string}`) =>
    (
      await client.readContract({ address: registryAddr(), abi: REGISTRY_ABI, functionName: "claimable", args: [a] })
    ).toString();
  return {
    pending: false,
    chainId: configuredChainId(),
    commitmentId: link.rows[0].commitment_id,
    createTx: link.rows[0].create_tx,
    sequence: Number(link.rows[0].sequence),
    owner,
    ownerEpoch: Number(c.ownerEpoch ?? c[1]),
    escrow: num(c.escrow ?? c[15]),
    termsHash: String(c.termsHash ?? c[16]),
    successPrimary: num(c.successPrimary ?? c[9]),
    successBackup: num(c.successBackup ?? c[10]),
    breachPrimary: num(c.breachPrimary ?? c[11]),
    breachBackup: num(c.breachBackup ?? c[12]),
    listed: Boolean(c.listed ?? c[19]),
    status: Number(c.status ?? c[18]),
    claimable: {
      owner: await claim(owner),
      primary: await claim(primary),
      backup: await claim(backup),
    },
  };
}

export async function chainSender(db: Db) {
  return {
    sendCheckpoint: async (payload: Record<string, unknown>) => {
      const reservationId = String(payload.reservationId || "");
      const out = await checkpointUsage(db, reservationId);
      if (out.skipped) throw new Error("chain not ready");
      return out.txHash as string;
    },
  };
}
