export function formatDateTime(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export function humanize(value) {
  if (!value) return '—'
  return value.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function isOverdue(workOrder) {
  return !['RESOLVED', 'CANCELLED'].includes(workOrder.status)
    && new Date(workOrder.targetResolutionAt).getTime() < Date.now()
}

