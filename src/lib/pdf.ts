import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { longDate } from './dates';
import { format3, formatPct, parse3 } from './money';
import { STATUS_LABEL } from './status';
import { computeTotals } from './totals';
import type { Order } from './types';
import { pending } from './workflow';

/** Build the LPO as a PDF document. */
export function buildPdf(order: Order): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = computeTotals(order);
  const left = 14;
  const right = 196;
  const v = (s: string) => parse3(s) ?? 0n;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('LOCAL PURCHASE ORDER', left, 20);
  doc.setFontSize(11);
  doc.text(order.number, right, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Status: ${STATUS_LABEL[order.status]}`, right, 25, { align: 'right' });

  doc.setDrawColor(30);
  doc.line(left, 29, right, 29);

  const party = (title: string, p: Order['buyer'], x: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(title, x, 36);
    doc.setFontSize(10);
    doc.text(p.name, x, 41);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(p.address || '', x, 46);
    doc.text(p.vat ? `VAT ${p.vat}` : 'VAT not provided', x, 51);
  };
  party('BUYER', order.buyer, left);
  party('SUPPLIER', order.supplier, 110);

  const meta: [string, string][] = [
    ['Reference', order.reference || 'None'],
    ['Order date', longDate(order.orderDate)],
    ['Due date', longDate(order.dueDate)],
  ];
  meta.forEach(([label, value], i) => {
    const x = left + i * 62;
    doc.setFontSize(8);
    doc.setTextColor(110);
    doc.text(label, x, 60);
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.text(value, x, 65);
  });

  autoTable(doc, {
    startY: 71,
    head: [['No', 'Description', 'Unit', 'Ordered', 'Received', 'Pending', 'Price', 'Disc', 'VAT', 'Net']],
    body: order.lines.map((l, i) => [
      String(i + 1),
      l.description,
      l.unit,
      format3(v(l.qty)),
      format3(v(l.received)),
      format3(pending(l)),
      format3(v(l.price)),
      v(l.discPct) === 0n ? '-' : formatPct(v(l.discPct)),
      formatPct(v(l.vatRate)),
      format3(t.lines[i].net),
    ]),
    styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.6 },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 3) data.cell.styles.halign = 'right';
    },
    headStyles: { fillColor: [235, 238, 242], textColor: 20, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 'auto' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' },
      9: { halign: 'right' },
    },
    margin: { left, right: 210 - right },
  });

  const summary: [string, string][] = [
    ['Lines net', format3(t.linesNet)],
    ['Document discount', `-${format3(t.docDiscount)}`],
  ];
  for (const g of t.groups) {
    summary.push([`Taxable at ${formatPct(g.rate)} (discount ${format3(g.discountShare)})`, format3(g.taxable)]);
    summary.push([`VAT ${formatPct(g.rate)}`, format3(g.vat)]);
  }
  summary.push(['Total BD', format3(t.total)]);

  const afterLines = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  autoTable(doc, {
    startY: afterLines + 6,
    body: summary,
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30, halign: 'right' } },
    margin: { left: right - 90 },
    didParseCell: (data) => {
      if (data.row.index === summary.length - 1) data.cell.styles.fontStyle = 'bold';
    },
  });

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    'The document discount is split across VAT rate groups by their net. VAT is calculated per rate group after the discount.',
    left,
    285,
  );
  return doc;
}
