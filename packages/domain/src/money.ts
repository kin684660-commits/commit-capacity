/** tCOM uses 6 decimals. All money in this package is bigint minor units. */

export const TCOM_DECIMALS = 6;
export const TCOM_SCALE = 10n ** BigInt(TCOM_DECIMALS);

export function parseTcom(value: string): bigint {
  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`invalid tCOM amount: ${value}`);
  }
  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholeRaw, fracRaw = ""] = unsigned.split(".");
  if (fracRaw.length > TCOM_DECIMALS) {
    throw new Error(`tCOM has at most ${TCOM_DECIMALS} decimals`);
  }
  const frac = fracRaw.padEnd(TCOM_DECIMALS, "0");
  const minor = BigInt(wholeRaw) * TCOM_SCALE + BigInt(frac || "0");
  return negative ? -minor : minor;
}

export function formatTcom(minor: bigint): string {
  const sign = minor < 0n ? "-" : "";
  const abs = minor < 0n ? -minor : minor;
  const whole = abs / TCOM_SCALE;
  const frac = (abs % TCOM_SCALE).toString().padStart(TCOM_DECIMALS, "0").replace(/0+$/, "");
  return frac ? `${sign}${whole}.${frac}` : `${sign}${whole}`;
}

export function add(a: bigint, b: bigint): bigint {
  return a + b;
}

export function sub(a: bigint, b: bigint): bigint {
  if (b > a) throw new Error("money underflow");
  return a - b;
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function sum(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}
