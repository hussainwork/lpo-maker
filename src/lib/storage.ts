import type { Order } from './types';
import type { Counters } from './workflow';

// No server database: orders live in this browser's localStorage.
const KEY = 'lpo-maker:v1';

export interface Store {
  orders: Order[];
  counters: Counters;
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    // Private mode or corrupted data: start empty rather than crash.
  }
  return { orders: [], counters: {} };
}

export function save(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}
