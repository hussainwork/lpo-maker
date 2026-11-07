import { STATUS_LABEL } from '../lib/status';
import type { Status } from '../lib/types';

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`status ${status}`}>{STATUS_LABEL[status]}</span>;
}
