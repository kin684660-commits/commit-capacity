import { describe, expect, it } from "vitest";
import { buildQuoteTerms, windowsOverlap } from "../src/quote.js";
import { DEMO } from "../src/params.js";

describe("quote builder", () => {
  const now = 1_800_000_000;

  it("defaults to search v1 and a lead-time window", () => {
    const terms = buildQuoteTerms({}, now);
    expect("error" in terms).toBe(false);
    if ("error" in terms) return;
    expect(terms.serviceClass).toBe("search");
    expect(Number(terms.start)).toBe(now + DEMO.minLeadSeconds);
  });

  it("rejects an immediate window", () => {
    const iso = new Date(now * 1000).toISOString();
    const later = new Date((now + 600) * 1000).toISOString();
    const terms = buildQuoteTerms({ window: { start: iso, end: later } }, now);
    expect(terms).toMatchObject({ error: "OUTSIDE_WINDOW" });
  });
});

describe("overlap", () => {
  it("detects exclusive window collision", () => {
    expect(windowsOverlap(10, 20, 15, 25)).toBe(true);
    expect(windowsOverlap(10, 20, 20, 30)).toBe(false);
  });
});
