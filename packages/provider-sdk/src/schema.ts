export type SearchHit = {
  title: string;
  sourceUrl: string;
  snippet: string;
  recordId: string;
};

export type SearchV1 = {
  schemaVersion: "search.v1";
  query: string;
  results: SearchHit[];
  providerId: string;
  requestId: string;
};

const MAX_RESULTS = 8;

export function validateSearchV1(body: unknown): { ok: true; value: SearchV1 } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "not object" };
  const o = body as Record<string, unknown>;
  if (o.schemaVersion !== "search.v1") return { ok: false, error: "schemaVersion" };
  if (typeof o.query !== "string") return { ok: false, error: "query" };
  if (typeof o.providerId !== "string" || !o.providerId) return { ok: false, error: "providerId" };
  if (typeof o.requestId !== "string" || !o.requestId) return { ok: false, error: "requestId" };
  if (!Array.isArray(o.results) || o.results.length > MAX_RESULTS) return { ok: false, error: "results" };
  for (const hit of o.results) {
    if (!hit || typeof hit !== "object") return { ok: false, error: "hit" };
    const h = hit as Record<string, unknown>;
    if (typeof h.title !== "string" || typeof h.sourceUrl !== "string") return { ok: false, error: "hit fields" };
    if (typeof h.snippet !== "string" || typeof h.recordId !== "string") return { ok: false, error: "hit fields" };
    if (!/^https?:\/\//.test(h.sourceUrl)) return { ok: false, error: "sourceUrl" };
  }
  return { ok: true, value: o as SearchV1 };
}

export function emptySuccess(query: string, providerId: string, requestId: string): SearchV1 {
  return { schemaVersion: "search.v1", query, results: [], providerId, requestId };
}
