import { parse3, roundDiv, SCALE } from './money';
import type { Draft, Line } from './types';

export interface LineTotals {
  id: string;
  gross: bigint; // quantity x unit price
  discount: bigint; // line discount amount
  net: bigint; // gross less line discount
}

export interface VatGroup {
  rate: bigint; // scaled percentage, 10% = 10000n
  net: bigint; // sum of line nets at this rate
  discountShare: bigint; // part of the document discount
  taxable: bigint; // net less discount share
  vat: bigint;
}

export interface Totals {
  lines: LineTotals[];
  groups: VatGroup[];
  linesNet: bigint;
  docDiscount: bigint;
  taxable: bigint;
  vat: bigint;
  total: bigint;
}

const v = (s: string) => parse3(s) ?? 0n;

/** Line net = quantity x unit price, less the line discount. */
export function lineTotals(line: Line): LineTotals {
  // qty and price both carry three decimals, so the product carries six.
  const gross = roundDiv(v(line.qty) * v(line.price), SCALE);
  // discPct is scaled by 1,000, and a percentage divides by 100.
  const discount = roundDiv(gross * v(line.discPct), 100n * SCALE);
  return { id: line.id, gross, discount, net: gross - discount };
}

/**
 * Rules 3 and 4: VAT is worked out per rate group, after the document
 * discount. The document discount is split across groups in proportion to
 * their net; every group is rounded except the last, which takes whatever
 * fraction is left so the shares always add up to the exact discount.
 * Groups appear in the order their rate first appears on the order.
 */
export function computeTotals(order: Pick<Draft, 'lines' | 'docDiscount'>): Totals {
  const lines = order.lines.map(lineTotals);

  const groups: VatGroup[] = [];
  order.lines.forEach((line, i) => {
    const rate = v(line.vatRate);
    let group = groups.find((g) => g.rate === rate);
    if (!group) {
      group = { rate, net: 0n, discountShare: 0n, taxable: 0n, vat: 0n };
      groups.push(group);
    }
    group.net += lines[i].net;
  });

  const linesNet = groups.reduce((sum, g) => sum + g.net, 0n);
  const docDiscount = v(order.docDiscount);

  let allocated = 0n;
  groups.forEach((g, i) => {
    const isLast = i === groups.length - 1;
    g.discountShare =
      linesNet === 0n ? 0n : isLast ? docDiscount - allocated : roundDiv(docDiscount * g.net, linesNet);
    allocated += g.discountShare;
    g.taxable = g.net - g.discountShare;
    g.vat = roundDiv(g.taxable * g.rate, 100n * SCALE);
  });

  const taxable = groups.reduce((sum, g) => sum + g.taxable, 0n);
  const vat = groups.reduce((sum, g) => sum + g.vat, 0n);
  return { lines, groups, linesNet, docDiscount, taxable, vat, total: taxable + vat };
}
