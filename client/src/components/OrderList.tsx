import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus } from '../types/order';
import {
  fetchOrdersApi,
  fetchOrderByIdApi,
  updateOrderStatusApi,
  cancelOrderApi,
  voidOrderLineApi,
} from '../services/order.service';
import {
  Receipt,
  RotateCcw,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Check,
  Ban,
  Slash,
} from 'lucide-react';

interface OrderListProps {
  onSelectOrder?: (order: Order) => void;
}

export const OrderList: React.FC<OrderListProps> = () => {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Void modal state
  const [voidModalOpen, setVoidModalOpen] = useState<boolean>(false);
  const [voidingOrderId, setVoidingOrderId] = useState<string | null>(null);
  const [voidingLineId, setVoidingLineId] = useState<string | null>(null);
  const [voidingItemName, setVoidingItemName] = useState<string>('');
  const [voidReason, setVoidReason] = useState<string>('');
  const [voidError, setVoidError] = useState<string | null>(null);
  const [isSubmittingVoid, setIsSubmittingVoid] = useState<boolean>(false);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState<boolean>(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellingTable, setCancellingTable] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

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
    if (token) {
      try {
        const fullOrder = await fetchOrderByIdApi(token, orderId);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? fullOrder : o)));
      } catch (err) {
        console.warn('Failed to load full order detail', err);
      }
    }
  };

  // Perform Status Transition
  const handleTransition = async (orderId: string, targetStatus: OrderStatus) => {
    if (!token) return;
    try {
      setErrorMessage(null);
      setActionSuccessMessage(null);
      const updated = await updateOrderStatusApi(token, orderId, targetStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      setActionSuccessMessage(`Order updated to '${targetStatus}'`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  // Open Cancel Modal
  const openCancelDialog = (order: Order) => {
    setCancellingOrderId(order.id);
    setCancellingTable(order.tableNumber);
    setCancelReason('');
    setCancelModalOpen(true);
  };

  // Submit Cancel
  const submitCancel = async () => {
    if (!token || !cancellingOrderId) return;
    try {
      setIsSubmittingCancel(true);
      setErrorMessage(null);
      setActionSuccessMessage(null);
      const updated = await cancelOrderApi(token, cancellingOrderId, cancelReason);
      setOrders((prev) => prev.map((o) => (o.id === cancellingOrderId ? updated : o)));
      setCancelModalOpen(false);
      setActionSuccessMessage('Order cancelled successfully');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to cancel order');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Open Void Modal
  const openVoidDialog = (orderId: string, lineId: string, itemName: string) => {
    setVoidingOrderId(orderId);
    setVoidingLineId(lineId);
    setVoidingItemName(itemName);
    setVoidReason('');
    setVoidError(null);
    setVoidModalOpen(true);
  };

  // Submit Void
  const submitVoid = async () => {
    if (!token || !voidingOrderId || !voidingLineId) return;
    if (!voidReason.trim()) {
      setVoidError('A void reason is required.');
      return;
    }

    try {
      setIsSubmittingVoid(true);
      setVoidError(null);
      setErrorMessage(null);
      setActionSuccessMessage(null);
      const updated = await voidOrderLineApi(
        token,
        voidingOrderId,
        voidingLineId,
        voidReason.trim()
      );
      setOrders((prev) => prev.map((o) => (o.id === voidingOrderId ? updated : o)));
      setVoidModalOpen(false);
      setActionSuccessMessage(`Item "${voidingItemName}" voided successfully`);
    } catch (err) {
      setVoidError(err instanceof Error ? err.message : 'Failed to void item');
    } finally {
      setIsSubmittingVoid(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'placed':
        return (
          <span
            className="badge"
            data-testid="status-badge-placed"
            style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' }}
          >
            PLACED
          </span>
        );
      case 'accepted':
        return (
          <span
            className="badge"
            data-testid="status-badge-accepted"
            style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#facc15', border: '1px solid rgba(234, 179, 8, 0.4)' }}
          >
            ACCEPTED
          </span>
        );
      case 'preparing':
        return (
          <span
            className="badge"
            data-testid="status-badge-preparing"
            style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' }}
          >
            PREPARING
          </span>
        );
      case 'ready':
        return (
          <span
            className="badge"
            data-testid="status-badge-ready"
            style={{ background: 'rgba(20, 184, 166, 0.2)', color: '#2dd4bf', border: '1px solid rgba(20, 184, 166, 0.4)' }}
          >
            READY
          </span>
        );
      case 'served':
        return (
          <span
            className="badge"
            data-testid="status-badge-served"
            style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.4)' }}
          >
            SERVED
          </span>
        );
      case 'cancelled':
        return (
          <span
            className="badge"
            data-testid="status-badge-cancelled"
            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)' }}
          >
            CANCELLED
          </span>
        );
      default:
        return <span className="badge">{status}</span>;
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

      {/* Success Alert */}
      {actionSuccessMessage && (
        <div
          role="alert"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(34, 197, 94, 0.12)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#86efac',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} color="#22c55e" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div
          role="alert"
          data-testid="lifecycle-error-alert"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const activeLinesCount = order.lines
              .filter((l) => !l.isVoided)
              .reduce((sum, l) => sum + l.quantity, 0);
            const isOpen = order.status !== 'served' && order.status !== 'cancelled';
            const isCancellable = order.status === 'placed' || order.status === 'accepted';

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
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    onClick={() => toggleExpand(order.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
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
                        {getStatusBadge(order.status)}
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {activeLinesCount} active {activeLinesCount === 1 ? 'item' : 'items'}
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
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 800,
                          color: order.status === 'cancelled' ? 'var(--text-muted)' : '#34d399',
                          textDecoration: order.status === 'cancelled' ? 'line-through' : 'none',
                        }}
                        data-testid={`order-total-${order.id}`}
                      >
                        ${order.totalPrice.toFixed(2)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExpand(order.id)}
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

                {/* State Transition Actions Toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                    padding: '0.65rem 0.85rem',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-glass)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      ACTIONS:
                    </span>

                    {order.status === 'placed' && (
                      <button
                        className="btn btn-primary"
                        data-testid={`btn-accept-${order.id}`}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', gap: '0.35rem' }}
                        onClick={() => handleTransition(order.id, 'accepted')}
                      >
                        <Check size={14} /> Accept Order
                      </button>
                    )}

                    {order.status === 'accepted' && (
                      <button
                        className="btn btn-primary"
                        data-testid={`btn-prepare-${order.id}`}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', gap: '0.35rem' }}
                        onClick={() => handleTransition(order.id, 'preparing')}
                      >
                        <Play size={14} /> Start Preparing
                      </button>
                    )}

                    {order.status === 'preparing' && (
                      <button
                        className="btn btn-primary"
                        data-testid={`btn-ready-${order.id}`}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8125rem',
                          gap: '0.35rem',
                          background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                        }}
                        onClick={() => handleTransition(order.id, 'ready')}
                      >
                        <CheckCircle2 size={14} /> Mark Ready
                      </button>
                    )}

                    {order.status === 'ready' && (
                      <button
                        className="btn btn-primary"
                        data-testid={`btn-serve-${order.id}`}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8125rem',
                          gap: '0.35rem',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        }}
                        onClick={() => handleTransition(order.id, 'served')}
                      >
                        <CheckCircle2 size={14} /> Mark Served
                      </button>
                    )}

                    {order.status === 'served' && (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: '#4ade80',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                      >
                        <CheckCircle2 size={15} /> Completed & Served
                      </span>
                    )}

                    {order.status === 'cancelled' && (
                      <span
                        style={{
                          fontSize: '0.8125rem',
                          color: '#f87171',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                        }}
                      >
                        <XCircle size={15} /> Order Cancelled
                      </span>
                    )}
                  </div>

                  {/* Cancellation Control */}
                  {isOpen && (
                    <div>
                      {isCancellable ? (
                        <button
                          className="btn btn-secondary"
                          data-testid={`btn-cancel-${order.id}`}
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8125rem',
                            color: '#f87171',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            gap: '0.35rem',
                          }}
                          onClick={() => openCancelDialog(order)}
                        >
                          <Ban size={14} /> Cancel Order
                        </button>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            fontStyle: 'italic',
                          }}
                          title="Kitchen has begun preparing — order cannot be cancelled as a whole."
                        >
                          Cannot cancel (in {order.status})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded Order Lines & Void Controls */}
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Order Lines & Historical Snapshots:
                      </span>
                      {isOpen && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Lines can be voided with reason while order is open
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {order.lines.map((line) => (
                        <div
                          key={line.id}
                          data-testid={`order-line-${line.id}`}
                          style={{
                            background: line.isVoided ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.65rem 0.85rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            border: line.isVoided
                              ? '1px solid rgba(239, 68, 68, 0.25)'
                              : '1px solid var(--border-glass)',
                            fontSize: '0.875rem',
                            opacity: line.isVoided ? 0.75 : 1,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                textDecoration: line.isVoided ? 'line-through' : 'none',
                                color: line.isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                              }}
                            >
                              <UtensilsCrossed size={14} color={line.isVoided ? '#94a3b8' : 'var(--accent-primary)'} />
                              <span>
                                {line.quantity}x {line.itemName}
                              </span>
                              {line.isVoided && (
                                <span
                                  data-testid={`badge-voided-${line.id}`}
                                  style={{
                                    fontSize: '0.6875rem',
                                    padding: '0.15rem 0.45rem',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#f87171',
                                    borderRadius: '4px',
                                    fontWeight: 700,
                                    textDecoration: 'none',
                                  }}
                                >
                                  VOIDED
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '1.4rem' }}>
                              Historical unit snapshot: ${line.unitPrice.toFixed(2)} each
                            </div>

                            {line.specialInstructions && !line.isVoided && (
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

                            {line.isVoided && line.voidReason && (
                              <div
                                data-testid={`void-reason-${line.id}`}
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#fca5a5',
                                  marginLeft: '1.4rem',
                                  marginTop: '0.2rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                              >
                                <Slash size={12} />
                                <span>Void reason: {line.voidReason}</span>
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div
                              style={{
                                textAlign: 'right',
                                fontWeight: 700,
                                color: line.isVoided ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: line.isVoided ? 'line-through' : 'none',
                              }}
                            >
                              ${line.lineTotal.toFixed(2)}
                            </div>

                            {/* Void Button on Non-Voided Lines on Open Orders */}
                            {!line.isVoided && isOpen && (
                              <button
                                className="btn btn-secondary"
                                data-testid={`btn-void-line-${line.id}`}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  color: '#f87171',
                                  borderColor: 'rgba(239, 68, 68, 0.3)',
                                }}
                                title="Void line with required reason"
                                onClick={() => openVoidDialog(order.id, line.id, line.itemName)}
                              >
                                Void
                              </button>
                            )}
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

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-order-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
              <Ban size={22} />
              <h3 id="cancel-order-title" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
                Cancel {cancellingTable}?
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Are you sure you want to cancel this entire order? Cancellation is only permitted while the order is Placed or Accepted.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Cancellation Reason (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                data-testid="cancel-reason-input"
                placeholder="e.g., Customer walked out, Entered in error"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={500}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCancelModalOpen(false)}
                disabled={isSubmittingCancel}
              >
                Nevermind
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="confirm-cancel-btn"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                onClick={submitCancel}
                disabled={isSubmittingCancel}
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Void Order Line Modal */}
      {voidModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="void-line-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f87171' }}>
              <Slash size={22} />
              <h3 id="void-line-title" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
                Void Item: {voidingItemName}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Voiding marks this item on the ticket while preserving its historical record. It will no longer contribute to the order total.
            </p>

            {voidError && (
              <div
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.8125rem',
                }}
              >
                {voidError}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Void Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="input-field"
                data-testid="void-reason-input"
                placeholder="e.g., Customer changed mind, Out of stock, Spilled"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                maxLength={500}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVoidModalOpen(false)}
                disabled={isSubmittingVoid}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="confirm-void-btn"
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
                onClick={submitVoid}
                disabled={isSubmittingVoid}
              >
                {isSubmittingVoid ? 'Voiding...' : 'Void Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
