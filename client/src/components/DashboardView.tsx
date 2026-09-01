import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardStats } from '../services/dashboard.service';
import { DashboardStats } from '../types/dashboard';
import { OrderStatus } from '../types/order';
import {
  Clock,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Users,
  BarChart3,
  Calendar,
  Layers,
  Award,
} from 'lucide-react';

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string }
> = {
  placed: {
    label: 'Placed',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  accepted: {
    label: 'Accepted',
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    border: 'rgba(59, 130, 246, 0.3)',
  },
  preparing: {
    label: 'Preparing',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.12)',
    border: 'rgba(139, 92, 246, 0.3)',
  },
  ready: {
    label: 'Ready',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)',
  },
  served: {
    label: 'Served',
    color: '#9ca3af',
    bg: 'rgba(156, 163, 175, 0.12)',
    border: 'rgba(156, 163, 175, 0.3)',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
};

export const DashboardView: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadStats = useCallback(
    async (showSpinner = false) => {
      if (!token) return;
      if (showSpinner) setIsRefreshing(true);
      else setIsLoading(true);
      setError(null);

      try {
        const data = await fetchDashboardStats(token);
        setStats(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard metrics.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const totalOrdersInBreakdown = stats
    ? stats.statusBreakdown.reduce((sum, item) => sum + item.count, 0)
    : 0;

  const maxDailyCount = stats
    ? Math.max(...stats.dailyServedChart.map((d) => d.count), 1)
    : 1;

  const totalServed14Days = stats
    ? stats.dailyServedChart.reduce((sum, d) => sum + d.count, 0)
    : 0;

  return (
    <div
      data-testid="dashboard-view"
      style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}
    >
      {/* Header Toolbar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <BarChart3 size={24} color="var(--accent-primary)" />
            <h2
              style={{
                fontSize: '1.375rem',
                fontWeight: 700,
                margin: 0,
                color: 'var(--text-primary)',
              }}
            >
              Operations & Analytics Dashboard
            </h2>
          </div>
          <p
            style={{
              margin: '0.25rem 0 0',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
            }}
          >
            Server-authoritative live restaurant throughput, order pipelines, and 14-day history.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            id="dashboard-refresh-btn"
            data-testid="dashboard-refresh-btn"
            onClick={() => loadStats(true)}
            disabled={isLoading || isRefreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: isLoading || isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'var(--transition-fast)',
            }}
          >
            <RefreshCw
              size={16}
              className={isRefreshing ? 'spin-animation' : ''}
              style={{
                animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          data-testid="dashboard-error"
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: 'var(--alert-bg)',
            border: '1px solid var(--alert-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--alert-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadStats(true)}
            style={{
              padding: '0.35rem 0.75rem',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !stats && (
        <div
          data-testid="dashboard-loading"
          style={{ textAlign: 'center', padding: '3rem 0' }}
        >
          <div
            className="pulse-dot pulse-dot-amber"
            style={{ width: '16px', height: '16px', margin: '0 auto 1rem' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Aggregating live restaurant analytics from database...
          </p>
        </div>
      )}

      {/* Main Stats Content */}
      {stats && (
        <>
          {/* 1. Headline Numbers Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Card: Open Orders */}
            <div
              className="glass-card"
              data-testid="stat-card-open-orders"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Open Orders
                </span>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                  }}
                >
                  <Clock size={18} />
                </div>
              </div>
              <div
                data-testid="stat-value-open-orders"
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {stats.headline.openOrders}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                Active in pipeline (placed $\to$ ready)
              </span>
            </div>

            {/* Card: Orders Placed Today */}
            <div
              className="glass-card"
              data-testid="stat-card-placed-today"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderLeft: '4px solid #3b82f6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Placed Today
                </span>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                  }}
                >
                  <TrendingUp size={18} />
                </div>
              </div>
              <div
                data-testid="stat-value-placed-today"
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {stats.headline.ordersPlacedToday}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                Total orders initiated today
              </span>
            </div>

            {/* Card: Orders Served Today */}
            <div
              className="glass-card"
              data-testid="stat-card-served-today"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderLeft: '4px solid #10b981',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Served Today
                </span>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div
                data-testid="stat-value-served-today"
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {stats.headline.ordersServedToday}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                Fulfilled dishes delivered to tables
              </span>
            </div>

            {/* Card: Revenue Today */}
            <div
              className="glass-card"
              data-testid="stat-card-revenue-today"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                borderLeft: '4px solid #8b5cf6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                  }}
                >
                  Revenue Today
                </span>
                <div
                  style={{
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(139, 92, 246, 0.15)',
                    color: '#8b5cf6',
                  }}
                >
                  <DollarSign size={18} />
                </div>
              </div>
              <div
                data-testid="stat-value-revenue-today"
                style={{
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatCurrency(stats.headline.revenueToday)}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                }}
              >
                Server-authoritative total from served tickets
              </span>
            </div>
          </div>

          {/* 2. Middle Row: Status Pipeline Breakdown & 14-Day Served Chart */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {/* Status Breakdown Panel */}
            <div
              className="glass-card"
              data-testid="status-breakdown-panel"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={20} color="var(--accent-primary)" />
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Breakdown by Status
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {totalOrdersInBreakdown} total orders
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                }}
              >
                {stats.statusBreakdown.map((item) => {
                  const cfg = STATUS_CONFIG[item.status] || {
                    label: item.status,
                    color: '#6366f1',
                    bg: 'rgba(99, 102, 241, 0.1)',
                    border: 'rgba(99, 102, 241, 0.3)',
                  };
                  const pct =
                    totalOrdersInBreakdown > 0
                      ? Math.round((item.count / totalOrdersInBreakdown) * 100)
                      : 0;

                  return (
                    <div
                      key={item.status}
                      data-testid={`status-item-${item.status}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.875rem',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: cfg.color,
                              display: 'inline-block',
                            }}
                          />
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              textTransform: 'capitalize',
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {item.count}
                          </span>
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '0.75rem',
                            }}
                          >
                            ({pct}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div
                        style={{
                          width: '100%',
                          height: '6px',
                          backgroundColor: 'var(--bg-tertiary)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            backgroundColor: cfg.color,
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 14-Day Served Chart Panel */}
            <div
              className="glass-card"
              data-testid="chart-panel-served-14days"
              style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={20} color="var(--accent-primary)" />
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      margin: 0,
                      color: 'var(--text-primary)',
                    }}
                  >
                    Served Orders (Last 14 Days)
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  {totalServed14Days} total served
                </span>
              </div>

              {/* Chart Visual Bars */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  height: '180px',
                  padding: '1.25rem 0.5rem 0.5rem',
                  gap: '0.35rem',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                {stats.dailyServedChart.map((point) => {
                  const barHeightPct =
                    maxDailyCount > 0
                      ? Math.max(8, (point.count / maxDailyCount) * 100)
                      : 8;
                  const isToday =
                    point.date ===
                    stats.dailyServedChart[stats.dailyServedChart.length - 1].date;

                  return (
                    <div
                      key={point.date}
                      data-testid={`chart-bar-${point.date}`}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        flex: 1,
                        height: '100%',
                        justifyContent: 'flex-end',
                        gap: '0.35rem',
                      }}
                      title={`${point.date}: ${point.count} served`}
                    >
                      {/* Count label above bar */}
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color:
                            point.count > 0
                              ? 'var(--text-primary)'
                              : 'transparent',
                        }}
                      >
                        {point.count}
                      </span>

                      {/* Bar Fill */}
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          height: `${barHeightPct}%`,
                          backgroundColor:
                            point.count > 0
                              ? isToday
                                ? 'var(--accent-primary)'
                                : '#10b981'
                              : 'rgba(255, 255, 255, 0.06)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.3s ease',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Chart X-Axis Labels */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.6875rem',
                  color: 'var(--text-muted)',
                  padding: '0 0.5rem',
                }}
              >
                <span>
                  {stats.dailyServedChart[0]?.date.substring(5)} (14d ago)
                </span>
                <span>
                  {
                    stats.dailyServedChart[
                      Math.floor(stats.dailyServedChart.length / 2)
                    ]?.date.substring(5)
                  }
                </span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {stats.dailyServedChart[stats.dailyServedChart.length - 1]?.date.substring(5)} (Today)
                </span>
              </div>
            </div>
          </div>

          {/* 3. Waiter Performance Breakdown */}
          <div
            className="glass-card"
            data-testid="waiter-breakdown-panel"
            style={{
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={20} color="var(--accent-primary)" />
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                  }}
                >
                  Breakdown by Waiter
                </h3>
              </div>
              <span
                style={{
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)',
                }}
              >
                {stats.waiterBreakdown.length} active waitstaff members
              </span>
            </div>

            {stats.waiterBreakdown.length === 0 ? (
              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  margin: 0,
                }}
              >
                No waiter order records available.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '0.875rem',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        Waiter
                      </th>
                      <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        Email
                      </th>
                      <th
                        style={{
                          padding: '0.75rem 1rem',
                          fontWeight: 600,
                          textAlign: 'center',
                        }}
                      >
                        Orders Handled
                      </th>
                      <th
                        style={{
                          padding: '0.75rem 1rem',
                          fontWeight: 600,
                          textAlign: 'right',
                        }}
                      >
                        Total Revenue Generated
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.waiterBreakdown.map((w, index) => (
                      <tr
                        key={w.waiterId}
                        data-testid={`waiter-row-${w.waiterId}`}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor:
                            index === 0 && w.orderCount > 0
                              ? 'rgba(99, 102, 241, 0.04)'
                              : 'transparent',
                        }}
                      >
                        <td
                          style={{
                            padding: '0.875rem 1rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          {index === 0 && w.orderCount > 0 && (
                            <Award size={16} color="#f59e0b" />
                          )}
                          <span>{w.waiterName}</span>
                        </td>
                        <td
                          style={{
                            padding: '0.875rem 1rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {w.waiterEmail || '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.875rem 1rem',
                            textAlign: 'center',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.2rem 0.6rem',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            }}
                          >
                            {w.orderCount}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: '0.875rem 1rem',
                            textAlign: 'right',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {formatCurrency(w.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardView;
