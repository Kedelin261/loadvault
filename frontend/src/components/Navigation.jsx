import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Truck, Upload, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/companies',  label: 'Companies',  Icon: Building2 },
  { to: '/loads',      label: 'Loads',      Icon: Truck },
  { to: '/upload',     label: 'Upload',     Icon: Upload },
  { to: '/settings',   label: 'Settings',   Icon: Settings },
];

function NavItems() {
  return navItems.map(({ to, label, Icon }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  ));
}

export function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-name">Load<span>Vault</span></div>
        <div className="sidebar-brand-sub">Dispatch CRM</div>
      </div>
      <NavItems />
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-name">{user.name || user.email}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
        )}
        <button className="sidebar-logout" onClick={logout} title="Sign out">
          <LogOut size={15} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavItems />
    </nav>
  );
}
