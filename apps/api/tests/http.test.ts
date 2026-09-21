import { describe, expect, it, beforeEach } from "vitest";
import http from "node:http";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { isoFromUnix } from "@commit/domain";
import { openDb } from "../src/db.js";
import { manualClock } from "../src/clock.js";
import { createHandler } from "../src/http.js";
import { issueNonce, siweMessage, verifyLogin } from "../src/auth.js";

const now0 = 1_800_000_000;

async function listen(handler: http.RequestListener) {
  const server = http.createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  return { server, base: `http://127.0.0.1:${addr.port}` };
}

describe("quote HTTP", () => {
  it("returns a free quote without login and rejects unauthenticated reserve", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const { server, base } = await listen(createHandler(db, clock));
    try {
      const q = await fetch(`${base}/api/capacity/quote`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      });
      expect(q.status).toBe(200);
      const body = (await q.json()) as { quoteId: string; reservationRequired: boolean };
      expect(body.reservationRequired).toBe(true);
      const r = await fetch(`${base}/api/reservations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteId: body.quoteId }),
      });
      expect(r.status).toBe(401);
      const err = (await r.json()) as { error: { code: string } };
      expect(err.error.code).toBe("NOT_OWNER");
    } finally {
      server.close();
    }
  });

  it("logs in and reserves", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const account = privateKeyToAccount(generatePrivateKey());
    const { nonce, address } = await issueNonce(db, account.address, now0);
    const message = siweMessage({
      domain: "localhost",
      address,
      uri: "http://localhost:3080",
      nonce,
      chainId: 1952,
      issuedAt: isoFromUnix(now0),
      expirationTime: isoFromUnix(now0 + 3600),
    });
    const signature = await account.signMessage({ message });
    const session = await verifyLogin(db, now0, { message, signature });
    const { server, base } = await listen(createHandler(db, clock));
    try {
      const q = await fetch(`${base}/api/capacity/quote`, { method: "POST", body: "{}" });
      const quote = (await q.json()) as { quoteId: string };
      const r = await fetch(`${base}/api/reservations`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: `commit_session=${session.sessionId}` },
        body: JSON.stringify({ quoteId: quote.quoteId }),
      });
      expect(r.status).toBe(200);
      const reserved = (await r.json()) as { status: string };
      expect(reserved.status).toBe("held");
    } finally {
      server.close();
    }
  });

  it("health reports providers and registryBlock fields", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const { server, base } = await listen(createHandler(db, clock));
    try {
      const r = await fetch(`${base}/api/health`);
      expect(r.status).toBe(200);
      const body = (await r.json()) as {
        ok: boolean;
        providers?: { primary?: { ok?: boolean }; backup?: { ok?: boolean } };
        registryBlock?: number | null;
      };
      expect(body.ok).toBe(true);
      expect(body.providers?.primary).toBeDefined();
      expect(body.providers?.backup).toBeDefined();
      expect("registryBlock" in body).toBe(true);
    } finally {
      server.close();
    }
  });

  it("T29 refuses unauthenticated fault injection", async () => {
    const db = await openDb();
    const clock = manualClock(now0);
    const { server, base } = await listen(createHandler(db, clock));
    try {
      const r = await fetch(`${base}/api/admin/demo/fault`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ delayMs: 11000 }),
      });
      expect(r.status).toBe(403);
    } finally {
      server.close();
    }
  });
});
