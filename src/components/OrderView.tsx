import { useState } from 'react';
import { format3, formatPct, parse3 } from '../lib/money';
import { longDate } from '../lib/dates';
import { computeTotals } from '../lib/totals';
import type { Order } from '../lib/types';
import { canEditLines, pending } from '../lib/workflow';
import { StatusBadge } from './StatusBadge';
import { TotalsPanel } from './TotalsPanel';

interface Props {
  order: Order;
  onReceive: (lineId: string, qty: string) => boolean;
  onCancel: () => void;
  onClose: () => void;
  onEdit: () => void;
  onPdf: () => void;
}

export function OrderView({ order, onReceive, onCancel, onClose, onEdit, onPdf }: Props) {
  const [qty, setQty] = useState<Record<string, string>>({});
  const totals = computeTotals(order);
  const active = order.status === 'open' || order.status === 'partial';
  const v = (s: string) => parse3(s) ?? 0n;

  const confirmThen = (question: string, action: () => void) => {
    if (window.confirm(question)) action();
  };

  const submitReceipt = (lineId: string) => {
    if (onReceive(lineId, qty[lineId] ?? '')) setQty((q) => ({ ...q, [lineId]: '' }));
  };

  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{order.number}</h2>
          <StatusBadge status={order.status} />
        </div>
        <div className="actions">
          {canEditLines(order) && (
            <button type="button" className="secondary" onClick={onEdit}>
              Edit order
            </button>
          )}
          {order.status === 'open' && (
            <button
              type="button"
              className="secondary danger"
              onClick={() => confirmThen(`Cancel ${order.number}? This cannot be undone.`, onCancel)}
            >
              Cancel order
            </button>
          )}
          {order.status === 'partial' && (
            <button
              type="button"
              className="secondary"
              onClick={() => confirmThen(`Close ${order.number}? Pending quantities will not be received.`, onClose)}
            >
              Close order
            </button>
          )}
          <button type="button" className="primary" onClick={onPdf}>
            Download PDF
          </button>
        </div>
      </header>

      <div className="parties">
        {(['buyer', 'supplier'] as const).map((k) => (
          <div className="party view" key={k}>
            <span className="label">{k === 'buyer' ? 'Buyer' : 'Supplier'}</span>
            <strong>{order[k].name}</strong>
            <span>{order[k].address}</span>
            <span className="mono">VAT {order[k].vat || 'not provided'}</span>
          </div>
        ))}
      </div>

      <dl className="meta view">
        <div>
          <dt>Reference</dt>
          <dd>{order.reference || 'None'}</dd>
        </div>
        <div>
          <dt>Order date</dt>
          <dd>{longDate(order.orderDate)}</dd>
        </div>
        <div>
          <dt>Due date</dt>
          <dd>{longDate(order.dueDate)}</dd>
        </div>
      </dl>

      <div className="table-wrap">
        <table className="lines">
          <caption className="sr-only">Order lines with received and pending quantities</caption>
          <thead>
            <tr>
              <th>No</th>
              <th>Description</th>
              <th className="num">Ordered</th>
              <th className="num">Received</th>
              <th className="num">Pending</th>
              <th className="num">Price</th>
              <th className="num">Disc</th>
              <th className="num">VAT</th>
              <th className="num">Net</th>
              {active && <th>Receive</th>}
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => {
              const left = pending(l);
              return (
                <tr key={l.id}>
                  <td>{i + 1}</td>
                  <td>{l.description}</td>
                  <td className="num">
                    {format3(v(l.qty))} <span className="unit-label">{l.unit}</span>
                  </td>
                  <td className="num">{format3(v(l.received))}</td>
                  <td className={`num ${left === 0n ? 'done' : ''}`}>{format3(left)}</td>
                  <td className="num">{format3(v(l.price))}</td>
                  <td className="num">{v(l.discPct) === 0n ? '-' : formatPct(v(l.discPct))}</td>
                  <td className="num">{formatPct(v(l.vatRate))}</td>
                  <td className="num">{format3(totals.lines[i].net)}</td>
                  {active && (
                    <td>
                      {left > 0n ? (
                        <form
                          className="receive"
                          onSubmit={(e) => {
                            e.preventDefault();
                            submitReceipt(l.id);
                          }}
                        >
                          <input
                            className="num small"
                            inputMode="decimal"
                            placeholder={format3(left)}
                            aria-label={`Quantity received for line ${i + 1}`}
                            value={qty[l.id] ?? ''}
                            onChange={(e) => setQty((q) => ({ ...q, [l.id]: e.target.value }))}
                          />
                          <button type="submit" className="secondary" aria-label={`Receive line ${i + 1}`}>
                            Receive
                          </button>
                        </form>
                      ) : (
                        <span className="done">Complete</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="footer-grid">
        <div className="receipts">
          <h3>Receipts</h3>
          {order.receipts.length === 0 ? (
            <p className="muted">Nothing received yet. Lines can still be edited.</p>
          ) : (
            <ul>
              {order.receipts.map((r, i) => {
                const line = order.lines.find((l) => l.id === r.lineId);
                return (
                  <li key={`${r.at}-${i}`}>
                    {new Date(r.at).toLocaleString('en-GB')}: {format3(v(r.qty))} {line?.unit} of {line?.description}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <TotalsPanel totals={totals} />
      </div>
    </section>
  );
}
