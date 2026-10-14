import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../api/apiClient.js'
import { ROLES, useAuth } from '../auth/AuthContext.jsx'
import { EmptyState, ErrorState, LoadingState } from '../components/Feedback.jsx'
import PriorityBadge from '../components/PriorityBadge.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { formatMinutes } from '../utils/formatters.js'

const EMPTY_FORM = {
  name: '', siteId: '', category: '', priority: '',
  responseMinutes: 60, resolutionMinutes: 480, businessHoursOnly: false,
}

export default function SlaPoliciesPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole(ROLES.ADMIN)
  const { data, loading, error, refetch } = useAsync(async () => {
    const [policies, sites] = await Promise.all([api.slaPolicies(), api.sites()])
    return { policies, sites }
  }, [])
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  if (!hasRole(ROLES.PLANNER, ROLES.ADMIN)) {
    return <Navigate to="/work-orders" replace />
  }

  function change(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setSaveError(null)
    try {
      await api.createSlaPolicy({
        ...form,
        siteId: form.siteId || null,
        category: form.category.trim() || null,
        priority: form.priority || null,
        responseMinutes: Number(form.responseMinutes),
        resolutionMinutes: Number(form.resolutionMinutes),
      })
      setForm(EMPTY_FORM)
      await refetch()
    } catch (requestError) {
      setSaveError(requestError)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(policy) {
    setSaveError(null)
    try {
      await api.updateSlaPolicy(policy.id, {
        name: policy.name, siteId: policy.siteId, category: policy.category, priority: policy.priority,
        responseMinutes: policy.responseMinutes, resolutionMinutes: policy.resolutionMinutes,
        businessHoursOnly: policy.businessHoursOnly, active: !policy.active,
      })
      await refetch()
    } catch (requestError) {
      setSaveError(requestError)
    }
  }

  if (loading && !data) return <LoadingState message="Loading SLA policies…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  const { policies, sites } = data
  const siteName = (id) => (id ? sites.find((site) => site.id === id)?.label || 'Unknown site' : 'All sites')

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="kicker">Service levels</p>
          <h1>SLA policies</h1>
          <p>When several active policies match a work order, the most specific wins: site first, then asset category, then priority, then the tenant fallback. Changing a policy only affects work orders raised afterwards.</p>
        </div>
      </section>

      {saveError && <div className="inline-error"><strong>Policy was not saved.</strong><span>{saveError.message}</span></div>}

      <article className="panel">
        {policies.length === 0 ? <EmptyState title="No policies" message="Work orders cannot be raised until at least one active policy exists." /> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Policy</th><th>Applies to</th><th>Response</th><th>Resolution</th><th>Clock</th><th>Status</th>{canManage && <th />}</tr></thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id}>
                    <td><strong className="cell-title">{policy.name}</strong></td>
                    <td>
                      <span className="cell-subtitle">{siteName(policy.siteId)} · {policy.category || 'Any category'}</span>
                      {policy.priority ? <PriorityBadge priority={policy.priority} /> : <span className="cell-subtitle">Any priority</span>}
                    </td>
                    <td>{formatMinutes(policy.responseMinutes)}</td>
                    <td>{formatMinutes(policy.resolutionMinutes)}</td>
                    <td>{policy.businessHoursOnly ? 'Business hours' : '24×7'}</td>
                    <td>{policy.active ? 'Active' : 'Inactive'}</td>
                    {canManage && <td><button type="button" className="text-button" onClick={() => toggleActive(policy)}>{policy.active ? 'Deactivate' : 'Activate'}</button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {canManage && (
        <form className="panel form-panel" onSubmit={submit}>
          <div className="form-section"><span className="section-number">＋</span><div><h2>New policy</h2><p>Leave site, category or priority empty for the policy to apply to any. Only one active policy may exist per combination.</p></div></div>
          <div className="form-grid">
            <label><span>Name *</span><input name="name" value={form.name} onChange={change} maxLength="120" required placeholder="Example: Hyderabad campus - critical" /></label>
            <div className="form-grid two-columns">
              <label><span>Service site</span><select name="siteId" value={form.siteId} onChange={change}><option value="">All sites</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
              <label><span>Asset category</span><input name="category" value={form.category} onChange={change} maxLength="80" placeholder="Any category (e.g. HVAC)" /></label>
              <label><span>Priority</span><select name="priority" value={form.priority} onChange={change}><option value="">Any priority</option>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
              <label className="checkbox-row"><input type="checkbox" name="businessHoursOnly" checked={form.businessHoursOnly} onChange={change} /><span>Count business hours only</span></label>
              <label><span>Response within (minutes) *</span><input name="responseMinutes" type="number" min="1" max="129600" value={form.responseMinutes} onChange={change} required /></label>
              <label><span>Resolution within (minutes) *</span><input name="resolutionMinutes" type="number" min="1" max="129600" value={form.resolutionMinutes} onChange={change} required /></label>
            </div>
          </div>
          <div className="form-actions"><button className="button primary" disabled={saving}>{saving ? 'Saving…' : 'Create policy'}</button></div>
        </form>
      )}
    </div>
  )
}