'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [role, setRole] = useState('STUDENT');
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login');
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-card" onSubmit={handleLogin}>
        <h1>Planners Group</h1>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '2rem' }}>
          Management System Login
        </p>

        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--error)', color: 'white', borderRadius: '4px', marginBottom: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label>Select Role</label>
          <select 
            value={role} 
            onChange={(e) => setRole(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
          >
            <option value="SUPERADMIN">Super Admin</option>
            <option value="FACULTY">Faculty</option>
            <option value="STUDENT">Student</option>
            <option value="ACCOUNTANT">Accountant</option>
            <option value="CERT_STAFF">Certificate Staff</option>
          </select>
        </div>

        <div className="form-group">
          <label>Login ID</label>
          <input 
            type="text" 
            placeholder="Enter your ID" 
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            placeholder="Enter password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '1rem', padding: '1rem', fontSize: '1.1rem', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {role === 'STUDENT' && (
          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <Link href="/forgot-password" target="_blank" style={{ color: 'var(--primary)', fontWeight: '600' }}>Forgot Password?</Link>
          </p>
        )}
      </form>
    </div>
  );
}
