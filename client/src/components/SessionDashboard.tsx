import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { testRbacEndpoint } from '../services/api';
import { Shield, CheckCircle2, XCircle, Terminal, Sparkles } from 'lucide-react';

interface RbacTestResult {
  endpoint: string;
  status: number;
  ok: boolean;
  timestamp: string;
  body: unknown;
}

export const SessionDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [testingEndpoint, setTestingEndpoint] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<RbacTestResult | null>(null);

  if (!user || !token) return null;

  const handleTestRbac = async (endpoint: 'manager-only' | 'waiter-only' | 'staff-only') => {
    setTestingEndpoint(endpoint);
    try {
      const res = await testRbacEndpoint(endpoint, token);
      setLastResult({
        endpoint: `/api/test-rbac/${endpoint}`,
        status: res.status,
        ok: res.ok,
        timestamp: new Date().toLocaleTimeString(),
        body: res.body,
      });
    } catch (err) {
      setLastResult({
        endpoint: `/api/test-rbac/${endpoint}`,
        status: 500,
        ok: false,
        timestamp: new Date().toLocaleTimeString(),
        body: { error: err instanceof Error ? err.message : 'Network error' },
      });
    } finally {
      setTestingEndpoint(null);
    }
  };

  const isManager = user.role === 'manager';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            background: isManager ? 'rgba(168, 85, 247, 0.08)' : 'rgba(59, 130, 246, 0.08)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span className={`badge badge-${user.role}`} style={{ fontSize: '0.8125rem', padding: '0.25rem 0.75rem' }}>
                {user.role.toUpperCase()}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Authenticated Server Session
              </span>
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
              Welcome back, {user.name}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', maxWidth: '640px' }}>
              Your session is verified with server-side JSON Web Tokens. Access permissions are strictly enforced on the API for every request.
            </p>
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              minWidth: '220px',
            }}
          >
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Account Identity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem' }}>
              <div><strong>Email:</strong> {user.email}</div>
              <div><strong>Role:</strong> {user.role}</div>
              <div><strong>User ID:</strong> <code style={{ fontSize: '0.75rem' }}>{user.id.substring(0, 13)}...</code></div>
            </div>
          </div>
        </div>
      </div>

      {/* Server-Side RBAC Verification Tool */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0 }}>
              Live Server-Side RBAC Verification
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
              Trigger server-side protected endpoints to verify authorization behavior directly from the API.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Test Manager Endpoint */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Manager Endpoint</span>
                <span className="badge badge-manager">Manager Only</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                <code>GET /api/test-rbac/manager-only</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestRbac('manager-only')}
              disabled={testingEndpoint !== null}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              {testingEndpoint === 'manager-only' ? 'Testing...' : 'Execute Request'}
            </button>
          </div>

          {/* Test Waiter Endpoint */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Waiter Endpoint</span>
                <span className="badge badge-waiter">Waiter Only</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                <code>GET /api/test-rbac/waiter-only</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestRbac('waiter-only')}
              disabled={testingEndpoint !== null}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              {testingEndpoint === 'waiter-only' ? 'Testing...' : 'Execute Request'}
            </button>
          </div>

          {/* Test Staff Endpoint */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              backgroundColor: 'var(--bg-tertiary)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Staff Endpoint</span>
                <span className="badge badge-info">Manager | Waiter</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                <code>GET /api/test-rbac/staff-only</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleTestRbac('staff-only')}
              disabled={testingEndpoint !== null}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.8125rem' }}
            >
              {testingEndpoint === 'staff-only' ? 'Testing...' : 'Execute Request'}
            </button>
          </div>
        </div>

        {/* Live Response Inspector */}
        {lastResult && (
          <div
            style={{
              marginTop: '1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(5, 8, 16, 0.95)',
              border: `1px solid ${lastResult.ok ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              padding: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={16} color="var(--text-muted)" />
                <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {lastResult.endpoint}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    backgroundColor: lastResult.ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: lastResult.ok ? '#4ade80' : '#f87171',
                  }}
                >
                  {lastResult.ok ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                  HTTP {lastResult.status} {lastResult.ok ? 'OK (Authorized)' : lastResult.status === 403 ? 'FORBIDDEN (Denied)' : 'UNAUTHORIZED'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {lastResult.timestamp}
                </span>
              </div>
            </div>

            <pre
              style={{
                margin: 0,
                padding: '0.75rem',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#e2e8f0',
                overflowX: 'auto',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(lastResult.body, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Ready for Next Phase Card */}
      <div
        className="card"
        style={{
          border: '1px dashed var(--border-glass)',
          background: 'rgba(15, 23, 42, 0.4)',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
          <Sparkles size={18} />
          <strong style={{ fontSize: '0.9375rem' }}>Phase 2 Authentication & RBAC Complete</strong>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', maxWidth: '600px', margin: '0 auto' }}>
          Authentication state, PostgreSQL persistence schemas, password hashing, and server-side RBAC middleware are active. Ready for next phases (menu management, orders lifecycle, etc.).
        </p>
      </div>
    </div>
  );
};
