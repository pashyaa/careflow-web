import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from '../api/apiClient.js'
import { ErrorState, LoadingState } from '../components/Feedback.jsx'
import { useAsync } from '../hooks/useAsync.js'
import { ROLES, useAuth } from '../auth/AuthContext.jsx'

function defaultTarget() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

export default function CreateWorkOrderPage() {
  const navigate = useNavigate()
  const { data: sites, loading, error, refetch } = useAsync(api.sites, [])
      if (!hasRole(ROLES.PLANNER, ROLES.ADMIN)) {
    return <Navigate to="/work-orders" replace />
  }
  const [assets, setAssets] = useState([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', siteId: '', assetId: '', targetResolutionAt: defaultTarget() })
  const { hasRole } = useAuth()

  function change(event) {
    const { name, value } = event.target
    if (name === 'siteId') {
      setForm((current) => ({ ...current, siteId: value, assetId: '' }))
      setAssets([])
      if (value) {
        setAssetsLoading(true)
        api.assets(value).then(setAssets).catch(setSubmitError).finally(() => setAssetsLoading(false))
      }
      return
    }
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await api.createWorkOrder({
        ...form,
        assetId: form.assetId || null,
        targetResolutionAt: new Date(form.targetResolutionAt).toISOString(),
      })
      navigate(`/work-orders/${created.id}`, { replace: true })
    } catch (requestError) {
      setSubmitError(requestError)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState message="Loading service locations…" />
  if (error) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div className="page-stack narrow-page">
      <section className="page-heading">
        <div><p className="kicker">New request</p><h1>Raise a work order</h1><p>Capture a clear problem statement, service context, priority, and target resolution time.</p></div>
        <Link className="button secondary" to="/work-orders">Cancel</Link>
      </section>

      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-section"><span className="section-number">01</span><div><h2>Service context</h2><p>Choose the customer site and, when applicable, the affected asset.</p></div></div>
        <div className="form-grid two-columns">
          <label><span>Service site *</span><select name="siteId" value={form.siteId} onChange={change} required><option value="">Select a site</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.label} · {site.secondaryText}</option>)}</select></label>
          <label><span>Affected asset</span><select name="assetId" value={form.assetId} onChange={change} disabled={!form.siteId || assetsLoading}><option value="">Site-level work / no asset</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.code} · {asset.label}</option>)}</select><small>{assetsLoading ? 'Loading assets…' : 'Optional for general site work'}</small></label>
        </div>

        <div className="form-divider" />
        <div className="form-section"><span className="section-number">02</span><div><h2>Problem and service target</h2><p>Write enough detail for a technician to begin diagnosis without a clarification call.</p></div></div>
        <div className="form-grid">
          <label><span>Work order title *</span><input name="title" value={form.title} onChange={change} maxLength="180" required placeholder="Example: Chiller pressure alarm during peak load" /></label>
          <label><span>Description *</span><textarea name="description" value={form.description} onChange={change} maxLength="4000" rows="7" required placeholder="Observed symptoms, business impact, recent changes, safety conditions, and any diagnostic evidence…" /></label>
          <div className="form-grid two-columns">
            <label><span>Priority *</span><select name="priority" value={form.priority} onChange={change} required>{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((priority) => <option key={priority}>{priority}</option>)}</select></label>
            <label><span>Target resolution *</span><input name="targetResolutionAt" type="datetime-local" value={form.targetResolutionAt} onChange={change} required /></label>
          </div>
        </div>

        {submitError && <div className="inline-error"><strong>Work order was not created.</strong><span>{submitError.message}</span></div>}
        <div className="form-actions"><Link className="text-button" to="/work-orders">Discard draft</Link><button className="button primary" disabled={submitting}>{submitting ? 'Creating…' : 'Create work order'}</button></div>
      </form>
    </div>
  )
}
