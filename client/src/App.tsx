import React from 'react';
import { Layout } from './components/Layout';
import { HealthStatus } from './components/HealthStatus';

export const App: React.FC = () => {
  return (
    <Layout>
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
            Restaurant Orders Core
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            Robust table-to-kitchen management system. Foundation established and ready for incremental phase implementation.
          </p>
        </div>

        <HealthStatus />
      </div>
    </Layout>
  );
};

export default App;
