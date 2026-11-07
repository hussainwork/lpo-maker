import { parse3 } from './money';
import { computeTotals } from './totals';
import type { Draft } from './types';

const HUNDRED = 100_000n; // 100% scaled by 1,000

/** Checks the draft before an order is created. Returns a list of problems; empty means valid. */
export function validateDraft(d: Draft): string[] {
  const errors: string[] = [];

  if (!d.buyer.name.trim()) errors.push('Buyer name is required.');
  if (!d.supplier.name.trim()) errors.push('Supplier name is required.');
  if (!d.orderDate) errors.push('Order date is required.');
  if (!d.dueDate) errors.push('Due date is required.');
  if (d.orderDate && d.dueDate && d.dueDate < d.orderDate) {
    errors.push('Due date cannot be before the order date.');
  }
  if (d.lines.length === 0) errors.push('Add at least one line.');

  d.lines.forEach((line, i) => {
    const n = `Line ${i + 1}`;
    const qty = parse3(line.qty);
    const price = parse3(line.price);
    const disc = parse3(line.discPct || '0');
    const rate = parse3(line.vatRate);

    if (!line.description.trim()) errors.push(`${n}: description is required.`);
    if (qty === null || qty <= 0n) errors.push(`${n}: quantity must be above zero, with up to 3 decimals.`);
    if (price === null || price < 0n) errors.push(`${n}: price must be zero or more, with up to 3 decimals.`);
    if (disc === null || disc < 0n || disc > HUNDRED) errors.push(`${n}: discount must be between 0% and 100%.`);
    if (rate === null || rate < 0n || rate > HUNDRED) errors.push(`${n}: VAT rate must be between 0% and 100%.`);
  });

  const docDiscount = parse3(d.docDiscount || '0');
  if (docDiscount === null || docDiscount < 0n) {
    errors.push('Document discount must be zero or more, with up to 3 decimals.');
  } else if (errors.length === 0 && docDiscount > computeTotals(d).linesNet) {
    errors.push('Document discount cannot be larger than the order net.');
  }

  return errors;
}
