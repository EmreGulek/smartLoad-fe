import { Badge } from 'react-bootstrap';

/**
 * Standardized loadability status badge.
 * Mirrors SkyPallet evaluation result statuses.
 *
 * Usage: <StatusBadge status="LOADABLE" />
 */
const STATUS_MAP = {
  LOADABLE:      { variant: 'success', label: 'Loadable' },
  SPECIAL_LOAD:  { variant: 'warning', label: 'Special Load', textDark: true },
  NOT_LOADABLE:  { variant: 'danger',  label: 'Not Loadable' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { variant: 'secondary', label: status };
  return (
    <Badge bg={cfg.variant} text={cfg.textDark ? 'dark' : undefined}>
      {cfg.label}
    </Badge>
  );
}
