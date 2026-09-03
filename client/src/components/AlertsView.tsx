import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SlowOrderAlert } from '../types/alert';
import { fetchSlowOrderAlerts, acknowledgeOrderAlert } from '../services/alert.service';
import { formatCurrency } from '../utils/currency';
import {
  AlertTriangle,
  RotateCcw,
  Clock,
  User,
  Users,
  CheckCircle2,
  Check,
  BellRing,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface AlertsViewProps {
  onSelectOrder?: (orderId: string) => void;
  onAlertCountChange?: (count: number) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({ onSelectOrder, onAlertCountChange }) => {
  const { token, user } = useAuth();
  const [alerts, setAlerts] = useState<SlowOrderAlert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [thresholdMinutes, setThresholdMinutes] = useState<number>(15);
  const [reAlertMinutes, setReAlertMinutes] = useState<number>(15);

  // Acknowledging state
  const [acknowledgingOrderId, setAcknowledgingOrderId] = useState<string | null>(null);
  const [ackModalOpen, setAckModalOpen] = useState<boolean>(false);
  const [targetTableNumber, setTargetTableNumber] = useState<string>('');
  const [ackNotes, setAckNotes] = useState<string>('');
  const [isSubmittingAck, setIsSubmittingAck] = useState<boolean>(false);

  const loadAlerts = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setIsLoading(true);
      setErrorMessage(null);
      const res = await fetchSlowOrderAlerts(token, { thresholdMinutes, reAlertMinutes });
      setAlerts(res.alerts);
      setThresholdMinutes(res.thresholdMinutes);
      setReAlertMinutes(res.reAlertMinutes);
      if (onAlertCountChange) {
        onAlertCountChange(res.count);
      }
    } catch (err) {
      if (!silent) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load slow-order alerts.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // Periodic refresh every 30 seconds to keep timers and alerts fresh
    const interval = setInterval(() => {
      loadAlerts(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const openAcknowledgeModal = (alert: SlowOrderAlert) => {
    setAcknowledgingOrderId(alert.orderId);
    setTargetTableNumber(alert.tableNumber);
    setAckNotes('');
    setAckModalOpen(true);
  };

  const handleAcknowledge = async () => {
    if (!token || !acknowledgingOrderId) return;
    try {
      setIsSubmittingAck(true);
      setErrorMessage(null);
      await acknowledgeOrderAlert(token, acknowledgingOrderId, ackNotes.trim() || undefined);

      // Remove from current list
      const updated = alerts.filter((a) => a.orderId !== acknowledgingOrderId);
      setAlerts(updated);
      if (onAlertCountChange) {
        onAlertCountChange(updated.length);
      }

      setAckModalOpen(false);
      setActionSuccessMessage(`Slow-order alert for ${targetTableNumber} acknowledged and cleared.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to acknowledge alert.');
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const getStatusBadge = (status: string) => {
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
      default:
        return <span className="badge">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={24} style={{ color: alerts.length > 0 ? '#f59e0b' : 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Slow-Order Alerts
            </h2>
            {alerts.length > 0 && (
              <span
                className="badge"
                data-testid="alerts-total-count-badge"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                }}
              >
                {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} active
              </span>
            )}
          </div>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Orders open for more than {thresholdMinutes} minutes without reaching Ready status.
            {user?.role === 'manager'
              ? ' Displaying restaurant-wide alerts across all dining tables.'
              : ' Displaying alerts for your assigned tables and collaborations.'}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          data-testid="btn-refresh-alerts"
          onClick={() => loadAlerts()}
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Success Notification */}
      {actionSuccessMessage && (
        <div
          data-testid="alert-action-success-banner"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#6ee7b7',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div
          data-testid="alerts-error-banner"
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.875rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && alerts.length === 0 && (
        <div
          data-testid="alerts-loading-state"
          className="glass-card"
          style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}
        >
          <RotateCcw size={28} className="animate-spin" style={{ margin: '0 auto 0.75rem', color: 'var(--accent-primary)' }} />
          <div>Checking restaurant order timers...</div>
        </div>
      )}

      {/* Empty State: All orders on track */}
      {!isLoading && alerts.length === 0 && !errorMessage && (
        <div
          data-testid="alerts-empty-state"
          className="glass-card"
          style={{
            padding: '3.5rem 2rem',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#34d399',
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.35rem', color: 'var(--text-primary)' }}>
              All Orders Are On Track!
            </h3>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '420px' }}>
              No orders have exceeded the {thresholdMinutes}-minute threshold without reaching Ready. Kitchen and waitstaff throughput is operating smoothly.
            </p>
          </div>
        </div>
      )}

      {/* Alerts Grid / List */}
      {alerts.length > 0 && (
        <div data-testid="slow-orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert) => (
            <div
              key={alert.orderId}
              data-testid={`slow-order-card-${alert.orderId}`}
              className="glass-card"
              style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft: alert.isReAlert
                  ? '4px solid #ef4444'
                  : '4px solid #f59e0b',
                background: 'rgba(30, 41, 59, 0.65)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {alert.tableNumber}
                    </span>
                    {getStatusBadge(alert.status)}
                    {alert.isReAlert ? (
                      <span
                        className="badge"
                        data-testid={`badge-re-alert-${alert.orderId}`}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          fontWeight: 700,
                        }}
                      >
                        <BellRing size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                        RE-ALERT (STILL NOT READY)
                      </span>
                    ) : (
                      <span
                        className="badge"
                        data-testid={`badge-overdue-${alert.orderId}`}
                        style={{
                          background: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          fontWeight: 600,
                        }}
                      >
                        {alert.overdueMinutes > 0 ? `${alert.overdueMinutes}m OVERDUE` : 'SLOW ORDER'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={13} />
                      Placed: <strong>{new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <User size={13} />
                      Primary Waiter: <strong>{alert.primaryWaiterName}</strong>
                    </span>
                    {alert.collaborators && alert.collaborators.length > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-primary)' }}>
                        <Users size={13} />
                        +{alert.collaborators.length} {alert.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Authoritative Total
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399' }}>
                    {formatCurrency(alert.totalPrice)}
                  </div>
                </div>
              </div>

              {/* Timing metrics & Acknowledgement Banner */}
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  fontSize: '0.8125rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Elapsed Time: </span>
                    <strong style={{ color: '#f87171' }}>{alert.elapsedMinutes} mins</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Threshold: </span>
                    <span>{alert.thresholdMinutes} mins</span>
                  </div>
                  {alert.lastAcknowledgedAt && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Last Ack: </span>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        {new Date(alert.lastAcknowledgedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {alert.lastAcknowledgedByName ? ` by ${alert.lastAcknowledgedByName}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  {onSelectOrder && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      data-testid={`btn-view-order-${alert.orderId}`}
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                      onClick={() => onSelectOrder(alert.orderId)}
                    >
                      <Eye size={13} /> View Order
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-primary"
                    data-testid={`btn-acknowledge-alert-${alert.orderId}`}
                    style={{
                      padding: '0.35rem 0.75rem',
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    }}
                    onClick={() => openAcknowledgeModal(alert)}
                  >
                    <Check size={14} /> Acknowledge Alert
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acknowledge Alert Modal */}
      {ackModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ack-alert-title"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b' }}>
              <AlertTriangle size={22} />
              <h3 id="ack-alert-title" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
                Acknowledge Alert: {targetTableNumber}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Acknowledging this alert clears it from the active alerts queue. If the order is still not Ready in {reAlertMinutes} minutes, the alert will return automatically.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Resolution Note (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                data-testid="ack-notes-input"
                placeholder="e.g. Checked with chef, steak resting; table notified"
                value={ackNotes}
                onChange={(e) => setAckNotes(e.target.value)}
                maxLength={300}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setAckModalOpen(false)}
                disabled={isSubmittingAck}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="confirm-acknowledge-btn"
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
                onClick={handleAcknowledge}
                disabled={isSubmittingAck}
              >
                {isSubmittingAck ? 'Clearing...' : 'Confirm Acknowledge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
