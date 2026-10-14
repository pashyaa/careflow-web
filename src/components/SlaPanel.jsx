import { formatDateTime, formatMinutes, humanize, slaStateLabel } from '../utils/formatters.js'

export function SlaPill({ state }) {
  return <span className={`sla-pill sla-${state?.toLowerCase()}`}>{slaStateLabel(state)}</span>
}

function scopeLabel(scope) {
  return scope ? scope.split('+').map(humanize).join(' + ') : ''
}

export default function SlaPanel({ sla }) {
  if (!sla) return null
  const zone = sla.timeZone || undefined

  return (
    <article className="panel detail-panel">
      <div className="panel-heading">
        <div><p className="kicker">Service level</p><h2>SLA commitments</h2></div>
        <SlaPill state={sla.overallState} />
      </div>
      <dl className="detail-list">
        <div>
          <dt>Policy</dt>
          <dd>{sla.policyName || 'Legacy target (no policy snapshot)'}<span>{scopeLabel(sla.policyScope)}</span></dd>
        </div>
        <div>
          <dt>Clock</dt>
          <dd>{sla.businessHoursOnly == null ? '—' : sla.businessHoursOnly ? 'Business hours only' : '24×7'}<span>{sla.timeZone || ''}</span></dd>
        </div>
        <div>
          <dt>First response</dt>
          <dd>
            {sla.responseDueAt ? formatDateTime(sla.responseDueAt, zone) : '—'}
            <span><SlaPill state={sla.responseState} /> {sla.responseMinutes ? `target ${formatMinutes(sla.responseMinutes)}` : ''}</span>
          </dd>
        </div>
        <div>
          <dt>Resolution</dt>
          <dd>
            {formatDateTime(sla.resolutionDueAt, zone)}
            <span><SlaPill state={sla.resolutionState} /> {sla.resolutionMinutes ? `target ${formatMinutes(sla.resolutionMinutes)}` : ''}</span>
          </dd>
        </div>
      </dl>
    </article>
  )
}