import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { to: '/dashboard', label: 'Operations overview', icon: '◫' },
  { to: '/work-orders', label: 'Work orders', icon: '≡' },
]

export default function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">CF</div>
          <div><strong>CareFlow</strong><span>Service Operations</span></div>
        </div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map((item) => (
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
          <div className="user-chip"><span>OP</span><div>Operations Planner<small>Day shift</small></div></div>
        </header>
        <div className="page-frame"><Outlet /></div>
      </main>
    </div>
  )
}

