import type { SearchHit } from "./schema.js";
import { validateSearchV1 } from "./schema.js";

export type ExecuteBody = {
  attemptId?: string;
  query?: string;
};

export type ExecuteOk = {
  status: "SUCCEEDED";
  providerId: string;
  response: {
    schemaVersion: "search.v1";
    query: string;
    results: SearchHit[];
    providerId: string;
    requestId: string;
  };
};

export type ExecuteErr = {
  error: { code: string; message: string; retryable?: boolean };
};

/**
 * Turn a search function into a Commit `POST /execute` result.
 * Capacity, bonds and failover stay in Commit — this only speaks search.v1.
 */
export async function handleExecute(
  body: ExecuteBody,
  opts: {
    providerId: string;
    search: (query: string) => Promise<SearchHit[]>;
  },
): Promise<{ statusCode: number; json: ExecuteOk | ExecuteErr }> {
  const attemptId = String(body.attemptId || "");
  const query = String(body.query || "");
  if (!attemptId) {
    return {
      statusCode: 400,
      json: { error: { code: "INVALID_INPUT", message: "attemptId required" } },
    };
  }
  let results: SearchHit[];
  try {
    results = await opts.search(query);
  } catch (err) {
    return {
      statusCode: 503,
      json: {
        error: {
          code: "PROVIDER_FAILED",
          message: err instanceof Error ? err.message : "upstream",
          retryable: true,
        },
      },
    };
  }
  const response = {
    schemaVersion: "search.v1" as const,
    query,
    results,
    providerId: opts.providerId,
    requestId: attemptId,
  };
  const checked = validateSearchV1(response);
  if (!checked.ok) {
    return {
      statusCode: 500,
      json: { error: { code: "INVALID_SCHEMA", message: checked.error } },
    };
  }
  return {
    statusCode: 200,
    json: { status: "SUCCEEDED", providerId: opts.providerId, response },
  };
}
