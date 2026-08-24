import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/apiClient.js'
import { ErrorState, LoadingState } from '../components/Feedback.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { formatDateTime, humanize, isOverdue } from '../utils/formatters.js'

const transitions = {
  NEW: ['CANCELLED'],
  ASSIGNED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['ON_HOLD', 'RESOLVED'],
  ON_HOLD: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: [],
  CANCELLED: [],
}

export default function WorkOrderDetailPage() {
  const { id } = useParams()
  const { data, loading, error, refetch } = useAsync(async () => {
    const [workOrder, history] = await Promise.all([api.workOrder(id), api.workOrderHistory(id)])
    return { workOrder, history }
  }, [id])
  const { data: technicians } = useAsync(api.technicians, [])
  const [technicianId, setTechnicianId] = useState('')
  const [nextStatus, setNextStatus] = useState('')
  const [note, setNote] = useState('')
  const [mutation, setMutation] = useState({ loading: false, error: null, message: '' })

  async function assign(event) {
    event.preventDefault()
    if (!technicianId) return
    setMutation({ loading: true, error: null, message: '' })
    try {
      await api.assignTechnician(id, { technicianId, changedBy: 'Operations Planner' })
      setMutation({ loading: false, error: null, message: 'Technician assignment updated.' })
      await refetch()
    } catch (requestError) {
      setMutation({ loading: false, error: requestError, message: '' })
    }
  }

  async function transition(event) {
    event.preventDefault()
    if (!nextStatus) return
    setMutation({ loading: true, error: null, message: '' })
    try {
      await api.transitionWorkOrder(id, { status: nextStatus, note, changedBy: 'Operations Planner' })
      setNextStatus('')
      setNote('')
      setMutation({ loading: false, error: null, message: 'Work order status updated.' })
      await refetch()
    } catch (requestError) {
      setMutation({ loading: false, error: requestError, message: '' })
    }
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
        <div className={`sla-card ${isOverdue(workOrder) ? 'overdue' : ''}`}><span>{isOverdue(workOrder) ? 'SLA overdue' : 'Target resolution'}</span><strong>{formatDateTime(workOrder.targetResolutionAt)}</strong></div>
      </section>

      {mutation.error && <div className="inline-error"><strong>Update failed.</strong><span>{mutation.error.message}</span></div>}
      {mutation.message && <div className="inline-success">✓ {mutation.message}</div>}

      <section className="detail-grid">
        <div className="detail-main">
          <article className="panel detail-panel"><div className="panel-heading"><div><p className="kicker">Problem statement</p><h2>Service request</h2></div></div><p className="long-copy">{workOrder.description}</p><dl className="detail-list"><div><dt>Service site</dt><dd>{workOrder.site.name}<span>{workOrder.site.code} · {workOrder.site.city}</span></dd></div><div><dt>Affected asset</dt><dd>{workOrder.asset?.name || 'Site-level work'}<span>{workOrder.asset ? `${workOrder.asset.tag} · ${workOrder.asset.category}` : 'No specific asset selected'}</span></dd></div><div><dt>Created</dt><dd>{formatDateTime(workOrder.createdAt)}</dd></div><div><dt>Last updated</dt><dd>{formatDateTime(workOrder.updatedAt)}</dd></div></dl></article>

          <article className="panel detail-panel"><div className="panel-heading"><div><p className="kicker">Audit trail</p><h2>Status timeline</h2></div></div><ol className="timeline">{history.map((entry) => <li key={entry.id}><i /><div><div><StatusBadge status={entry.toStatus} /><time>{formatDateTime(entry.changedAt)}</time></div><strong>{entry.fromStatus ? `${humanize(entry.fromStatus)} → ${humanize(entry.toStatus)}` : 'Work order created'}</strong><p>{entry.note || 'No transition note was recorded.'}</p><span>by {entry.changedBy}</span></div></li>)}</ol></article>
        </div>

        <aside className="detail-aside">
          <form className="panel action-card" onSubmit={assign}><p className="kicker">Dispatch</p><h2>Technician assignment</h2><p>Current: <strong>{workOrder.assignedTechnician?.name || 'Unassigned'}</strong></p><label><span>Select technician</span><select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}><option value="">Choose a technician</option>{technicians?.map((tech) => <option key={tech.id} value={tech.id}>{tech.label} · {tech.secondaryText}</option>)}</select></label><button className="button secondary full" disabled={!technicianId || mutation.loading}>Update assignment</button></form>

          <form className="panel action-card" onSubmit={transition}><p className="kicker">Workflow</p><h2>Change status</h2>{allowedTransitions.length ? <><label><span>Next status</span><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}><option value="">Select allowed transition</option>{allowedTransitions.map((status) => <option key={status} value={status}>{humanize(status)}</option>)}</select></label><label><span>Transition note</span><textarea rows="4" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Diagnostics, blockers, or resolution evidence…" /></label><button className="button primary full" disabled={!nextStatus || mutation.loading}>Apply status</button></> : <p className="terminal-state">This work order is in a terminal state. Reopen support is planned in the backlog.</p>}</form>
        </aside>
      </section>
    </div>
  )
}

