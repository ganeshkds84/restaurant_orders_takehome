import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MenuItem } from '../types/menu';
import { Order, CreateOrderItemPayload } from '../types/order';
import { fetchMenuItemsApi } from '../services/menu.service';
import { createOrderApi } from '../services/order.service';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Utensils,
  Clock,
  UserCheck,
} from 'lucide-react';

interface SelectedItemState {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions: string;
}

interface OrderCreationProps {
  onOrderCreated?: (order: Order) => void;
}

export const OrderCreation: React.FC<OrderCreationProps> = ({ onOrderCreated }) => {
  const { token, user } = useAuth();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [tableNumber, setTableNumber] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Map<string, SelectedItemState>>(new Map());

  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // Fetch available menu items
  const loadMenu = async () => {
    if (!token) return;
    try {
      setIsLoadingMenu(true);
      setErrorMessage(null);
      const items = await fetchMenuItemsApi(token, { includeArchived: false, isAvailable: true });
      setMenuItems(items);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load menu items');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, [token]);

  const categories = ['All', ...Array.from(new Set(menuItems.map((item) => item.category)))];

  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) {
      return false;
    }
    return true;
  });

  const handleAddItem = (item: MenuItem) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.id);
      if (existing) {
        next.set(item.id, {
          ...existing,
          quantity: existing.quantity + 1,
        });
      } else {
        next.set(item.id, {
          menuItem: item,
          quantity: 1,
          specialInstructions: '',
        });
      }
      return next;
    });
    setSuccessOrder(null);
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;

      const newQty = existing.quantity + delta;
      if (newQty <= 0) {
        next.delete(itemId);
      } else {
        next.set(itemId, { ...existing, quantity: newQty });
      }
      return next;
    });
  };

  const handleUpdateInstructions = (itemId: string, instructions: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (!existing) return prev;

      next.set(itemId, { ...existing, specialInstructions: instructions });
      return next;
    });
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const handleClearOrder = () => {
    setSelectedItems(new Map());
    setTableNumber('');
    setErrorMessage(null);
    setSuccessOrder(null);
  };

  const estimatedTotal = Array.from(selectedItems.values()).reduce(
    (sum, line) => sum + line.menuItem.price * line.quantity,
    0
  );

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const trimmedTable = tableNumber.trim();
    if (!trimmedTable) {
      setErrorMessage('Table number is required');
      return;
    }

    if (selectedItems.size === 0) {
      setErrorMessage('Please add at least one menu item to the order');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const itemsPayload: CreateOrderItemPayload[] = Array.from(selectedItems.values()).map(
        (line) => ({
          menuItemId: line.menuItem.id,
          quantity: line.quantity,
          specialInstructions: line.specialInstructions.trim() || undefined,
        })
      );

      const createdOrder = await createOrderApi(token, {
        tableNumber: trimmedTable,
        items: itemsPayload,
      });

      setSuccessOrder(createdOrder);
      setSelectedItems(new Map());
      setTableNumber('');
      if (onOrderCreated) {
        onOrderCreated(createdOrder);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Status Section */}
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
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Create New Order</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Select dishes, specify quantities & special requests, and dispatch to the kitchen ticket queue.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={loadMenu}
            className="btn btn-secondary"
            title="Refresh menu availability"
            disabled={isLoadingMenu}
          >
            <RotateCcw size={16} />
            <span>Refresh Menu</span>
          </button>
        </div>
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

      {/* Order Creation Success Card */}
      {successOrder && (
        <div
          data-testid="order-created-success"
          className="glass-card"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircle2 size={24} color="#10b981" />
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#6ee7b7' }}>
                  Order Successfully Created! (Table {successOrder.tableNumber})
                </h3>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Clock size={13} /> {new Date(successOrder.createdAt).toLocaleTimeString()}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <UserCheck size={13} /> Waiter: {user?.name}
                  </span>
                  <span className="badge badge-manager" style={{ textTransform: 'uppercase' }}>
                    Status: {successOrder.status}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Authoritative Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }} data-testid="created-order-total">
                ${successOrder.totalPrice.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(16, 185, 129, 0.2)', paddingTop: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Persisted Order Lines (Historical Snapshot):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {successOrder.lines.map((line) => (
                <div
                  key={line.id}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.6rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>
                      {line.quantity}x {line.itemName}
                    </span>
                    <span style={{ color: 'var(--accent-primary)' }}>${line.lineTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                    Unit snapshot: ${line.unitPrice.toFixed(2)}
                  </div>
                  {line.specialInstructions && (
                    <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontStyle: 'italic', marginTop: '0.25rem' }}>
                      &ldquo;{line.specialInstructions}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Menu Item Selector + Order Ticket Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Menu Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Category Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8125rem',
                  fontWeight: selectedCategory === cat ? 600 : 500,
                  background: selectedCategory === cat ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-glass)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all var(--transition-fast)',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Menu Items Grid */}
          {isLoadingMenu ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading available dishes...
            </div>
          ) : filteredMenuItems.length === 0 ? (
            <div
              className="glass-card"
              style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-secondary)' }}
            >
              <Utensils size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <p>No available menu items found in this category.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
              {filteredMenuItems.map((item) => {
                const selected = selectedItems.get(item.id);
                return (
                  <div
                    key={item.id}
                    className="glass-card"
                    data-testid={`menu-select-card-${item.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      padding: '1.1rem',
                      border: selected ? '1px solid var(--accent-primary)' : '1px solid var(--border-glass)',
                      background: selected ? 'rgba(99, 102, 241, 0.06)' : 'var(--bg-card)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                          {item.name}
                        </h4>
                        <span
                          style={{
                            fontSize: '1rem',
                            fontWeight: 700,
                            color: '#34d399',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ${item.price.toFixed(2)}
                        </span>
                      </div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.7rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          marginTop: '0.2rem',
                        }}
                      >
                        {item.category}
                      </span>
                      {item.description && (
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            margin: '0.5rem 0 0',
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                      {selected ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, -1)}
                              aria-label={`Decrease ${item.name}`}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Minus size={14} />
                            </button>
                            <span
                              style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center' }}
                              data-testid={`qty-count-${item.id}`}
                            >
                              {selected.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item.id, 1)}
                              aria-label={`Increase ${item.name}`}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            ${(item.price * selected.quantity).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className="btn btn-secondary"
                          style={{ width: '100%', fontSize: '0.8125rem', padding: '0.45rem' }}
                          data-testid={`add-item-btn-${item.id}`}
                        >
                          <Plus size={14} />
                          <span>Add to Ticket</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Order Ticket / Cart */}
        <div
          className="glass-card"
          style={{
            position: 'sticky',
            top: '5.5rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag size={20} color="var(--accent-primary)" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Order Ticket</h3>
            </div>
            {selectedItems.size > 0 && (
              <button
                type="button"
                onClick={handleClearOrder}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <Trash2 size={12} /> Clear
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitOrder} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Table Number Input */}
            <div>
              <label
                htmlFor="order-table-number"
                style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-secondary)' }}
              >
                Table Identifier *
              </label>
              <input
                id="order-table-number"
                data-testid="order-table-number-input"
                type="text"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                placeholder="e.g. Table 12, Booth 4, Patio 2"
                style={{
                  width: '100%',
                  padding: '0.625rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Selected Items List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '340px', overflowY: 'auto' }}>
              {selectedItems.size === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  No items on this ticket yet. Click &ldquo;Add to Ticket&rdquo; on any dish.
                </div>
              ) : (
                Array.from(selectedItems.values()).map(({ menuItem, quantity, specialInstructions }) => (
                  <div
                    key={menuItem.id}
                    style={{
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.4rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {quantity}x {menuItem.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#34d399' }}>
                          ${(menuItem.price * quantity).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(menuItem.id)}
                          aria-label={`Remove ${menuItem.name}`}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Special instructions (e.g. no onions)"
                      value={specialInstructions}
                      onChange={(e) => handleUpdateInstructions(menuItem.id, e.target.value)}
                      data-testid={`instruction-input-${menuItem.id}`}
                      style={{
                        width: '100%',
                        padding: '0.35rem 0.6rem',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-glass)',
                        color: 'var(--text-primary)',
                      }}
                      disabled={isSubmitting}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Price Preview & Submit Button */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estimated Subtotal</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }} data-testid="order-preview-total">
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                * Authoritative total and price snapshots are calculated strictly by the server upon submission.
              </div>

              <button
                type="submit"
                id="submit-order-button"
                data-testid="submit-order-btn"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={isSubmitting || selectedItems.size === 0}
              >
                <Sparkles size={16} />
                <span>{isSubmitting ? 'Creating Order...' : 'Send Order to Kitchen'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
