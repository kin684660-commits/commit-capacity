export type ChainClock = {
  chainNowSec(): Promise<number>;
};

export function wallClock(): ChainClock {
  return { chainNowSec: async () => Math.floor(Date.now() / 1000) };
}

export function rpcClock(url: string): ChainClock {
  return {
    async chainNowSec() {
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBlockByNumber", params: ["latest", false] }),
      });
      const body = (await r.json()) as { result?: { timestamp?: string }; error?: { message?: string } };
      if (!body.result?.timestamp) throw new Error(body.error?.message || "rpc down");
      return Number.parseInt(body.result.timestamp, 16);
    },
  };
}

export function manualClock(start = Math.floor(Date.now() / 1000)) {
  let now = start;
  let down = false;
  return {
    chainNowSec: async () => {
      if (down) throw new Error("rpc down");
      return now;
    },
    set(sec: number) {
      now = sec;
    },
    fail(v: boolean) {
      down = v;
    },
  };
}
