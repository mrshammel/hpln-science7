'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function TeacherVerifyPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/teacher-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code }),
      });

      const data = await res.json();

      if (res.ok) {
        // Force session refresh then redirect
        // NextAuth caches JWT, so we need a full page reload to pick up the new role
        window.location.href = '/dashboard';
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👩‍🏫</div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px' }}>
            Teacher Verification
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
            Enter your teacher access code to unlock the teacher dashboard.
            <br />
            Contact your administrator if you don&apos;t have a code.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label
              htmlFor="accessCode"
              style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}
            >
              Access Code
            </label>
            <input
              id="accessCode"
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your teacher access code"
              required
              autoFocus
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '0.92rem',
                border: '1.5px solid #e2e8f0',
                borderRadius: 10,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: '0.82rem',
              color: '#dc2626',
              fontWeight: 500,
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{
              padding: '12px 20px',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#fff',
              background: loading ? '#94a3b8' : '#2563eb',
              border: 'none',
              borderRadius: 10,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Verifying...' : '🔐 Verify & Access Teacher Dashboard'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a
            href="/dashboard"
            style={{ fontSize: '0.82rem', color: '#94a3b8', textDecoration: 'none' }}
          >
            ← Back to Dashboard
          </a>
        </div>

        <div style={{ marginTop: 20, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
            Signed in as <strong style={{ color: '#475569' }}>{session?.user?.name || session?.user?.email}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #fefce8 100%)',
  padding: 20,
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: '#fff',
  borderRadius: 16,
  padding: '32px 28px',
  boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
};
