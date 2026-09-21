export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
    credentials: "include",
  });
  const body = (await r.json()) as T & { error?: { code: string; message: string } };
  if (!r.ok) {
    throw new Error(body.error?.message || `HTTP ${r.status}`);
  }
  return body;
}
