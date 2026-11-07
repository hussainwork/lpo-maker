// Builds public/sample-lpo.pdf from the sample order in the brief,
// partly received, so the PDF shows ordered, received and pending.
import { writeFileSync } from 'node:fs';
import { buildPdf } from '../src/lib/pdf';
import { sampleDraft } from '../src/lib/sample';
import { createOrder, receive } from '../src/lib/workflow';

const at = '2026-11-07T09:00:00.000Z';
let { order } = createOrder(sampleDraft('2026-11-07'), {}, 'sample', at);
order = receive(order, 'l1', '3', at);
order = receive(order, 'l3', '10', at);

writeFileSync('public/sample-lpo.pdf', Buffer.from(buildPdf(order).output('arraybuffer')));
console.log(`Wrote public/sample-lpo.pdf for ${order.number} (${order.status})`);
