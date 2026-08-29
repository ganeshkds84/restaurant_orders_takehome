import React from 'react';
import { UtensilsCrossed, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  appName?: string;
  activeRole?: string;
}

export const Header: React.FC<HeaderProps> = ({
  appName = 'Restaurant Orders',
  activeRole = 'Foundation Mode',
}) => {
  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(11, 15, 25, 0.8)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4rem',
        }}
      >
        {/* Brand Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <UtensilsCrossed size={20} color="#ffffff" />
          </div>
          <div>
            <h1
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                background: 'var(--gradient-brand)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {appName}
            </h1>
          </div>
        </div>

        {/* Status / Role pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-tertiary)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-glass)',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <ShieldAlert size={14} color="var(--accent-primary)" />
            <span>{activeRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
