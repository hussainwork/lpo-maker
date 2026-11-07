import { describe, expect, it } from 'vitest';
import { format3, parse3, roundDiv } from './money';
import { sampleDraft } from './sample';
import { computeTotals } from './totals';
import { validateDraft } from './validate';
import { cancel, close, createOrder, receive, RuleError, updateOrder } from './workflow';

const NOW = '2026-11-07T10:00:00.000Z';
const draft = () => sampleDraft('2026-11-07');
const created = () => createOrder(draft(), {}, 'o1', NOW).order;

describe('money', () => {
  it('rounds half away from zero', () => {
    expect(roundDiv(5n, 10n)).toBe(1n);
    expect(roundDiv(-5n, 10n)).toBe(-1n);
    expect(roundDiv(4n, 10n)).toBe(0n);
    expect(roundDiv(15n, 10n)).toBe(2n);
  });

  it('parses and formats three decimals exactly', () => {
    expect(parse3('12.75')).toBe(12750n);
    expect(parse3('1,200')).toBe(1200000n);
    expect(parse3('1.2345')).toBeNull();
    expect(parse3('abc')).toBeNull();
    expect(format3(1510262n)).toBe('1,510.262');
  });
});

describe('totals for the sample order', () => {
  const t = computeTotals(draft());

  it('works out each line net after its own discount', () => {
    expect(t.lines.map((l) => format3(l.net))).toEqual(['129.675', '1,200.000', '57.000', '39.780']);
    expect(format3(t.lines[0].discount)).toBe('6.825');
  });

  it('splits the document discount by group net, last group takes the leftover', () => {
    const [ten, zero] = t.groups;
    expect(format3(ten.net)).toBe('1,386.675');
    expect(format3(zero.net)).toBe('39.780');
    expect(format3(ten.discountShare)).toBe('48.606'); // 48.6056... rounded
    expect(format3(zero.discountShare)).toBe('1.394'); // 50.000 - 48.606
    expect(ten.discountShare + zero.discountShare).toBe(50000n);
  });

  it('calculates VAT once per rate group, after the discount', () => {
    const [ten, zero] = t.groups;
    expect(format3(ten.taxable)).toBe('1,338.069');
    expect(format3(ten.vat)).toBe('133.807'); // 133.8069 rounded
    expect(format3(zero.vat)).toBe('0.000');
  });

  it('adds up to the document total', () => {
    expect(format3(t.taxable)).toBe('1,376.455');
    expect(format3(t.total)).toBe('1,510.262');
  });
});

describe('validation', () => {
  it('accepts the sample order', () => {
    expect(validateDraft(draft())).toEqual([]);
  });

  it('refuses zero quantity, negative price and a due date before the order date', () => {
    const d = draft();
    d.lines[0].qty = '0';
    d.lines[1].price = '-1';
    d.dueDate = '2026-11-01';
    const errors = validateDraft(d).join(' ');
    expect(errors).toContain('quantity must be above zero');
    expect(errors).toContain('price must be zero or more');
    expect(errors).toContain('Due date cannot be before');
  });

  it('allows a price of zero', () => {
    const d = draft();
    d.lines[2].price = '0';
    expect(validateDraft(d)).toEqual([]);
  });
});

describe('numbering', () => {
  it('issues LPO-year-0001 and continues without gaps in the same year', () => {
    const first = createOrder(draft(), {}, 'a', NOW);
    const second = createOrder(draft(), first.counters, 'b', NOW);
    expect(first.order.number).toBe('LPO-2026-0001');
    expect(second.order.number).toBe('LPO-2026-0002');
  });

  it('starts again at 0001 in a new year', () => {
    const { counters } = createOrder(draft(), {}, 'a', NOW);
    const next = createOrder(sampleDraft('2027-01-03'), counters, 'b', NOW);
    expect(next.order.number).toBe('LPO-2027-0001');
  });

  it('does not take a number when the order is invalid', () => {
    const bad = draft();
    bad.lines = [];
    expect(() => createOrder(bad, {}, 'a', NOW)).toThrow(RuleError);
  });
});

describe('receiving and status', () => {
  it('moves open to partial, and refuses more than is pending', () => {
    const o = receive(created(), 'l3', '10', NOW);
    expect(o.status).toBe('partial');
    expect(() => receive(o, 'l3', '15', NOW)).toThrow('only 14.000 each pending');
  });

  it('closes automatically when everything is received', () => {
    let o = created();
    for (const l of o.lines) o = receive(o, l.id, l.qty, NOW);
    expect(o.status).toBe('closed');
  });

  it('locks lines after the first receipt', () => {
    const o = receive(created(), 'l1', '1', NOW);
    expect(() => updateOrder(o, draft())).toThrow('locked');
  });

  it('lets an open order be cancelled but not closed', () => {
    expect(cancel(created(), NOW).status).toBe('cancelled');
    expect(() => close(created(), NOW)).toThrow(RuleError);
  });

  it('lets a partial order be closed but not cancelled', () => {
    const o = receive(created(), 'l1', '1', NOW);
    expect(() => cancel(o, NOW)).toThrow(RuleError);
    expect(close(o, NOW).status).toBe('closed');
  });

  it('refuses everything on closed and cancelled orders', () => {
    const closed = close(receive(created(), 'l1', '1', NOW), NOW);
    const cancelled = cancel(created(), NOW);
    for (const o of [closed, cancelled]) {
      expect(() => receive(o, 'l2', '1', NOW)).toThrow(RuleError);
      expect(() => cancel(o, NOW)).toThrow(RuleError);
      expect(() => close(o, NOW)).toThrow(RuleError);
      expect(() => updateOrder(o, draft())).toThrow(RuleError);
    }
  });
});
