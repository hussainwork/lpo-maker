import type { Status } from './types';

export const STATUS_LABEL: Record<Status, string> = {
  open: 'Open',
  partial: 'Partly received',
  closed: 'Closed',
  cancelled: 'Cancelled',
};
