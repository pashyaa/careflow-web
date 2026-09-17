import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ROLES, useAuth } from '../auth/AuthContext.jsx'

const navigation = [
  { to: '/dashboard', label: 'Operations overview', icon: '◫' },
  { to: '/work-orders', label: 'Work orders', icon: '≡' },
]

function initialsOf(email) {
  return (email || '?').charAt(0).toUpperCase()
}

function roleLabel(roles = []) {
  const label = roles[0]?.replace('ROLE_', '').replace('_', ' ') || 'User'
  return label.charAt(0) + label.slice(1).toLowerCase()
}

export default function AppShell() {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  // Dashboard is planner/admin-only on the API (@PreAuthorize on DashboardController) —
  // hide the nav link for roles that would just get a 403 clicking it.
  const canSeeDashboard = hasRole(ROLES.PLANNER, ROLES.ADMIN)
  const visibleNav = navigation.filter((item) => item.to !== '/dashboard' || canSeeDashboard)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CF</div>
          <div><strong>CareFlow</strong><span>Service Operations</span></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {visibleNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>{item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="environment-dot" /> Demo environment
          <small>Portfolio build · v0.1</small>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div><span className="eyebrow">Field service command centre</span></div>
          <div className="user-chip">
            <span>{initialsOf(user?.email)}</span>
            <div>{user?.email}<small>{roleLabel(user?.roles)}</small></div>
            <button type="button" className="text-button" onClick={handleLogout}>Sign out</button>
          </div>
        </header>
        <div className="page-frame"><Outlet /></div>
      </main>
    </div>
  )
}