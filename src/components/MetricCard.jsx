export default function MetricCard({ label, value, note, tone = 'neutral' }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <div className="metric-icon" aria-hidden="true">{tone === 'danger' ? '!' : tone === 'warn' ? '↗' : '•'}</div>
      <p>{label}</p>
      <strong>{value ?? '—'}</strong>
      <span>{note}</span>
    </article>
  )
}

