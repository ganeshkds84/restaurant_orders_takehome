import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Order, OrderStatus, OrderCollaborator, OrderSortField, OrderSortOrder } from '../types/order';
import { OrderAuditEvent } from '../types/timeline';
import {
  fetchOrdersApi,
  fetchOrderByIdApi,
  updateOrderStatusApi,
  cancelOrderApi,
  voidOrderLineApi,
  fetchEligibleWaitersApi,
  addCollaboratorApi,
  removeCollaboratorApi,
  exportOrdersCsvApi,
} from '../services/order.service';
import { fetchOrderTimeline } from '../services/timeline.service';
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
  Users,
  UserPlus,
  UserMinus,
  Search,
  ArrowUpDown,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  History,
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

  // Timeline State (Phase 10 - Goal 9)
  const [orderTimelines, setOrderTimelines] = useState<Record<string, OrderAuditEvent[]>>({});
  const [loadingTimelines, setLoadingTimelines] = useState<Record<string, boolean>>({});
  const [timelineErrors, setTimelineErrors] = useState<Record<string, string | null>>({});
  const [expandedTimelineOrders, setExpandedTimelineOrders] = useState<Record<string, boolean>>({});

  // Search, Filter, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [waiterFilter, setWaiterFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<OrderSortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<OrderSortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [waitersForFilter, setWaitersForFilter] = useState<Array<{ id: string; name: string; email: string }>>([]);

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

  // Collaborator modal state
  const [collabModalOpen, setCollabModalOpen] = useState<boolean>(false);
  const [collabOrderId, setCollabOrderId] = useState<string | null>(null);
  const [collabTableNumber, setCollabTableNumber] = useState<string>('');
  const [eligibleWaiters, setEligibleWaiters] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>('');
  const [collabError, setCollabError] = useState<string | null>(null);
  const [isLoadingWaiters, setIsLoadingWaiters] = useState<boolean>(false);
  const [isSubmittingCollab, setIsSubmittingCollab] = useState<boolean>(false);

  const loadTimelineForOrder = async (orderId: string) => {
    if (!token) return;
    try {
      setLoadingTimelines((prev) => ({ ...prev, [orderId]: true }));
      setTimelineErrors((prev) => ({ ...prev, [orderId]: null }));
      const timeline = await fetchOrderTimeline(token, orderId);
      setOrderTimelines((prev) => ({ ...prev, [orderId]: timeline }));
    } catch (err) {
      setTimelineErrors((prev) => ({
        ...prev,
        [orderId]: err instanceof Error ? err.message : 'Failed to load order history timeline.',
      }));
    } finally {
      setLoadingTimelines((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleTimeline = (orderId: string) => {
    setExpandedTimelineOrders((prev) => {
      const nextState = !prev[orderId];
      if (nextState && !orderTimelines[orderId]) {
        loadTimelineForOrder(orderId);
      }
      return { ...prev, [orderId]: nextState };
    });
  };

  const loadOrders = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetchOrdersApi(token, {
        search: searchQuery.trim() || undefined,
        status: statusFilter ? (statusFilter as OrderStatus) : undefined,
        waiterId: waiterFilter || undefined,
        date: dateFilter || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        limit: pageSize,
      });
      setOrders(res.orders);
      setTotalOrders(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchEligibleWaitersApi(token)
        .then((waiters) => setWaitersForFilter(waiters))
        .catch((err) => console.warn('Could not fetch waiter filter list', err));
    }
  }, [token]);

  useEffect(() => {
    loadOrders();
  }, [token, searchQuery, statusFilter, waiterFilter, dateFilter, sortBy, sortOrder, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setWaiterFilter('');
    setDateFilter('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);

  const handleExportCsv = async () => {
    if (!token) return;
    try {
      setIsExportingCsv(true);
      setErrorMessage(null);
      const targetDate = dateFilter || new Date().toISOString().slice(0, 10);
      const csvText = await exportOrdersCsvApi(token, targetDate);

      // Trigger browser file download
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-${targetDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setActionSuccessMessage(`Exported orders for ${targetDate} successfully`);
      setTimeout(() => setActionSuccessMessage(null), 3500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to export orders CSV');
    } finally {
      setIsExportingCsv(false);
    }
  };



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

  // Open Add Collaborator Dialog
  const openAddCollaboratorDialog = async (order: Order) => {
    if (!token) return;
    setCollabOrderId(order.id);
    setCollabTableNumber(order.tableNumber);
    setSelectedWaiterId('');
    setCollabError(null);
    setCollabModalOpen(true);
    setIsLoadingWaiters(true);

    try {
      const allWaiters = await fetchEligibleWaitersApi(token);
      // Filter out primary waiter and already assigned collaborators
      const existingCollabUserIds = new Set((order.collaborators || []).map((c) => c.userId));
      const filtered = allWaiters.filter(
        (w) => w.id !== order.primaryWaiterId && !existingCollabUserIds.has(w.id)
      );
      setEligibleWaiters(filtered);
      if (filtered.length > 0) {
        setSelectedWaiterId(filtered[0].id);
      }
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : 'Failed to load eligible waiters');
    } finally {
      setIsLoadingWaiters(false);
    }
  };

  // Submit Add Collaborator
  const submitAddCollaborator = async () => {
    if (!token || !collabOrderId || !selectedWaiterId) {
      setCollabError('Please select a waiter to assign.');
      return;
    }

    try {
      setIsSubmittingCollab(true);
      setCollabError(null);
      setErrorMessage(null);
      setActionSuccessMessage(null);

      const assignedCollab = await addCollaboratorApi(token, collabOrderId, selectedWaiterId);
      const selectedWaiterObj = eligibleWaiters.find((w) => w.id === selectedWaiterId);

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== collabOrderId) return o;
          const currentCollabs = o.collaborators || [];
          const newCollab: OrderCollaborator = {
            id: assignedCollab.id,
            orderId: collabOrderId,
            userId: selectedWaiterId,
            user: selectedWaiterObj
              ? { id: selectedWaiterObj.id, name: selectedWaiterObj.name, email: selectedWaiterObj.email, role: 'waiter' }
              : undefined,
            createdAt: new Date().toISOString(),
          };
          return {
            ...o,
            collaborators: [...currentCollabs, newCollab],
          };
        })
      );

      setCollabModalOpen(false);
      setActionSuccessMessage(`Waiter ${selectedWaiterObj?.name || ''} assigned as collaborator successfully`);
    } catch (err) {
      setCollabError(err instanceof Error ? err.message : 'Failed to add collaborator');
    } finally {
      setIsSubmittingCollab(false);
    }
  };

  // Handle Remove Collaborator
  const handleRemoveCollaborator = async (orderId: string, userId: string, waiterName?: string) => {
    if (!token) return;
    try {
      setErrorMessage(null);
      setActionSuccessMessage(null);

      await removeCollaboratorApi(token, orderId, userId);

      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return {
            ...o,
            collaborators: (o.collaborators || []).filter((c) => c.userId !== userId),
          };
        })
      );

      setActionSuccessMessage(`Collaborator ${waiterName || ''} removed successfully`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to remove collaborator');
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            data-testid="btn-export-orders-csv"
            onClick={handleExportCsv}
            className="btn btn-secondary"
            disabled={isLoading || isExportingCsv}
            title="Export day's orders as CSV"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Download size={16} />
            <span>{isExportingCsv ? 'Exporting...' : 'Export Orders (CSV)'}</span>
          </button>

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
      </div>


      {/* Search & Filter Toolbar */}
      <div
        className="glass-card"
        data-testid="order-search-filter-toolbar"
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
          }}
        >
          {/* Table Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Search Table
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none' }}
              />
              <input
                type="text"
                className="input-field"
                data-testid="search-table-input"
                placeholder="Search by table #..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ paddingLeft: '2.25rem' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Status
            </label>
            <select
              className="input-field"
              data-testid="filter-status-select"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              <option value="">All Statuses</option>
              <option value="placed">Placed</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="served">Served</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Waiter Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Waiter
            </label>
            <select
              className="input-field"
              data-testid="filter-waiter-select"
              value={waiterFilter}
              onChange={(e) => {
                setWaiterFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              <option value="">All Waiters</option>
              {waitersForFilter.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Date
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type="date"
                className="input-field"
                data-testid="filter-date-input"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
              {dateFilter && (
                <button
                  type="button"
                  aria-label="Clear date filter"
                  onClick={() => {
                    setDateFilter('');
                    setCurrentPage(1);
                  }}
                  style={{
                    position: 'absolute',
                    right: '2rem',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sorting & Reset Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid var(--border-glass)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              <ArrowUpDown size={14} />
              <span>Sort by:</span>
            </div>

            <select
              className="input-field"
              data-testid="sort-by-select"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as OrderSortField);
                setCurrentPage(1);
              }}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
            >
              <option value="createdAt">Placed Time</option>
              <option value="status">Status</option>
              <option value="tableNumber">Table Number</option>
            </select>

            <select
              className="input-field"
              data-testid="sort-order-select"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as OrderSortOrder);
                setCurrentPage(1);
              }}
              style={{ width: 'auto', padding: '0.35rem 0.65rem', fontSize: '0.8125rem' }}
            >
              <option value="desc">Descending (Newest / Z-A)</option>
              <option value="asc">Ascending (Oldest / A-Z)</option>
            </select>
          </div>

          {(searchQuery || statusFilter || waiterFilter || dateFilter || sortBy !== 'createdAt' || sortOrder !== 'desc') && (
            <button
              type="button"
              className="btn btn-secondary"
              data-testid="btn-reset-filters"
              onClick={handleResetFilters}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8125rem', color: '#f87171' }}
            >
              Reset Filters
            </button>
          )}
        </div>
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
            const isPrimaryWaiter = user?.id === order.primaryWaiterId;
            const isAssignedCollab = order.collaborators?.some((c) => c.userId === user?.id);
            const canManageThisOrderCollabs = user?.role === 'manager' || isPrimaryWaiter;

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {getStatusBadge(order.status)}
                        {isPrimaryWaiter && (
                          <span
                            data-testid={`badge-primary-waiter-${order.id}`}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '0.15rem 0.45rem',
                              background: 'rgba(99, 102, 241, 0.18)',
                              color: 'var(--accent-primary)',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            Primary Waiter
                          </span>
                        )}
                        {!isPrimaryWaiter && isAssignedCollab && (
                          <span
                            data-testid={`badge-collaborator-${order.id}`}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '0.15rem 0.45rem',
                              background: 'rgba(20, 184, 166, 0.18)',
                              color: '#2dd4bf',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            Collaborator
                          </span>
                        )}
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
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString()}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <User size={12} /> Waiter: {order.primaryWaiter?.name || order.primaryWaiterId}
                        </span>
                        {order.collaborators && order.collaborators.length > 0 && (
                          <span
                            data-testid={`collab-count-indicator-${order.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            <Users size={12} /> +{order.collaborators.length}{' '}
                            {order.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                          </span>
                        )}
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
                      data-testid={`expand-order-${order.id}`}
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

                    {/* Collaborators & Access Section */}
                    <div
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.65rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Users size={16} color="var(--accent-primary)" />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Collaborating Waiters ({order.collaborators?.length || 0})
                          </span>
                        </div>

                        {canManageThisOrderCollabs && isOpen && (
                          <button
                            className="btn btn-secondary"
                            data-testid={`btn-open-add-collab-${order.id}`}
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', gap: '0.35rem' }}
                            onClick={() => openAddCollaboratorDialog(order)}
                          >
                            <UserPlus size={13} /> Add Collaborator
                          </button>
                        )}
                      </div>

                      {(!order.collaborators || order.collaborators.length === 0) ? (
                        <div
                          data-testid={`no-collabs-${order.id}`}
                          style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}
                        >
                          No collaborators assigned yet. {canManageThisOrderCollabs ? 'Assign team members to collaborate on this order.' : ''}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {order.collaborators.map((c) => (
                            <div
                              key={c.id || c.userId}
                              data-testid={`collaborator-tag-${c.userId}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.45rem',
                                padding: '0.25rem 0.6rem',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              <span style={{ fontWeight: 500 }}>{c.user?.name || c.userId}</span>
                              {canManageThisOrderCollabs && isOpen && (
                                <button
                                  type="button"
                                  data-testid={`btn-remove-collab-${c.userId}`}
                                  aria-label={`Remove ${c.user?.name || 'collaborator'}`}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#f87171',
                                    cursor: 'pointer',
                                    padding: '0 0.1rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                  }}
                                  onClick={() => handleRemoveCollaborator(order.id, c.userId, c.user?.name)}
                                >
                                  <UserMinus size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Order Audit History Timeline (Phase 10 - Goal 9) */}
                    <div
                      className="glass-card"
                      data-testid={`order-timeline-section-${order.id}`}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                      }}
                    >
                      <div
                        data-testid={`btn-toggle-timeline-${order.id}`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleTimeline(order.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <History size={18} style={{ color: 'var(--accent-primary)' }} />
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                            Order History Timeline
                          </span>
                          {orderTimelines[order.id] && (
                            <span
                              className="badge"
                              data-testid={`timeline-count-badge-${order.id}`}
                              style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontSize: '0.75rem' }}
                            >
                              {orderTimelines[order.id].length} {orderTimelines[order.id].length === 1 ? 'event' : 'events'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            data-testid={`btn-refresh-timeline-${order.id}`}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              loadTimelineForOrder(order.id);
                            }}
                          >
                            <RotateCcw size={12} className={loadingTimelines[order.id] ? 'animate-spin' : ''} />
                            Refresh
                          </button>
                          {expandedTimelineOrders[order.id] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {expandedTimelineOrders[order.id] && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                          {loadingTimelines[order.id] && !orderTimelines[order.id] && (
                            <div data-testid={`timeline-loading-${order.id}`} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                              Loading order history...
                            </div>
                          )}

                          {timelineErrors[order.id] && (
                            <div data-testid={`timeline-error-${order.id}`} style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', fontSize: '0.8125rem' }}>
                              {timelineErrors[order.id]}
                            </div>
                          )}

                          {orderTimelines[order.id] && orderTimelines[order.id].length === 0 && (
                            <div data-testid={`timeline-empty-${order.id}`} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                              No timeline events recorded for this order yet.
                            </div>
                          )}

                          {orderTimelines[order.id] && orderTimelines[order.id].length > 0 && (
                            <div
                              data-testid={`timeline-events-list-${order.id}`}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                position: 'relative',
                                paddingLeft: '1.25rem',
                                borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                                marginLeft: '0.5rem',
                              }}
                            >
                              {orderTimelines[order.id].map((event, idx) => (
                                <div
                                  key={event.id || idx}
                                  data-testid={`timeline-event-${event.eventType}`}
                                  style={{
                                    position: 'relative',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.35rem',
                                    padding: '0.65rem 0.85rem',
                                    background: 'rgba(30, 41, 59, 0.6)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)',
                                  }}
                                >
                                  {/* Event node dot */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      left: '-1.65rem',
                                      top: '0.85rem',
                                      width: '10px',
                                      height: '10px',
                                      borderRadius: '50%',
                                      background:
                                        event.eventType === 'order_created'
                                          ? '#3b82f6'
                                          : event.eventType === 'line_voided'
                                          ? '#ef4444'
                                          : event.eventType === 'line_added'
                                          ? '#10b981'
                                          : event.eventType === 'collaborator_added'
                                          ? '#6366f1'
                                          : event.eventType === 'status_changed' && event.newStatus === 'cancelled'
                                          ? '#ef4444'
                                          : '#f59e0b',
                                      boxShadow: '0 0 6px rgba(0, 0, 0, 0.5)',
                                    }}
                                  />

                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <span
                                        className="badge"
                                        style={{
                                          fontSize: '0.6875rem',
                                          fontWeight: 700,
                                          textTransform: 'uppercase',
                                          letterSpacing: '0.05em',
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          color: 'var(--text-primary)',
                                        }}
                                      >
                                        {event.eventType.replace('_', ' ')}
                                      </span>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <User size={12} />
                                        <strong style={{ color: 'var(--text-primary)' }}>{event.actorName}</strong> ({event.actorRole})
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                                      {new Date(event.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </span>
                                  </div>

                                  {/* Event specific details */}
                                  {event.eventType === 'order_created' && (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                      {event.notes || 'Order placed'}
                                    </div>
                                  )}

                                  {event.eventType === 'status_changed' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.8125rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Status changed:</span>
                                        <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(255, 255, 255, 0.05)' }}>
                                          {event.oldStatus?.toUpperCase()}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
                                        <span className="badge" style={{ fontSize: '0.6875rem', background: 'rgba(99, 102, 241, 0.2)', color: 'var(--accent-primary)' }}>
                                          {event.newStatus?.toUpperCase()}
                                        </span>
                                      </div>
                                      {event.reason && (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                          Reason: "{event.reason}"
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {event.eventType === 'line_added' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8125rem' }}>
                                      <div style={{ color: 'var(--text-primary)' }}>
                                        Added <strong>{event.quantity}x {event.itemName}</strong>
                                        {event.unitPrice !== null && event.unitPrice !== undefined && ` ($${Number(event.unitPrice).toFixed(2)} each)`}
                                      </div>
                                      {event.notes && (
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                          Instructions: "{event.notes}"
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {event.eventType === 'line_voided' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.8125rem' }}>
                                      <div style={{ color: '#fca5a5' }}>
                                        Voided <strong>{event.quantity}x {event.itemName}</strong>
                                      </div>
                                      {event.reason && (
                                        <div style={{ color: '#f87171', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                          Void Reason: "{event.reason}"
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {(event.eventType === 'collaborator_added' || event.eventType === 'collaborator_removed') && (
                                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                      {event.notes}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
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

      {/* Pagination Footer */}
      {totalOrders > 0 && (
        <div
          className="glass-card"
          data-testid="pagination-container"
          style={{
            padding: '0.85rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            fontSize: '0.875rem',
          }}
        >
          <div
            data-testid="pagination-info"
            style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}
          >
            Showing <strong style={{ color: 'var(--text-primary)' }}>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {Math.min(currentPage * pageSize, totalOrders)}
            </strong>{' '}
            of <strong style={{ color: 'var(--text-primary)' }}>{totalOrders}</strong> {totalOrders === 1 ? 'order' : 'orders'}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page Size:</span>
              <select
                className="input-field"
                data-testid="page-size-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                data-testid="btn-prev-page"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <span
                data-testid="current-page-display"
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                Page {currentPage} of {Math.max(1, totalPages)}
              </span>

              <button
                type="button"
                className="btn btn-secondary"
                data-testid="btn-next-page"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
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

      {/* Add Collaborator Modal */}
      {collabModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-collab-title"
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
              <UserPlus size={22} />
              <h3 id="add-collab-title" style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-primary)' }}>
                Add Collaborator to {collabTableNumber}
              </h3>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Assign another waiter to collaborate on this ticket. Collaborators can view, update lifecycle status, add items, and void items.
            </p>

            {collabError && (
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
                {collabError}
              </div>
            )}

            {isLoadingWaiters ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Loading eligible waitstaff...
              </div>
            ) : eligibleWaiters.length === 0 ? (
              <div
                data-testid="no-eligible-waiters-msg"
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  textAlign: 'center',
                }}
              >
                No other eligible waiters available to assign.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Select Waiter <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  className="input-field"
                  data-testid="collab-select-waiter"
                  value={selectedWaiterId}
                  onChange={(e) => setSelectedWaiterId(e.target.value)}
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  {eligibleWaiters.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCollabModalOpen(false)}
                disabled={isSubmittingCollab}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                data-testid="confirm-add-collab-btn"
                onClick={submitAddCollaborator}
                disabled={isSubmittingCollab || isLoadingWaiters || eligibleWaiters.length === 0}
              >
                {isSubmittingCollab ? 'Assigning...' : 'Assign Collaborator'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

