import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <div className="not-found"><span>404</span><h1>That operations view is not available.</h1><p>The route may have changed or the work order may no longer be accessible.</p><Link className="button primary" to="/dashboard">Return to overview</Link></div>
}
