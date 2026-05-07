import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    console.log('STEP 1: handler fired');
    console.log('ENV:', import.meta.env.VITE_API_URL);

    setError('');
    setLoading(true);

    try {
      console.log('STEP 2: preparing request');

      const url = `${import.meta.env.VITE_API_URL}/auth/login`;
      console.log('API URL:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('STEP 3: response received', res.status);

      const data = await res.json();
      console.log('STEP 4: parsed data', data);

      if (!res.ok) {
        throw new Error(data.error || `Login failed (${res.status})`);
      }

      const token = data?.token || data?.accessToken || data?.jwt;
      if (!token) throw new Error('No token returned from server');

      console.log('STEP 5: token stored');

      login(token, data.user);
      // App.jsx ProtectedRoute redirects to /dashboard once user is set
    } catch (err) {
      console.error('LOGIN ERROR:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">LoadVault</div>
        <h1 className="auth-title">Sign in to your account</h1>

        {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
