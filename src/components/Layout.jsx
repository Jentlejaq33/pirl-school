import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { MODULES, visibleModules } from '../config'

export default function Layout() {
  const { school, profile, role, signOut } = useAuth()
  const tier = school?.tier || 'starter'
  const items = visibleModules(tier, role)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          {school?.logo_url
            ? <img src={school.logo_url} alt="" className="brand-logo" />
            : <div className="brand-glyph">{(school?.name || 'P')[0]}</div>}
          <div>
            <div className="brand-name">{school?.name || 'School'}</div>
            <div className="brand-tier">{tier} plan</div>
          </div>
        </div>
        <nav>
          {items.map((key) => (
            <NavLink key={key} to={MODULES[key].path} end={MODULES[key].path === '/'}
              className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {MODULES[key].label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{profile?.full_name}<span>{role}</span></div>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}
