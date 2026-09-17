import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // Already signed in and somehow landed on /login (e.g. back button) -> just go in.
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      const redirectTo = location.state?.from?.pathname || '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (requestError) {
      // The API returns the same generic message for wrong password, unknown email, and
      // disabled account — deliberately, so this UI never has to (and never should) guess
      // which one it was.
      setError(requestError.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <form className="panel auth-card" onSubmit={handleSubmit}>
        <div className="brand auth-brand">
          <div className="brand-mark">CF</div>
          <div><strong>CareFlow</strong><span>Service Operations</span></div>
        </div>

        <p className="kicker">Sign in</p>
        <h1>Welcome back</h1>
        <p className="auth-subtitle">Sign in with your CareFlow account to continue.</p>

        {error && <div className="inline-error"><strong>Sign-in failed.</strong><span>{error}</span></div>}

        <label>
          <span>Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@careflow.local"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </label>

        <button className="button primary full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}