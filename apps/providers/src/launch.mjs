#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const server = path.join(root, "server.mjs");

function run(role) {
  const child = spawn(process.execPath, [server, role], { stdio: "inherit", env: process.env });
  child.on("exit", (code) => {
    if (code) process.exitCode = code || 1;
  });
  return child;
}

const a = run("search-node");
const b = run("nova");
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    a.kill(signal);
    b.kill(signal);
  });
}
