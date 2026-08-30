import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { SessionDashboard } from './components/SessionDashboard';
import { HealthStatus } from './components/HealthStatus';

const MainContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <div className="pulse-dot pulse-dot-amber" style={{ width: '16px', height: '16px', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
          Verifying session status...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {!isAuthenticated ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                marginBottom: '0.5rem',
              }}
            >
              Restaurant Orders Platform
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Phase 2: Authentication & Server-Side Role-Based Access Control
            </p>
          </div>

          <LoginForm />
        </div>
      ) : (
        <SessionDashboard />
      )}

      {/* Database and System Health Status */}
      <div style={{ marginTop: '1rem' }}>
        <HealthStatus />
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Layout>
        <MainContent />
      </Layout>
    </AuthProvider>
  );
};

export default App;
