import { describe, expect, it } from "vitest";
import { handleExecute } from "../src/handleExecute.js";
import { validateSearchV1 } from "../src/schema.js";

describe("Search v1 schema", () => {
  it("accepts a valid payload including empty results", () => {
    const ok = validateSearchV1({
      schemaVersion: "search.v1",
      query: "capacity",
      results: [],
      providerId: "search-node",
      requestId: "att-1",
    });
    expect(ok.ok).toBe(true);
  });

  it("rejects missing schema or bad URL", () => {
    expect(validateSearchV1({ schemaVersion: "v0", query: "q", results: [], providerId: "p", requestId: "r" }).ok).toBe(
      false,
    );
    expect(
      validateSearchV1({
        schemaVersion: "search.v1",
        query: "q",
        results: [{ title: "t", sourceUrl: "not-a-url", snippet: "s", recordId: "1" }],
        providerId: "p",
        requestId: "r",
      }).ok,
    ).toBe(false);
  });
});

describe("handleExecute", () => {
  it("wraps a search function as POST /execute", async () => {
    const out = await handleExecute(
      { attemptId: "att-1", query: "EIP-712" },
      {
        providerId: "acme-search",
        search: async () => [
          {
            title: "EIP-712",
            sourceUrl: "https://eips.ethereum.org/EIPS/eip-712",
            snippet: "typed structured data",
            recordId: "eip-712",
          },
        ],
      },
    );
    expect(out.statusCode).toBe(200);
    expect(out.json).toMatchObject({ status: "SUCCEEDED", providerId: "acme-search" });
  });

  it("requires attemptId", async () => {
    const out = await handleExecute(
      { query: "q" },
      { providerId: "p", search: async () => [] },
    );
    expect(out.statusCode).toBe(400);
  });
});
