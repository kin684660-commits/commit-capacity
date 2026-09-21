#!/usr/bin/env node
import http from "node:http";

const port = Number(process.env.COMMIT_API_PORT || 3080);
http
  .createServer((req, res) => {
    if (req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "commit-api", chainId: 1952 }));
      return;
    }
    res.writeHead(404);
    res.end();
  })
  .listen(port, "127.0.0.1", () => console.log(`api health 127.0.0.1:${port}`));
