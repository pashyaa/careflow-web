export function formatDateTime(value, timeZone) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    // CF-106: when a time zone is given (e.g. the site's), show the time in THAT zone with its label.
    ...(timeZone ? { timeZone, timeZoneName: 'short' } : {}),
  }).format(new Date(value))
}

export function formatMinutes(minutes) {
  if (minutes === null || minutes === undefined) return '—'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

const SLA_STATE_LABELS = {
  ON_TRACK: 'On track', AT_RISK: 'At risk', BREACHED: 'Breached',
  MET: 'Met', MET_LATE: 'Met late', NOT_TRACKED: 'Not tracked',
}

export function slaStateLabel(state) {
  return SLA_STATE_LABELS[state] ?? '—'
}

export function humanize(value) {
  if (!value) return '—'
  return value.toLowerCase().split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export function isOverdue(workOrder) {
  return !['RESOLVED', 'CANCELLED'].includes(workOrder.status)
    && new Date(workOrder.targetResolutionAt).getTime() < Date.now()
}

