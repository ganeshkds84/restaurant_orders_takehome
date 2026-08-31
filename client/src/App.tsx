import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginForm } from './components/LoginForm';
import { SessionDashboard } from './components/SessionDashboard';
import { MenuManagement } from './components/MenuManagement';
import { OrderCreation } from './components/OrderCreation';
import { OrderList } from './components/OrderList';
import { HealthStatus } from './components/HealthStatus';
import { UtensilsCrossed, ShieldCheck, ShoppingBag, Receipt } from 'lucide-react';

const MainContent: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'menu' | 'create-order' | 'orders' | 'rbac'>('menu');

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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
              Phase 4: Order Creation, Lines & Historical Price Snapshots
            </p>
          </div>

          <LoginForm />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Welcome greeting banner */}
          <div
            className="glass-card"
            style={{
              padding: '1.25rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Welcome back, {user?.name}
              </h2>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Signed in as <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong> with active{' '}
                <span className={`badge badge-${user?.role}`}>{user?.role?.toUpperCase()}</span> permissions.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '0.5rem',
              overflowX: 'auto',
            }}
          >
            <button
              id="tab-create-order"
              data-testid="tab-create-order"
              onClick={() => setActiveTab('create-order')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: activeTab === 'create-order' ? 600 : 400,
                backgroundColor: activeTab === 'create-order' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'create-order' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === 'create-order' ? '1px solid var(--border-focus)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <ShoppingBag size={18} color={activeTab === 'create-order' ? 'var(--accent-primary)' : 'currentColor'} />
              <span>New Order</span>
            </button>

            <button
              id="tab-orders"
              data-testid="tab-orders"
              onClick={() => setActiveTab('orders')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: activeTab === 'orders' ? 600 : 400,
                backgroundColor: activeTab === 'orders' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'orders' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === 'orders' ? '1px solid var(--border-focus)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <Receipt size={18} color={activeTab === 'orders' ? 'var(--accent-primary)' : 'currentColor'} />
              <span>Active Orders</span>
            </button>

            <button
              id="tab-menu"
              data-testid="tab-menu"
              onClick={() => setActiveTab('menu')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: activeTab === 'menu' ? 600 : 400,
                backgroundColor: activeTab === 'menu' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'menu' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === 'menu' ? '1px solid var(--border-focus)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <UtensilsCrossed size={18} color={activeTab === 'menu' ? 'var(--accent-primary)' : 'currentColor'} />
              <span>Menu Management</span>
            </button>

            <button
              id="tab-rbac"
              data-testid="tab-rbac"
              onClick={() => setActiveTab('rbac')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.2rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9375rem',
                fontWeight: activeTab === 'rbac' ? 600 : 400,
                backgroundColor: activeTab === 'rbac' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: activeTab === 'rbac' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: activeTab === 'rbac' ? '1px solid var(--border-focus)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              <ShieldCheck size={18} color={activeTab === 'rbac' ? 'var(--accent-primary)' : 'currentColor'} />
              <span>RBAC Verification</span>
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'create-order' && <OrderCreation onOrderCreated={() => {}} />}
          {activeTab === 'orders' && <OrderList />}
          {activeTab === 'menu' && <MenuManagement />}
          {activeTab === 'rbac' && <SessionDashboard />}
        </div>
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
