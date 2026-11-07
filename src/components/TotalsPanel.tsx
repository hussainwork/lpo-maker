import { format3, formatPct } from '../lib/money';
import type { Totals } from '../lib/totals';

export function TotalsPanel({ totals }: { totals: Totals }) {
  return (
    <table className="totals">
      <tbody>
        <tr>
          <th>Lines net</th>
          <td>{format3(totals.linesNet)}</td>
        </tr>
        <tr>
          <th>Document discount</th>
          <td>-{format3(totals.docDiscount)}</td>
        </tr>
        {totals.groups.map((g) => (
          <tr key={`t${g.rate}`} className="group">
            <th>
              VAT {formatPct(g.rate)} on {format3(g.taxable)}
              <span className="hint"> (net {format3(g.net)}, discount share {format3(g.discountShare)})</span>
            </th>
            <td>{format3(g.vat)}</td>
          </tr>
        ))}
        <tr className="grand">
          <th>Total BD</th>
          <td>{format3(totals.total)}</td>
        </tr>
      </tbody>
    </table>
  );
}
