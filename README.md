# LPO Maker

A small web app that turns a purchase request into a Local Purchase Order (LPO) PDF, then tracks the goods as they arrive.

- **Live app:** https://hussainwork.github.io/lpo-maker/
- **Sample order PDF:** https://hussainwork.github.io/lpo-maker/sample-lpo.pdf

No login and no server. Orders are saved in the browser (localStorage).

## What it does

1. Enter an order and see the totals update live.
2. Create it to issue an LPO number (`LPO-2026-0001`).
3. Record goods received, line by line.
4. Cancel an open order, or close a partly received one.
5. Download the LPO as a PDF.

Press **Load sample order** to fill in the order from the brief.

## How the money works

All money logic is in `src/lib`, separate from the UI, and covered by tests.

| Rule | Where |
|---|---|
| BHD with three decimals, rounded half away from zero | `money.ts` |
| Line net = quantity x unit price, less the line discount | `totals.ts` |
| Document discount split across VAT rate groups by their net; the last group takes the leftover fraction | `totals.ts` |
| VAT per rate group, after the discount, not per line | `totals.ts` |
| Quantity above zero, price zero or more, due date not before order date | `validate.ts` |
| Never receive past the ordered quantity; refuse and say how much is pending | `workflow.ts` |
| Lines locked after the first receipt | `workflow.ts` |
| Open, then partial, then closed; open can cancel; partial can only close | `workflow.ts` |
| `LPO-year-0001`, no gaps within a year | `workflow.ts` |
| PDF with parties, dates, ordered, received and pending per line, discount, VAT per rate, total, status | `pdf.ts` |

**No floating point.** Every amount, quantity and percentage is a `BigInt` scaled by 1,000. For example, 45.500 is stored as `45500n`. Decimals are saved as strings in localStorage, so a value never passes through a JavaScript number.

### The sample order, worked by hand

| | 10% group | 0% group |
|---|---:|---:|
| Net (after line discounts) | 1,386.675 | 39.780 |
| Share of the 50.000 discount | 48.606 (48.6056 rounded) | 1.394 (the leftover) |
| Taxable | 1,338.069 | 38.386 |
| VAT | 133.807 | 0.000 |

**Total BD 1,510.262.** The test file checks every one of these numbers.

## Decisions and assumptions

- **Group order.** VAT groups follow the order their rate first appears on the LPO, so the last group is the last new rate on the order.
- **Numbering.** A number is taken only when an order is created, and orders are never deleted. Cancelled orders keep their number, so a year's sequence has no gaps. The year comes from the order date.
- **Closing.** Closing a partly received order short-closes it: pending quantities will not be received.
- **Editing.** An open order with no receipts can be edited. Its number never changes.

## Known limits

- Data lives in one browser. A real system would keep the ledger and numbering on a server, in a Postgres transaction, so two users cannot take the same number.
- The PDF uses Helvetica, so it is English only.

## Run it

```bash
npm install
npm run dev          # local app
npm test             # 18 tests for the rules
npm run sample-pdf   # rebuild public/sample-lpo.pdf
```

Built with Vite, React, TypeScript, jsPDF and Vitest. Deployed to GitHub Pages by GitHub Actions after the tests pass.
