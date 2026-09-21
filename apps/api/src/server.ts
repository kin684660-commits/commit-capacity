import http from "node:http";
import { rpcClock, wallClock } from "./clock.js";
import { openDb } from "./db.js";
import { createHandler } from "./http.js";
import { processOutbox } from "./outbox.js";
import { recoverInflight } from "./router.js";
import { chainEnabled, chainSender } from "./chain.js";

const port = Number(process.env.COMMIT_API_PORT || 3080);
const bind = process.env.COMMIT_BIND || "127.0.0.1";
const dataDir = process.env.COMMIT_PGLITE_DIR;
const clock = process.env.COMMIT_RPC_URL ? rpcClock(process.env.COMMIT_RPC_URL) : wallClock();

const db = await openDb(dataDir);
await recoverInflight(db);
const server = http.createServer(createHandler(db, clock));
server.listen(port, bind, () => {
  console.log(`commit api ${bind}:${port} (pglite ${dataDir || "memory"} rpc ${process.env.COMMIT_RPC_URL || "off"})`);
});

setInterval(() => {
  void (async () => {
    const sender = chainEnabled() ? await chainSender(db) : undefined;
    await processOutbox(db, sender);
  })();
}, 2000).unref();
