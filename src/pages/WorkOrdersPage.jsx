import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/apiClient.js'
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { formatDateTime, isOverdue } from '../utils/formatters.js'

const initialFilters = { query: '', status: '', priority: '', page: 0, size: 10, sortBy: 'createdAt', direction: 'DESC' }

export default function WorkOrdersPage() {
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const { data, loading, error, refetch } = useAsync(() => api.workOrders(appliedFilters), [appliedFilters])

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function applyFilters(event) {
    event.preventDefault()
    setAppliedFilters({ ...filters, page: 0 })
  }

  function clearFilters() {
    setFilters(initialFilters)
    setAppliedFilters(initialFilters)
  }

  function changePage(page) {
    const next = { ...appliedFilters, page }
    setAppliedFilters(next)
    setFilters(next)
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="kicker">Service demand</p><h1>Work orders</h1><p>Search, triage, assign, and progress operational work across the service portfolio.</p></div>
        <Link className="button primary" to="/work-orders/new"><span>＋</span> Raise work order</Link>
      </section>

      <form className="filter-bar" onSubmit={applyFilters}>
        <label className="search-field"><span>⌕</span><input name="query" value={filters.query} onChange={updateFilter} placeholder="Search reference, title or detail" /></label>
        <label><span>Status</span><select name="status" value={filters.status} onChange={updateFilter}><option value="">All statuses</option>{['NEW', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></label>
        <label><span>Priority</span><select name="priority" value={filters.priority} onChange={updateFilter}><option value="">All priorities</option>{['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
        <button className="button secondary" type="submit">Apply</button>
        <button className="text-button" type="button" onClick={clearFilters}>Clear</button>
      </form>

      <section className="panel work-orders-panel">
        <div className="panel-heading"><div><p className="kicker">Queue</p><h2>{data ? `${data.totalElements} work orders` : 'Work orders'}</h2></div>{loading && <span className="inline-loading">Refreshing…</span>}</div>
        {loading && !data && <LoadingState />}
        {error && <ErrorState error={error} onRetry={refetch} />}
        {data && data.content.length === 0 && <EmptyState title="No matching work orders" message="Change the filters or raise a new work order." />}
        {data && data.content.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Reference</th><th>Work order</th><th>Site / asset</th><th>Priority</th><th>Status</th><th>Assigned to</th><th>SLA target</th><th /></tr></thead>
                <tbody>
                  {data.content.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="reference-link" to={`/work-orders/${order.id}`}>{order.referenceNumber}</Link></td>
                      <td><strong className="cell-title">{order.title}</strong><span className="cell-subtitle clamp">{order.description}</span></td>
                      <td><strong className="cell-title">{order.site.name}</strong><span className="cell-subtitle">{order.asset?.tag || 'Site-level work'}</span></td>
                      <td><PriorityBadge priority={order.priority} /></td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>{order.assignedTechnician?.name || <span className="muted">Unassigned</span>}</td>
                      <td className={isOverdue(order) ? 'overdue-text' : ''}>{formatDateTime(order.targetResolutionAt)}{isOverdue(order) && <span className="cell-subtitle">Overdue</span>}</td>
                      <td><Link className="row-action" to={`/work-orders/${order.id}`} aria-label={`Open ${order.referenceNumber}`}>→</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>Page {data.page + 1} of {Math.max(data.totalPages, 1)}</span>
              <div><button className="button secondary compact" disabled={data.first} onClick={() => changePage(data.page - 1)}>Previous</button><button className="button secondary compact" disabled={data.last} onClick={() => changePage(data.page + 1)}>Next</button></div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

