import { humanize } from '../utils/formatters.js'

export default function PriorityBadge({ priority }) {
  return <span className={`priority-badge priority-${priority?.toLowerCase()}`}><i />{humanize(priority)}</span>
}

