export function LoadingState({ message = 'Loading operational data…' }) {
  return <div className="feedback"><span className="spinner" />{message}</div>
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="feedback error-state">
      <strong>We could not load this view.</strong>
      <span>{error?.message || 'Check that the API is running and try again.'}</span>
      {onRetry && <button className="button secondary" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function EmptyState({ title, message }) {
  return <div className="feedback empty-state"><strong>{title}</strong><span>{message}</span></div>
}

