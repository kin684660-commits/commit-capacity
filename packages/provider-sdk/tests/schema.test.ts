import { describe, expect, it } from "vitest";
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
