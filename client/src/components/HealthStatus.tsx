import React, { useEffect, useState } from 'react';
import { Activity, Database, Server, Clock, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { config } from '../config/env';

interface HealthData {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  database?: {
    connected: boolean;
    latencyMs?: number;
    error?: string;
  };
}

export const HealthStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${config.apiBaseUrl}/health`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} (${res.statusText})`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach API server');
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="glass-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '0.625rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent-primary)',
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System Foundation Status</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Phase 1 Core Infrastructure Check
            </p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 0.85rem', fontSize: '0.8125rem' }}
          disabled={loading}
          aria-label="Refresh Status"
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && !health && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)' }}>
          <p>Connecting to backend API...</p>
        </div>
      )}

      {error && (
        <div
          style={{
            background: 'var(--alert-bg)',
            border: '1px solid var(--alert-border)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} color="var(--status-cancelled)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--alert-text)', fontSize: '0.875rem' }}>
              API Connection Error
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.25rem' }}>
              {error}
            </div>
          </div>
        </div>
      )}

      {health && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Status Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: health.status === 'healthy' ? 'var(--success-bg)' : 'var(--alert-bg)',
              border: `1px solid ${health.status === 'healthy' ? 'var(--success-border)' : 'var(--alert-border)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span
                className={`pulse-dot ${health.status === 'healthy' ? 'pulse-dot-green' : 'pulse-dot-amber'}`}
              />
              <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                Backend Status: {health.status.toUpperCase()}
              </span>
            </div>
            <span
              className={`badge ${health.status === 'healthy' ? 'badge-success' : 'badge-alert'}`}
            >
              v{health.version}
            </span>
          </div>

          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <Server size={14} />
                <span>ENVIRONMENT</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', textTransform: 'capitalize' }}>
                {health.environment}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <Clock size={14} />
                <span>UPTIME</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                {health.uptimeSeconds}s
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-tertiary)',
                padding: '0.875rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <Database size={14} />
                <span>DATABASE</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, fontSize: '0.9375rem' }}>
                {health.database?.connected ? (
                  <>
                    <CheckCircle2 size={14} color="var(--status-ready)" />
                    <span style={{ color: 'var(--status-ready)' }}>Connected</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} color="var(--status-placed)" />
                    <span style={{ color: 'var(--status-placed)', fontSize: '0.8125rem' }}>Standby</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
