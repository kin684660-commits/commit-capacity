"use client";

import { useState } from "react";
export default function AdminDemoPage() {
  const [token, setToken] = useState("change-me-local-only");
  const [msg, setMsg] = useState("");

  async function fault(body: Record<string, unknown>) {
    setMsg("");
    try {
      const out = await fetch("/api/admin/demo/fault", {
        method: "POST",
        headers: { "content-type": "application/json", "x-commit-admin": token },
        body: JSON.stringify(body),
      });
      setMsg(JSON.stringify(await out.json()));
    } catch (e) {
      setMsg((e as Error).message);
    }
  }

  return (
    <main>
      <div className="tag">Noindex · local only</div>
      <h1>Demo control</h1>
      <p>One-shot fault on the next SearchNode attempt. Nova does not share this switch.</p>
      <div className="card" style={{ maxWidth: 480 }}>
        <label>Admin token</label>
        <input value={token} onChange={(e) => setToken(e.target.value)} />
        <div className="row">
          <button className="btn" onClick={() => fault({ delayMs: 11000 })}>
            Delay 11s
          </button>
          <button className="btn ghost" onClick={() => fault({ invalidSchema: true })}>
            Bad schema
          </button>
          <button className="btn ghost" onClick={() => fault({ http5xx: true })}>
            HTTP 5xx
          </button>
        </div>
        {msg && <pre className="mono">{msg}</pre>}
      </div>
    </main>
  );
}
