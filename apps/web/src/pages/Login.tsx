import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick login buttons for demo users
  const quickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('demo'); // Demo password
    setError('');
    setIsLoading(true);

    try {
      await login(userEmail, 'demo');
      navigate('/');
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-aside">
        <div className="auth-pattern" aria-hidden />
        <div className="auth-copy">
          <div className="auth-logo">
            <span className="logo-ring" />
            <span className="logo-type">AeroSpec</span>
          </div>
          <h1>Air intelligence for calm, breathable spaces.</h1>
          <p>
            Monitor live AQI, surface actionable alerts, and export weekly insights across every room.
            Built for operators who want clarity without the clutter.
          </p>
          <div className="auth-highlights">
            <div className="highlight">
              <span className="highlight-dot" />
              <div>
                <p className="highlight-label">Live link</p>
                <p className="highlight-value">99.9% uptime</p>
              </div>
            </div>
            <div className="highlight">
              <span className="highlight-dot alt" />
              <div>
                <p className="highlight-label">AQI targets</p>
                <p className="highlight-value">Set &amp; forget thresholds</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <p className="eyebrow">Sign in</p>
          <h2>Welcome back</h2>
          <p className="hint">Use your credentials or jump in with a demo identity.</p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </label>

          <button type="submit" disabled={isLoading} className="auth-submit">
            {isLoading ? 'Signing in…' : 'Enter console'}
          </button>
        </form>

        <div className="quick-login">
          <p className="hint">Quick login as demo user</p>
          <div className="quick-actions">
            <button onClick={() => quickLogin('alice@example.com')} disabled={isLoading}>
              <div className="quick-title">Alice (Owner)</div>
              <div className="quick-sub">alice@example.com</div>
            </button>
            <button onClick={() => quickLogin('bob@example.com')} disabled={isLoading}>
              <div className="quick-title">Bob (Standard)</div>
              <div className="quick-sub">bob@example.com</div>
            </button>
            <button onClick={() => quickLogin('carol@example.com')} disabled={isLoading}>
              <div className="quick-title">Carol (Admin)</div>
              <div className="quick-sub">carol@example.com</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
