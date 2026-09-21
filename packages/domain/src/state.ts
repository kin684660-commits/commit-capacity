export type ChainStatus = "OPEN" | "CLOSED" | "SETTLED";
export type Route = "PRIMARY" | "BACKUP" | "UNAVAILABLE";
export type UiStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "LISTED"
  | "PAUSED"
  | "EXPIRED"
  | "CLOSED"
  | "SETTLED";

export type DerivedInput = {
  status: ChainStatus;
  listed: boolean;
  paused: boolean;
  now: number;
  start: number;
  end: number;
};

export function deriveUiStatus(input: DerivedInput): UiStatus {
  if (input.status === "SETTLED") return "SETTLED";
  if (input.status === "CLOSED") return "CLOSED";
  if (input.now >= input.end) return "EXPIRED";
  if (input.listed) return "LISTED";
  if (input.paused) return "PAUSED";
  if (input.now < input.start) return "SCHEDULED";
  return "ACTIVE";
}

export function canAcceptExecution(input: DerivedInput & { remaining: number; route: Route }): boolean {
  if (input.status !== "OPEN") return false;
  if (input.listed || input.paused) return false;
  if (input.now < input.start || input.now >= input.end) return false;
  if (input.remaining <= 0) return false;
  if (input.route === "UNAVAILABLE") return false;
  return true;
}
