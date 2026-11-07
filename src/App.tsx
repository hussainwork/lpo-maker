import { useEffect, useState } from 'react';
import { Banner, type Message } from './components/Banner';
import { OrderForm } from './components/OrderForm';
import { OrderList } from './components/OrderList';
import { OrderView } from './components/OrderView';
import { emptyDraft, sampleDraft, today } from './lib/sample';
import { load, save, type Store } from './lib/storage';
import type { Draft, Order } from './lib/types';
import { cancel, close, createOrder, receive, RuleError, updateOrder } from './lib/workflow';

type Mode =
  | { kind: 'new'; draft: Draft }
  | { kind: 'edit'; id: string; draft: Draft }
  | { kind: 'view'; id: string };

const toDraft = (o: Order): Draft => ({
  reference: o.reference,
  orderDate: o.orderDate,
  dueDate: o.dueDate,
  buyer: o.buyer,
  supplier: o.supplier,
  lines: o.lines,
  docDiscount: o.docDiscount,
});

const now = () => new Date().toISOString();

export default function App() {
  const [store, setStore] = useState<Store>(load);
  const [mode, setMode] = useState<Mode>(() =>
    store.orders.length ? { kind: 'view', id: store.orders[0].id } : { kind: 'new', draft: sampleDraft(today()) },
  );
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => save(store), [store]);

  const selected = mode.kind === 'new' ? undefined : store.orders.find((o) => o.id === mode.id);

  const replaceOrder = (order: Order) =>
    setStore((s) => ({ ...s, orders: s.orders.map((o) => (o.id === order.id ? order : o)) }));

  /** Run a rule-checked action and show the refusal message if it fails. */
  const attempt = (fn: () => void, ok?: string): boolean => {
    try {
      fn();
      setMessage(ok ? { kind: 'ok', text: ok } : null);
      return true;
    } catch (e) {
      if (e instanceof RuleError) {
        setMessage({ kind: 'error', text: e.message });
        return false;
      }
      throw e;
    }
  };

  const startNew = (draft: Draft) => {
    setMessage(null);
    setMode({ kind: 'new', draft });
  };

  const select = (id: string) => {
    setMessage(null);
    setMode({ kind: 'view', id });
  };

  const createFromDraft = (draft: Draft) =>
    attempt(() => {
      const { order, counters } = createOrder(draft, store.counters, crypto.randomUUID(), now());
      setStore((s) => ({ orders: [order, ...s.orders], counters }));
      setMode({ kind: 'view', id: order.id });
    }, 'LPO created.');

  const saveEdit = (order: Order, draft: Draft) =>
    attempt(() => {
      replaceOrder(updateOrder(order, draft));
      setMode({ kind: 'view', id: order.id });
    }, 'Changes saved.');

  const downloadPdf = async (order: Order) => {
    // Loaded on demand so the PDF library does not slow the first page load.
    const { buildPdf } = await import('./lib/pdf');
    buildPdf(order).save(`${order.number}.pdf`);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            LPO
          </span>
          <div>
            <h1>LPO Maker</h1>
            <p>Local Purchase Orders in Bahraini dinar</p>
          </div>
        </div>
        <div className="actions">
          <button type="button" className="secondary" onClick={() => startNew(sampleDraft(today()))}>
            Load sample order
          </button>
          <button type="button" className="primary" onClick={() => startNew(emptyDraft(today()))}>
            New LPO
          </button>
        </div>
      </header>

      <div className="layout">
        <OrderList orders={store.orders} selectedId={selected?.id} onSelect={select} />

        <main>
          <Banner message={message} />
          {mode.kind === 'new' && (
            <OrderForm
              title="New Local Purchase Order"
              draft={mode.draft}
              onChange={(draft) => setMode({ kind: 'new', draft })}
              onSubmit={() => createFromDraft(mode.draft)}
              submitLabel="Create LPO"
            />
          )}
          {mode.kind === 'edit' && selected && (
            <OrderForm
              title="Edit order"
              fixedNumber={selected.number}
              draft={mode.draft}
              onChange={(draft) => setMode({ ...mode, draft })}
              onSubmit={() => saveEdit(selected, mode.draft)}
              onCancel={() => select(selected.id)}
              submitLabel="Save changes"
            />
          )}
          {mode.kind === 'view' && selected && (
            <OrderView
              order={selected}
              onReceive={(lineId, qty) => attempt(() => replaceOrder(receive(selected, lineId, qty, now())), 'Receipt recorded.')}
              onCancel={() => attempt(() => replaceOrder(cancel(selected, now())), 'Order cancelled.')}
              onClose={() => attempt(() => replaceOrder(close(selected, now())), 'Order closed. Pending quantities will not be received.')}
              onEdit={() => {
                setMessage(null);
                setMode({ kind: 'edit', id: selected.id, draft: toDraft(selected) });
              }}
              onPdf={() => downloadPdf(selected)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
