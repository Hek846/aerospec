import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import './Navigation.css';

const navItems = [
  { label: 'Dashboard', path: '/', hint: 'Atmos overview' },
  { label: 'Devices', path: '/devices', hint: 'Hardware health' },
  { label: 'Map', path: '/map', hint: 'Live topology' },
  { label: 'Compare', path: '/compare', hint: 'Room analysis' },
  { label: 'Analytics', path: '/analytics', hint: 'Air statistics', icon: 'chart' },
  { label: 'Reports', path: '/reports', hint: 'Weekly digest' },
  { label: 'Alerts', path: '/alerts', hint: 'Thresholds' },
];

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 19V5M4 19h16M8 15l3-4 3 2 4-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const cycleTheme = () => {
    const themes = ['light', 'dark', 'auto'] as const;
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="navigation">
      <div className="nav-top">
        <Link to="/" className="nav-brand">
          <div className="nav-mark" aria-hidden>
            <span className="mark-dot" />
            <span className="mark-line" />
          </div>
          <div className="brand-copy">
            <span className="brand-kicker">AeroSpec Console</span>
            <span className="brand-title">Atmos</span>
          </div>
        </Link>

        <div className="nav-section">
          <p className="nav-section-label">Monitor</p>
          <div className="nav-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={isActive(item.path) ? 'nav-link active' : 'nav-link'}
              >
                <span className="nav-link-label">
                  {item.icon === 'chart' && <ChartIcon />}
                  {item.icon === 'chart' && ' '}
                  {item.label}
                </span>
                <span className="nav-link-hint">{item.hint}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="nav-footer">
        <button
          onClick={cycleTheme}
          className="theme-toggle"
          title={`Current: ${theme}`}
          aria-label={`Toggle theme. Current theme: ${theme}`}
        >
          <span className="toggle-indicator" data-mode={theme} />
          <span className="toggle-label">Theme: {theme}</span>
        </button>

        <div className="user-card">
          <div className="user-meta">
            <span className="user-hello">Operator</span>
            <span className="user-name">{user?.name || 'Guest'}</span>
            <span className="user-role">{user?.role || '—'}</span>
          </div>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
