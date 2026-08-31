import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types/order';
import { fetchOrdersApi, fetchOrderByIdApi } from '../services/order.service';
import {
  Receipt,
  RotateCcw,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  AlertTriangle,
} from 'lucide-react';

interface OrderListProps {
  onSelectOrder?: (order: Order) => void;
}

export const OrderList: React.FC<OrderListProps> = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await fetchOrdersApi(token);
      setOrders(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [token]);

  const toggleExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);
    // Optionally refresh single order details
    if (token) {
      try {
        const fullOrder = await fetchOrderByIdApi(token, orderId);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? fullOrder : o)));
      } catch (err) {
        console.warn('Failed to load full order detail', err);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Active Orders</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {user?.role === 'manager'
              ? 'Showing all restaurant orders across all tables and waitstaff.'
              : 'Showing your active orders placed as primary waiter.'}
          </p>
        </div>

        <button
          onClick={loadOrders}
          className="btn btn-secondary"
          disabled={isLoading}
          title="Refresh orders list"
        >
          <RotateCcw size={16} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertTriangle size={18} color="#ef4444" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Orders List Container */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
          Loading active orders...
        </div>
      ) : orders.length === 0 ? (
        <div
          className="glass-card"
          style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-secondary)' }}
        >
          <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No Orders Found</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            There are currently no active orders in your queue.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const totalLinesCount = order.lines.reduce((sum, l) => sum + l.quantity, 0);

            return (
              <div
                key={order.id}
                className="glass-card"
                data-testid={`order-card-${order.id}`}
                style={{
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid var(--border-focus)',
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {order.tableNumber}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge badge-manager" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                          {order.status}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {totalLinesCount} {totalLinesCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginTop: '0.2rem',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} /> Waiter: {order.primaryWaiter?.name || order.primaryWaiterId}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Authoritative Total
                      </div>
                      <div
                        style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}
                        data-testid={`order-total-${order.id}`}
                      >
                        ${order.totalPrice.toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Toggle order details"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Order Lines */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Order Lines & Historical Price Snapshots:
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.lines.map((line) => (
                        <div
                          key={line.id}
                          style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.875rem',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <UtensilsCrossed size={14} color="var(--accent-primary)" />
                              <span>
                                {line.quantity}x {line.itemName}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.4rem' }}>
                              Historical unit snapshot: ${line.unitPrice.toFixed(2)} each
                            </div>
                            {line.specialInstructions && (
                              <div
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#fbbf24',
                                  fontStyle: 'italic',
                                  marginLeft: '1.4rem',
                                  marginTop: '0.15rem',
                                }}
                              >
                                &ldquo;{line.specialInstructions}&rdquo;
                              </div>
                            )}
                          </div>

                          <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                            ${line.lineTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <span>Order ID: {order.id}</span>
                      <span>Placed at: {new Date(order.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
