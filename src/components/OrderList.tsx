import { format3 } from '../lib/money';
import { computeTotals } from '../lib/totals';
import type { Order } from '../lib/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  orders: Order[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function OrderList({ orders, selectedId, onSelect }: Props) {
  return (
    <nav className="sidebar" aria-label="Orders">
      <h2>Orders</h2>
      {orders.length === 0 ? (
        <p className="empty">
          No orders yet. Fill in the form, or load the sample order, then press Create LPO to issue your first number.
        </p>
      ) : (
        <ul>
          {orders.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={`order-item ${selectedId === o.id ? 'active' : ''}`}
                aria-current={selectedId === o.id ? 'true' : undefined}
                onClick={() => onSelect(o.id)}
              >
                <span className="mono">{o.number}</span>
                <StatusBadge status={o.status} />
                <span className="supplier">{o.supplier.name}</span>
                <span className="mono amount">BD {format3(computeTotals(o).total)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">Saved in this browser only. There is no server and no login.</p>
    </nav>
  );
}
