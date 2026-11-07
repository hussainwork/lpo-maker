// Exact decimal arithmetic for Bahraini dinar amounts.
//
// Every quantity, price, percentage and amount is held as a BigInt scaled by
// 1,000 (three decimals). JavaScript numbers are never used for money, so
// there is no floating-point drift. Rounding is half away from zero.

export const SCALE = 1000n;

/** Divide and round half away from zero. */
export function roundDiv(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error('Division by zero');
  const negative = (n < 0n) !== (d < 0n);
  const a = n < 0n ? -n : n;
  const b = d < 0n ? -d : d;
  const q = (a * 2n + b) / (2n * b);
  return negative ? -q : q;
}

/**
 * Parse a decimal string with at most three decimals, e.g. "12.75" -> 12750n.
 * Returns null for anything that is not a plain decimal number.
 */
export function parse3(input: string): bigint | null {
  const s = input.trim().replace(/,/g, '');
  const m = /^(-?)(\d+)(?:\.(\d{0,3}))?$/.exec(s);
  if (!m) return null;
  const [, sign, whole, frac = ''] = m;
  const value = BigInt(whole) * SCALE + BigInt(frac.padEnd(3, '0'));
  return sign === '-' ? -value : value;
}

/** Format a scaled amount with thousands separators and three decimals. */
export function format3(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = (abs / SCALE).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (abs % SCALE).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** Format a scaled percentage without trailing zeros, e.g. 5000n -> "5%". */
export function formatPct(value: bigint): string {
  const s = format3(value).replace(/\.?0+$/, '');
  return `${s}%`;
}
