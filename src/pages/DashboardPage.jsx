import { Link } from 'react-router-dom'
import { api } from '../api/apiClient.js'
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback.jsx'
import MetricCard from '../components/MetricCard.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { formatDateTime, humanize, isOverdue } from '../utils/formatters.js'

export default function DashboardPage() {
  const { data, loading, error, refetch } = useAsync(async () => {
    const [summary, recent] = await Promise.all([
      api.dashboard(),
      api.workOrders({ page: 0, size: 6, sortBy: 'createdAt', direction: 'DESC' }),
    ])
    return { summary, recent }
  }, [])

  if (loading && !data) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const { summary, recent } = data
  const statusTotal = Object.values(summary.statusBreakdown).reduce((sum, count) => sum + count, 0) || 1

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div><p className="kicker">Live portfolio</p><h1>Operations overview</h1><p>Monitor work demand, service risk, and dispatch readiness across customer sites.</p></div>
        <Link className="button primary" to="/work-orders/new"><span>＋</span> Raise work order</Link>
      </section>

      <section className="metric-grid" aria-label="Work order metrics">
        <MetricCard label="Open work orders" value={summary.openWorkOrders} note="Across all active sites" />
        <MetricCard label="Overdue SLA" value={summary.overdueWorkOrders} note="Requires planner attention" tone="danger" />
        <MetricCard label="Unassigned" value={summary.unassignedWorkOrders} note="Waiting for dispatch" tone="warn" />
        <MetricCard label="Critical priority" value={summary.criticalOpenWorkOrders} note="Open critical incidents" tone="danger" />
      </section>

      <section className="dashboard-grid">
        <article className="panel wide-panel">
          <div className="panel-heading"><div><p className="kicker">Priority queue</p><h2>Recent work orders</h2></div><Link to="/work-orders">View all <span>→</span></Link></div>
          {recent.content.length === 0 ? <EmptyState title="No work orders" message="Raise the first work order to begin tracking service demand." /> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Reference</th><th>Work</th><th>Priority</th><th>Status</th><th>SLA target</th></tr></thead>
                <tbody>
                  {recent.content.map((order) => (
                    <tr key={order.id}>
                      <td><Link className="reference-link" to={`/work-orders/${order.id}`}>{order.referenceNumber}</Link></td>
                      <td><strong className="cell-title">{order.title}</strong><span className="cell-subtitle">{order.site.name}</span></td>
                      <td><PriorityBadge priority={order.priority} /></td>
                      <td><StatusBadge status={order.status} /></td>
                      <td className={isOverdue(order) ? 'overdue-text' : ''}>{formatDateTime(order.targetResolutionAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="panel status-panel">
          <div className="panel-heading"><div><p className="kicker">Flow health</p><h2>Status mix</h2></div></div>
          <div className="status-distribution">
            {Object.entries(summary.statusBreakdown).map(([status, count]) => (
              <div className="distribution-row" key={status}>
                <div><span>{humanize(status)}</span><strong>{count}</strong></div>
                <div className="distribution-track"><i className={`bar-${status.toLowerCase()}`} style={{ width: `${Math.max((count / statusTotal) * 100, count ? 8 : 0)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="panel-note">Snapshot generated {formatDateTime(summary.generatedAt)}</p>
        </article>
      </section>
    </div>
  )
}

