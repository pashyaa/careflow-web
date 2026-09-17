import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

// Wraps any route tree that requires a signed-in user. Not signed in -> bounce to /login,
// remembering where they were headed so we can send them back after a successful login.
export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

// Wraps a piece of a page that requires one of a specific set of roles. Used for hiding
// controls the caller's role isn't allowed to use — the API enforces the real rule with
// @PreAuthorize either way, this is purely a UX convenience.
export function RequireRole({ roles, children, fallback = null }) {
  const { hasRole } = useAuth()
  return hasRole(...roles) ? children : fallback
}