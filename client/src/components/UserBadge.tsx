import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Coffee } from 'lucide-react';

export const UserBadge: React.FC = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const isManager = user.role === 'manager';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.375rem 0.75rem',
          backgroundColor: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: isManager ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: isManager ? 'var(--accent-purple, #a855f7)' : 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isManager ? <Shield size={16} /> : <Coffee size={16} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {user.name}
            </span>
            <span className={`badge badge-${user.role}`}>
              {user.role.toUpperCase()}
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {user.email}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="btn btn-secondary"
        style={{
          padding: '0.4rem 0.75rem',
          fontSize: '0.8125rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--text-secondary)',
        }}
        title="Sign out of system"
      >
        <LogOut size={15} />
        <span>Sign Out</span>
      </button>
    </div>
  );
};
