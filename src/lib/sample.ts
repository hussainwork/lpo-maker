import type { Draft } from './types';

/** Add days to a YYYY-MM-DD date without timezone surprises. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function today(): string {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** The sample order from the brief: order date today, due 30 days later. */
export function sampleDraft(orderDate: string): Draft {
  return {
    reference: 'DCT-REQ-0417',
    orderDate,
    dueDate: addDays(orderDate, 30),
    buyer: {
      name: 'Dilmun Coastal Trading W.L.L.',
      address: 'Manama, Kingdom of Bahrain',
      vat: '200000000000001',
    },
    supplier: {
      name: 'Gulf Pipe Supplies W.L.L.',
      address: 'Sitra, Kingdom of Bahrain',
      vat: '200000000000002',
    },
    lines: [
      { id: 'l1', description: 'Chilled water dispenser, installed', qty: '3', unit: 'each', price: '45.500', discPct: '5', vatRate: '10', received: '0' },
      { id: 'l2', description: 'Annual maintenance contract', qty: '1', unit: 'each', price: '1200.000', discPct: '0', vatRate: '10', received: '0' },
      { id: 'l3', description: 'Filter cartridge', qty: '24', unit: 'each', price: '2.375', discPct: '0', vatRate: '10', received: '0' },
      { id: 'l4', description: 'Copper piping', qty: '12.750', unit: 'metre', price: '3.120', discPct: '0', vatRate: '0', received: '0' },
    ],
    docDiscount: '50.000',
  };
}

export function emptyDraft(orderDate: string): Draft {
  return {
    reference: '',
    orderDate,
    dueDate: addDays(orderDate, 30),
    buyer: { name: '', address: '', vat: '' },
    supplier: { name: '', address: '', vat: '' },
    lines: [{ id: crypto.randomUUID(), description: '', qty: '1', unit: 'each', price: '0', discPct: '0', vatRate: '10', received: '0' }],
    docDiscount: '0',
  };
}
