// Decimal values are stored as strings with three decimals ("45.500") so the
// order survives JSON and localStorage without ever becoming a float.

export type Status = 'open' | 'partial' | 'closed' | 'cancelled';

export interface Party {
  name: string;
  address: string;
  vat: string;
}

export interface Line {
  id: string;
  description: string;
  qty: string;
  unit: string;
  price: string;
  discPct: string;
  vatRate: string;
  received: string;
}

export interface Receipt {
  lineId: string;
  qty: string;
  at: string;
}

export interface Order {
  id: string;
  number: string;
  reference: string;
  orderDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  buyer: Party;
  supplier: Party;
  lines: Line[];
  docDiscount: string;
  status: Status;
  receipts: Receipt[];
  createdAt: string;
  closedAt?: string;
}

/** Everything the user types before the order is created. */
export type Draft = Omit<Order, 'id' | 'number' | 'status' | 'receipts' | 'createdAt' | 'closedAt'>;
