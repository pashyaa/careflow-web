import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, isVersionConflict } from '../api/apiClient.js'
import { ErrorState, LoadingState } from '../components/Feedback.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { formatDateTime, humanize } from '../utils/formatters.js'
import SlaPanel from '../components/SlaPanel.jsx'
import { ROLES, useAuth } from '../auth/AuthContext.jsx'

const transitions = {
  NEW: ['CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
}

// BUG-305: these transitions need a configured reason code and a meaningful note.
const TERMINAL_STATUSES = ['RESOLVED', 'CANCELLED']
const MIN_NOTE_LENGTH = 10 // keep in sync with WorkOrderService.MIN_EVIDENCE_NOTE_LENGTH on the API

export default function WorkOrderDetailPage() {
  const { id } = useParams()
  const { hasRole } = useAuth()
  const canAssign = hasRole(ROLES.PLANNER, ROLES.ADMIN)
  const canTransition = hasRole(ROLES.PLANNER, ROLES.TECHNICIAN, ROLES.ADMIN)
  const { data, loading, error, refetch } = useAsync(async () => {
    const [workOrder, history] = await Promise.all([api.workOrder(id), api.workOrderHistory(id)])
    return { workOrder, history }
  }, [id])
  const { data: technicians } = useAsync(canAssign ? api.technicians : () => Promise.resolve([]), [canAssign])
  const [technicianId, setTechnicianId] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [note, setNote] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [reasonOptions, setReasonOptions] = useState([])
  const [fieldErrors, setFieldErrors] = useState({})
  const [mutation, setMutation] = useState({ loading: false, error: null, message: '' })
  const reasonRequestId = useRef(0)

  const isTerminal = TERMINAL_STATUSES.includes(nextStatus)
  const evidenceLabel = nextStatus === 'RESOLVED' ? 'resolution' : 'cancellation'
  const evidenceTitle = nextStatus === 'RESOLVED' ? 'Resolution' : 'Cancellation'

  async function assign(event) {
    event.preventDefault()
    if (!technicianId) return
    setMutation({ loading: true, error: null, message: '' })
    try {
      await api.assignTechnician(id, { technicianId }, data.workOrder.version)
      setTechnicianId('')
      setMutation({ loading: false, error: null, message: 'Technician assignment updated.' })
      await refetch()
    } catch (requestError) {
      setMutation({ loading: false, error: requestError, message: '' })
    }
  }

  // BUG-305: choosing a terminal status loads the configured reason codes for it.
  // The request counter makes sure a slow response for a previous choice is ignored.
  function changeNextStatus(value) {
    const requestId = reasonRequestId.current + 1
    reasonRequestId.current = requestId
    setNextStatus(value)
    setReasonCode('')
    setReasonOptions([])
    setFieldErrors({})
    if (!TERMINAL_STATUSES.includes(value)) return
    api.reasonCodes(value)
      .then((options) => {
        if (reasonRequestId.current === requestId) setReasonOptions(options)
      })
      .catch(() => {
        if (reasonRequestId.current === requestId) {
          setFieldErrors({ reasonCode: 'Could not load reason codes. Choose the status again to retry.' })
        }
      })
  }

  function validateEvidence() {
    if (!isTerminal) return {}
    const errors = {}
    if (!reasonCode) errors.reasonCode = `Select a ${evidenceLabel} reason code.`
    const trimmed = note.trim()
    if (!trimmed) errors.note = `Enter a ${evidenceLabel} note.`
    else if (trimmed.length < MIN_NOTE_LENGTH) errors.note = `The ${evidenceLabel} note must be at least ${MIN_NOTE_LENGTH} characters.`
    return errors
  }

  async function transition(event) {
    event.preventDefault()
    if (!nextStatus) return
    const errors = validateEvidence()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setMutation({ loading: true, error: null, message: '' })
    try {
      await api.transitionWorkOrder(
        id,
        { status: nextStatus, note: note.trim() || null, reasonCode: isTerminal ? reasonCode : null },
        data.workOrder.version,
      )
      changeNextStatus('')
      setNote('')
      setMutation({ loading: false, error: null, message: 'Work order status updated.' })
      await refetch()
    } catch (requestError) {
      // The API returns per-field messages with HTTP 400; show them next to the inputs.
      if (requestError.status === 400 && requestError.details?.errors) {
        setFieldErrors(requestError.details.errors)
        setMutation({ loading: false, error: null, message: '' })
      } else {
        setMutation({ loading: false, error: requestError, message: '' })
      }
    }
  }

  async function refreshAfterConflict() {
    setMutation({ loading: false, error: null, message: '' })
    changeNextStatus('')            // the allowed transitions may have changed
    await refetch()
  }

  if (loading && !data) return <LoadingState message="Loading work order…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const { workOrder, history } = data
  const allowedTransitions = transitions[workOrder.status] || []

  return (
    <div className="page-stack">
      <Link className="back-link" to="/work-orders">← Back to work orders</Link>
      <section className="detail-header">
        <div><div className="detail-meta"><span>{workOrder.referenceNumber}</span><StatusBadge status={workOrder.status} /><PriorityBadge priority={workOrder.priority} /></div><h1>{workOrder.title}</h1><p>{workOrder.site.customerName} · {workOrder.site.name}</p></div>
        <div className={`sla-card ${workOrder.sla?.overallState === 'BREACHED' ? 'overdue' : ''}`}><span>{workOrder.sla?.overallState === 'BREACHED' ? 'SLA breached' : 'Target resolution'}</span><strong>{formatDateTime(workOrder.targetResolutionAt, workOrder.sla?.timeZone || undefined)}</strong></div>
      </section>

      {mutation.error && isVersionConflict(mutation.error) && (
        <div className="inline-error conflict-banner" role="alert">
          <strong>This work order was updated by someone else.</strong>
          <span>Refresh to see the latest status and assignment, then re-apply your change.</span>
          <button type="button" className="button secondary" onClick={refreshAfterConflict}>
            Refresh
          </button>
        </div>
      )}
      {mutation.error && !isVersionConflict(mutation.error) && (
        <div className="inline-error"><strong>Update failed.</strong><span>{mutation.error.message}</span></div>
      )}
      {mutation.message && <div className="inline-success">✓ {mutation.message}</div>}

      <section className="detail-grid">
        <div className="detail-main">
          <SlaPanel sla={workOrder.sla} />
          <article className="panel detail-panel"><div className="panel-heading"><div><p className="kicker">Problem statement</p><h2>Service request</h2></div></div><p className="long-copy">{workOrder.description}</p><dl className="detail-list"><div><dt>Service site</dt><dd>{workOrder.site.name}<span>{workOrder.site.code} · {workOrder.site.city}</span></dd></div><div><dt>Affected asset</dt><dd>{workOrder.asset?.name || 'Site-level work'}<span>{workOrder.asset ? `${workOrder.asset.tag} · ${workOrder.asset.category}` : 'No specific asset selected'}</span></dd></div><div><dt>Created</dt><dd>{formatDateTime(workOrder.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDateTime(workOrder.updatedAt)}</dd></div></dl></article>

          <article className="panel detail-panel">
            <div className="panel-heading"><div><p className="kicker">Audit trail</p><h2>Status timeline</h2></div></div>
            <ol className="timeline">
              {history.map((entry) => (
                <li key={entry.id}>
                  <i />
                  <div>
                    <div><StatusBadge status={entry.toStatus} /><time>{formatDateTime(entry.changedAt)}</time></div>
                    <strong>{entry.fromStatus ? `${humanize(entry.fromStatus)} → ${humanize(entry.toStatus)}` : 'Work order created'}</strong>
                    {entry.reasonLabel && <p className="timeline-reason">Reason: {entry.reasonLabel}</p>}
                    <p>{entry.note || 'No transition note was recorded.'}</p>
                    <span>by {entry.changedByDisplayName}</span>
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </div>

        <aside className="detail-aside">
          {canAssign && (
            <form className="panel action-card" onSubmit={assign}><p className="kicker">Dispatch</p><h2>Technician assignment</h2><p>Current: <strong>{workOrder.assignedTechnician?.name || 'Unassigned'}</strong></p><label><span>Select technician</span><select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">Choose a technician</option>{technicians?.map((tech) => <option key={tech.id} value={tech.id}>{tech.label} · {tech.secondaryText}</option>)}</select></label><button className="button secondary full" disabled={!technicianId || mutation.loading}>Update assignment</button></form>
          )}
          {canTransition && (
            <form className="panel action-card" onSubmit={transition} noValidate>
              <p className="kicker">Workflow</p>
              <h2>Change status</h2>
              {allowedTransitions.length ? (
                <>
                  <label>
                    <span>Next status</span>
                    <select value={nextStatus} onChange={(event) => changeNextStatus(event.target.value)}>
                      <option value="">Select allowed transition</option>
                      {allowedTransitions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}
                    </select>
                  </label>

                  {isTerminal && (
                    <label>
                      <span>{evidenceTitle} reason *</span>
                      <select
                        value={reasonCode}
                        onChange={(event) => setReasonCode(event.target.value)}
                        aria-invalid={Boolean(fieldErrors.reasonCode)}
                        aria-describedby={fieldErrors.reasonCode ? 'reason-code-error' : undefined}
                      >
                        <option value="">Select a reason code</option>
                        {reasonOptions.map((option) => <option key={option.id} value={option.code}>{option.label}</option>)}
                      </select>
                      {fieldErrors.reasonCode && <small id="reason-code-error" className="field-error" role="alert">{fieldErrors.reasonCode}</small>}
                    </label>
                  )}

                  <label>
                    <span>{isTerminal ? `${evidenceTitle} note *` : 'Transition note'}</span>
                    <textarea
                      rows="4"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      aria-invalid={Boolean(fieldErrors.note)}
                      aria-describedby={fieldErrors.note ? 'note-error' : undefined}
                      placeholder={isTerminal ? `Describe the evidence (at least ${MIN_NOTE_LENGTH} characters)…` : 'Diagnostics, blockers, or progress…'}
                    />
                    {fieldErrors.note && <small id="note-error" className="field-error" role="alert">{fieldErrors.note}</small>}
                  </label>

                  <button className="button primary full" disabled={!nextStatus || mutation.loading}>Apply status</button>
                </>
              ) : (
                <p className="terminal-state">This work order is in a terminal state. Reopen support is planned in the backlog.</p>
              )}
            </form>
          )}
          {!canAssign && !canTransition && (
            <div className="panel action-card"><p className="kicker">Viewing only</p><p>Your account has read-only access to work orders.</p></div>
          )}
        </aside>
      </section>
    </div>
  )
}