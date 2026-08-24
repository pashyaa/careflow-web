import { humanize } from '../utils/formatters.js'

export default function StatusBadge({ status }) {
  return <span className={`status-badge status-${status?.toLowerCase()}`}>{humanize(status)}</span>
}

