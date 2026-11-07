import { useState, type FormEvent } from 'react';
import { format3 } from '../lib/money';
import { computeTotals } from '../lib/totals';
import type { Draft, Line, Party } from '../lib/types';
import { validateDraft } from '../lib/validate';
import { TotalsPanel } from './TotalsPanel';

interface Props {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel: string;
  title: string;
  fixedNumber?: string;
}

export function OrderForm({ draft, onChange, onSubmit, onCancel, submitLabel, title, fixedNumber }: Props) {
  const [tried, setTried] = useState(false);
  const totals = computeTotals(draft);
  const errors = validateDraft(draft);

  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const setParty = (key: 'buyer' | 'supplier', patch: Partial<Party>) =>
    set({ [key]: { ...draft[key], ...patch } });
  const setLine = (id: string, patch: Partial<Line>) =>
    set({ lines: draft.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  const addLine = () =>
    set({
      lines: [
        ...draft.lines,
        { id: crypto.randomUUID(), description: '', qty: '1', unit: 'each', price: '0', discPct: '0', vatRate: '10', received: '0' },
      ],
    });
  const removeLine = (id: string) => set({ lines: draft.lines.filter((l) => l.id !== id) });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (errors.length === 0) onSubmit();
  };

  const partyFields = (key: 'buyer' | 'supplier', label: string) => (
    <fieldset className="party">
      <legend>{label}</legend>
      <label>
        Company name
        <input value={draft[key].name} onChange={(e) => setParty(key, { name: e.target.value })} />
      </label>
      <label>
        Address
        <input value={draft[key].address} onChange={(e) => setParty(key, { address: e.target.value })} />
      </label>
      <label>
        VAT number
        <input value={draft[key].vat} onChange={(e) => setParty(key, { vat: e.target.value })} />
      </label>
    </fieldset>
  );

  return (
    <form className="card" onSubmit={submit} noValidate>
      <header className="card-head">
        <h2>{title}</h2>
        <span className="number">{fixedNumber ?? 'Number is assigned when you create the LPO'}</span>
      </header>

      <div className="parties">
        {partyFields('buyer', 'Buyer')}
        {partyFields('supplier', 'Supplier')}
      </div>

      <div className="meta">
        <label>
          Reference
          <input value={draft.reference} onChange={(e) => set({ reference: e.target.value })} />
        </label>
        <label>
          Order date
          <input type="date" value={draft.orderDate} onChange={(e) => set({ orderDate: e.target.value })} />
        </label>
        <label>
          Due date
          <input type="date" value={draft.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
        </label>
      </div>

      <div className="table-wrap">
        <table className="lines edit">
          <caption className="sr-only">Order lines</caption>
          <thead>
            <tr>
              <th>No</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Price</th>
              <th>Disc %</th>
              <th>VAT %</th>
              <th className="num">Net</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {draft.lines.map((l, i) => (
              <tr key={l.id}>
                <td>{i + 1}</td>
                <td>
                  <input value={l.description} aria-label={`Description, line ${i + 1}`} onChange={(e) => setLine(l.id, { description: e.target.value })} />
                </td>
                <td>
                  <input className="num" inputMode="decimal" value={l.qty} aria-label={`Quantity, line ${i + 1}`} onChange={(e) => setLine(l.id, { qty: e.target.value })} />
                </td>
                <td>
                  <input className="unit" value={l.unit} aria-label={`Unit, line ${i + 1}`} onChange={(e) => setLine(l.id, { unit: e.target.value })} />
                </td>
                <td>
                  <input className="num" inputMode="decimal" value={l.price} aria-label={`Unit price, line ${i + 1}`} onChange={(e) => setLine(l.id, { price: e.target.value })} />
                </td>
                <td>
                  <input className="num small" inputMode="decimal" value={l.discPct} aria-label={`Discount percent, line ${i + 1}`} onChange={(e) => setLine(l.id, { discPct: e.target.value })} />
                </td>
                <td>
                  <input className="num small" inputMode="decimal" value={l.vatRate} aria-label={`VAT percent, line ${i + 1}`} onChange={(e) => setLine(l.id, { vatRate: e.target.value })} />
                </td>
                <td className="num">{format3(totals.lines[i].net)}</td>
                <td>
                  <button type="button" className="link danger" onClick={() => removeLine(l.id)} aria-label={`Remove line ${i + 1}`}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {draft.lines.length === 0 && <p className="empty">No lines yet. Press Add line to start.</p>}
      </div>
      <button type="button" className="secondary add-line" onClick={addLine}>
        Add line
      </button>

      <div className="footer-grid">
        <label className="doc-discount">
          Document discount (BD)
          <input className="num" inputMode="decimal" value={draft.docDiscount} onChange={(e) => set({ docDiscount: e.target.value })} />
        </label>
        <TotalsPanel totals={totals} />
      </div>

      {tried && errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <div className="actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Discard changes
          </button>
        )}
        <button type="submit" className="primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
