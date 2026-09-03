import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LogIn, AlertCircle, Shield, UserCheck } from 'lucide-react';

export const LoginForm: React.FC = () => {
  const { login, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    clearError();

    if (!email.trim()) {
      setValidationError('Please enter your email address.');
      return;
    }

    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
    } catch {
      // Error handled by AuthContext
    }
  };

  const fillDemoAccount = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setValidationError(null);
    clearError();
  };

  const displayError = validationError || error;

  return (
    <div
      style={{
        maxWidth: '460px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              border: '1px solid rgba(59, 130, 246, 0.25)',
            }}
          >
            <Shield size={26} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
            System Sign In
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Enter your credentials to access the Spice Route restaurant management platform.
          </p>
        </div>

        {displayError && (
          <div
            role="alert"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.875rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{displayError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mail size={18} />
              </div>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="name@restaurant.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (displayError) clearError();
                }}
                disabled={isLoading}
                autoComplete="email"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor="password"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: 'var(--text-primary)',
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '0.875rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={18} />
              </div>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (displayError) clearError();
                }}
                disabled={isLoading}
                autoComplete="current-password"
                required
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.9375rem',
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem',
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            Quick Fill Demo Credentials
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
            <button
              type="button"
              onClick={() => fillDemoAccount('manager@restaurant.com', 'ManagerPassword123!')}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={16} color="var(--primary)" />
                <strong>Manager (Rajesh Sharma):</strong> manager@restaurant.com
              </span>
              <span className="badge badge-manager">Manager</span>
            </button>

            <button
              type="button"
              onClick={() => fillDemoAccount('waiter@restaurant.com', 'WaiterPassword123!')}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.625rem 0.875rem',
                fontSize: '0.8125rem',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={16} color="var(--success)" />
                <strong>Waiter (Arjun Kumar):</strong> waiter@restaurant.com
              </span>
              <span className="badge badge-waiter">Waiter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
