import { format3, parse3 } from './money';
import type { Draft, Order, Status } from './types';
import { validateDraft } from './validate';

/** A refused action. The message is shown to the user as it is. */
export class RuleError extends Error {}

/** Last number used per year, e.g. { "2026": 3 }. */
export type Counters = Record<string, number>;

const v = (s: string) => parse3(s) ?? 0n;
const pendingOf = (qty: string, received: string) => v(qty) - v(received);

/** Normalise every decimal field to exactly three decimals. */
function normalise(d: Draft): Draft {
  const n3 = (s: string) => format3(v(s || '0')).replace(/,/g, '');
  return {
    ...d,
    docDiscount: n3(d.docDiscount),
    lines: d.lines.map((l) => ({
      ...l,
      qty: n3(l.qty),
      price: n3(l.price),
      discPct: n3(l.discPct),
      vatRate: n3(l.vatRate),
      received: n3(l.received),
    })),
  };
}

/**
 * Numbers look like LPO-2026-0001, no gaps within a year. A number is taken only when
 * the order is created, and orders are never deleted (cancelling keeps the
 * number), so the sequence for a year has no gaps.
 */
export function nextNumber(counters: Counters, orderDate: string): { number: string; counters: Counters } {
  const year = orderDate.slice(0, 4);
  const next = (counters[year] ?? 0) + 1;
  return {
    number: `LPO-${year}-${String(next).padStart(4, '0')}`,
    counters: { ...counters, [year]: next },
  };
}

export function createOrder(draft: Draft, counters: Counters, id: string, now: string) {
  const errors = validateDraft(draft);
  if (errors.length) throw new RuleError(errors.join(' '));
  const { number, counters: updated } = nextNumber(counters, draft.orderDate);
  const clean = normalise(draft);
  const order: Order = {
    ...clean,
    lines: clean.lines.map((l) => ({ ...l, received: '0.000' })),
    id,
    number,
    status: 'open',
    receipts: [],
    createdAt: now,
  };
  return { order, counters: updated };
}

function assertActive(order: Order) {
  if (order.status === 'closed' || order.status === 'cancelled') {
    throw new RuleError(`This order is ${order.status} and cannot be changed.`);
  }
}

/** After the first receipt, lines cannot be edited. */
export function canEditLines(order: Order): boolean {
  return order.status === 'open' && order.receipts.length === 0;
}

export function updateOrder(order: Order, draft: Draft): Order {
  assertActive(order);
  if (!canEditLines(order)) throw new RuleError('Lines are locked after the first receipt.');
  const errors = validateDraft(draft);
  if (errors.length) throw new RuleError(errors.join(' '));
  // The number and year stay fixed once issued.
  if (draft.orderDate.slice(0, 4) !== order.number.slice(4, 8)) {
    throw new RuleError('The order date must stay in the year of the LPO number.');
  }
  const clean = normalise(draft);
  return { ...order, ...clean, lines: clean.lines.map((l) => ({ ...l, received: '0.000' })) };
}

/** Never receive past the ordered quantity. */
export function receive(order: Order, lineId: string, qtyInput: string, now: string): Order {
  assertActive(order);
  const line = order.lines.find((l) => l.id === lineId);
  if (!line) throw new RuleError('Unknown line.');
  const qty = parse3(qtyInput);
  if (qty === null || qty <= 0n) throw new RuleError('Received quantity must be above zero, with up to 3 decimals.');

  const pending = pendingOf(line.qty, line.received);
  if (qty > pending) {
    throw new RuleError(
      `Refused: only ${format3(pending)} ${line.unit} pending for "${line.description}".`,
    );
  }

  const lines = order.lines.map((l) =>
    l.id === lineId ? { ...l, received: format3(v(l.received) + qty).replace(/,/g, '') } : l,
  );
  const allReceived = lines.every((l) => pendingOf(l.qty, l.received) === 0n);
  // Open, then partial, then closed when everything is received.
  const status: Status = allReceived ? 'closed' : 'partial';
  return {
    ...order,
    lines,
    status,
    receipts: [...order.receipts, { lineId, qty: format3(qty).replace(/,/g, ''), at: now }],
    closedAt: allReceived ? now : order.closedAt,
  };
}

/** Only an open order can be cancelled. */
export function cancel(order: Order, now: string): Order {
  assertActive(order);
  if (order.status !== 'open') throw new RuleError('A partly received order cannot be cancelled. Close it instead.');
  return { ...order, status: 'cancelled', closedAt: now };
}

/** A partly received order can only be closed (short-closed). */
export function close(order: Order, now: string): Order {
  assertActive(order);
  if (order.status !== 'partial') throw new RuleError('Only a partly received order can be closed. Cancel an open order instead.');
  return { ...order, status: 'closed', closedAt: now };
}

export function pending(line: { qty: string; received: string }): bigint {
  return pendingOf(line.qty, line.received);
}
