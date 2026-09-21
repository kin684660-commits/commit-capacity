export class ApiError extends Error {
  code: string;
  http: number;
  retryable: boolean;

  constructor(code: string, message: string, http = 400, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.http = http;
    this.retryable = retryable;
  }

  body(traceId: string) {
    return { error: { code: this.code, message: this.message, retryable: this.retryable, traceId } };
  }
}

export function jsonError(code: string, message: string, http = 400, retryable = false) {
  return new ApiError(code, message, http, retryable);
}
