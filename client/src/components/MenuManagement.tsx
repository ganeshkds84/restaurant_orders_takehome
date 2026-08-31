import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  MenuItem,
  CreateMenuItemPayload,
  UpdateMenuItemPayload,
} from '../types/menu';
import {
  fetchMenuItemsApi,
  createMenuItemApi,
  updateMenuItemApi,
  toggleMenuItemAvailabilityApi,
  toggleMenuItemArchiveApi,
} from '../services/menu.service';
import {
  Plus,
  Search,
  Edit2,
  Archive,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UtensilsCrossed,
  Tag,
  DollarSign,
  Lock,
  RefreshCw,
} from 'lucide-react';

export const MenuManagement: React.FC = () => {
  const { user, token } = useAuth();
  const isManager = user?.role === 'manager';

  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs state
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    category: string;
    price: string;
    isAvailable: boolean;
  }>({
    name: '',
    description: '',
    category: 'Mains',
    price: '',
    isAvailable: true,
  });

  const loadMenuItems = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchMenuItemsApi(token, {
        includeArchived: isManager ? showArchived : false,
      });
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load menu items';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, [token, isManager, showArchived]);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Derived categories
  const categories = useMemo(() => {
    const cats = new Set<string>(['All']);
    items.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesArchive = showArchived ? true : !item.isArchived;
      return matchesSearch && matchesCat && matchesArchive;
    });
  }, [items, searchQuery, selectedCategory, showArchived]);

  // Handle Availability Toggle
  const handleToggleAvailability = async (item: MenuItem) => {
    if (!isManager || !token) return;
    try {
      const newStatus = !item.isAvailable;
      const updated = await toggleMenuItemAvailabilityApi(token, item.id, newStatus);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setSuccessMessage(
        `"${item.name}" marked as ${newStatus ? 'available' : 'unavailable (86\'d)'}`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update availability');
    }
  };

  // Handle Archive Toggle
  const handleToggleArchive = async (item: MenuItem) => {
    if (!isManager || !token) return;
    try {
      const newStatus = !item.isArchived;
      const updated = await toggleMenuItemArchiveApi(token, item.id, newStatus);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      setSuccessMessage(
        `"${item.name}" ${newStatus ? 'archived' : 'restored'} successfully`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update archive status');
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Mains',
      price: '',
      isAvailable: true,
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      category: item.category,
      price: item.price.toFixed(2),
      isAvailable: item.isAvailable,
    });
    setFormError(null);
  };

  // Submit Create or Edit Form
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isManager) return;

    setFormError(null);
    const parsedPrice = parseFloat(formData.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Please provide a valid non-negative price (e.g. 14.50)');
      return;
    }
    if (!formData.name.trim()) {
      setFormError('Item name is required');
      return;
    }
    if (!formData.category.trim()) {
      setFormError('Category is required');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingItem) {
        // Update
        const payload: UpdateMenuItemPayload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category.trim(),
          price: Number(parsedPrice.toFixed(2)),
          isAvailable: formData.isAvailable,
        };
        const updated = await updateMenuItemApi(token, editingItem.id, payload);
        setItems((prev) => prev.map((i) => (i.id === editingItem.id ? updated : i)));
        setEditingItem(null);
        setSuccessMessage(`"${updated.name}" updated successfully`);
      } else {
        // Create
        const payload: CreateMenuItemPayload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          category: formData.category.trim(),
          price: Number(parsedPrice.toFixed(2)),
          isAvailable: formData.isAvailable,
        };
        const created = await createMenuItemApi(token, payload);
        setItems((prev) => [created, ...prev]);
        setIsCreateModalOpen(false);
        setSuccessMessage(`"${created.name}" created successfully`);
      }
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Role Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(236, 72, 153, 0.2))',
              border: '1px solid var(--border-glass)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
              Menu Catalog & Availability
            </h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {isManager
                ? 'Manager Mode: Create dishes, adjust prices, toggle live 86\'d availability, and archive items.'
                : 'Waiter Mode: Live catalog view. Availability is synchronized with kitchen in real time.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={loadMenuItems}
            disabled={isLoading}
            className="btn btn-secondary"
            title="Refresh menu items"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem' }}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          {isManager ? (
            <button
              id="btn-add-menu-item"
              onClick={handleOpenCreateModal}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              <span>Add Menu Item</span>
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.5rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                fontSize: '0.8125rem',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Lock size={14} />
              <span>Catalog Edit: Manager Only</span>
            </div>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success-text)',
            fontSize: '0.9375rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--alert-bg)',
            border: '1px solid var(--alert-border)',
            color: 'var(--alert-text)',
            fontSize: '0.9375rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Controls & Filters Bar */}
      <div
        className="glass-card"
        style={{
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              flex: '1 1 260px',
              maxWidth: '400px',
            }}
          >
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '0.875rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              id="menu-search-input"
              placeholder="Search dishes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
            />
          </div>

          {/* Manager Archive Toggle */}
          {isManager && (
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                id="checkbox-show-archived"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
              <span>Show Archived Dishes</span>
            </label>
          )}
        </div>

        {/* Category Pills */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>
            Categories:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: selectedCategory === cat ? 600 : 400,
                backgroundColor:
                  selectedCategory === cat ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                color: selectedCategory === cat ? '#ffffff' : 'var(--text-secondary)',
                border:
                  selectedCategory === cat
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-subtle)',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0' }}>
          <div className="pulse-dot pulse-dot-amber" style={{ width: '16px', height: '16px', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="glass-card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <UtensilsCrossed size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>No menu items found</h3>
          <p style={{ fontSize: '0.875rem' }}>
            {searchQuery || selectedCategory !== 'All'
              ? 'Try changing your search or category filters.'
              : 'No items currently available in the menu.'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-card"
              data-testid={`menu-item-card-${item.id}`}
              style={{
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1rem',
                border: item.isArchived
                  ? '1px dashed rgba(255, 255, 255, 0.2)'
                  : !item.isAvailable
                  ? '1px solid rgba(239, 68, 68, 0.3)'
                  : '1px solid var(--border-glass)',
                opacity: item.isArchived ? 0.65 : 1,
                position: 'relative',
              }}
            >
              <div>
                {/* Category & Status Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Tag size={12} />
                    {item.category}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {item.isArchived && (
                      <span
                        style={{
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'rgba(107, 114, 128, 0.2)',
                          color: 'var(--text-muted)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        Archived
                      </span>
                    )}

                    <span
                      style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: item.isAvailable
                          ? 'var(--success-bg)'
                          : 'var(--alert-bg)',
                        color: item.isAvailable ? 'var(--success-text)' : 'var(--alert-text)',
                        border: `1px solid ${
                          item.isAvailable ? 'var(--success-border)' : 'var(--alert-border)'
                        }`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                      }}
                    >
                      {item.isAvailable ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {item.isAvailable ? 'Available' : 'Unavailable (86\'d)'}
                    </span>
                  </div>
                </div>

                {/* Dish Name & Price */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: '0.5rem',
                    gap: '0.5rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 700,
                      margin: 0,
                      color: item.isAvailable ? 'var(--text-primary)' : 'var(--text-secondary)',
                      textDecoration: item.isArchived ? 'line-through' : 'none',
                    }}
                  >
                    {item.name}
                  </h3>
                  <span
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: 'var(--accent-secondary)',
                      fontFamily: 'var(--font-sans)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ${item.price.toFixed(2)}
                  </span>
                </div>

                {/* Description */}
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {item.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>No description provided.</span>}
                </p>
              </div>

              {/* Action Controls */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--border-subtle)',
                  marginTop: '0.25rem',
                }}
              >
                {isManager ? (
                  <>
                    {/* Manager Live Availability Toggle */}
                    <button
                      type="button"
                      data-testid={`toggle-availability-${item.id}`}
                      onClick={() => handleToggleAvailability(item)}
                      className="btn"
                      style={{
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: item.isAvailable
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(16, 185, 129, 0.15)',
                        color: item.isAvailable ? '#fca5a5' : '#6ee7b7',
                        border: `1px solid ${
                          item.isAvailable ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                        }`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                      }}
                    >
                      {item.isAvailable ? 'Mark 86\'d' : 'Mark Available'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {/* Edit Button */}
                      <button
                        type="button"
                        data-testid={`edit-item-${item.id}`}
                        onClick={() => handleOpenEditModal(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        title="Edit Dish"
                      >
                        <Edit2 size={13} />
                        <span style={{ marginLeft: '0.3rem' }}>Edit</span>
                      </button>

                      {/* Archive / Restore Button */}
                      <button
                        type="button"
                        data-testid={`archive-item-${item.id}`}
                        onClick={() => handleToggleArchive(item)}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        title={item.isArchived ? 'Restore Dish' : 'Archive Dish'}
                      >
                        {item.isArchived ? (
                          <>
                            <RotateCcw size={13} />
                            <span style={{ marginLeft: '0.3rem' }}>Restore</span>
                          </>
                        ) : (
                          <>
                            <Archive size={13} />
                            <span style={{ marginLeft: '0.3rem' }}>Archive</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <span>Status: {item.isAvailable ? 'Active for Orders' : 'Currently 86\'d'}</span>
                    <span style={{ fontStyle: 'italic' }}>Waiter: View Only</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create or Edit Menu Item */}
      {(isCreateModalOpen || editingItem) && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: '520px',
              padding: '2rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-glass)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingItem(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.6rem' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--alert-bg)',
                  border: '1px solid var(--alert-border)',
                  color: 'var(--alert-text)',
                  fontSize: '0.875rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label
                  htmlFor="menu-item-name"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}
                >
                  Dish Name *
                </label>
                <input
                  id="menu-item-name"
                  type="text"
                  required
                  placeholder="e.g. Lobster Ravioli"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="menu-item-category"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}
                  >
                    Category *
                  </label>
                  <select
                    id="menu-item-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input"
                    style={{ width: '100%' }}
                  >
                    <option value="Appetizers">Appetizers</option>
                    <option value="Mains">Mains</option>
                    <option value="Sides">Sides</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Beverages">Beverages</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="menu-item-price"
                    style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}
                  >
                    Price ($) *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <DollarSign
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)',
                      }}
                    />
                    <input
                      id="menu-item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      placeholder="18.50"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="input"
                      style={{ paddingLeft: '2.25rem', width: '100%' }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="menu-item-description"
                  style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}
                >
                  Description & Ingredients
                </label>
                <textarea
                  id="menu-item-description"
                  rows={3}
                  placeholder="Ingredients, preparation notes, allergen information..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                  }}
                >
                  <input
                    id="menu-item-available"
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                  <span>Mark as Available for ordering immediately</span>
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="btn btn-secondary"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="btn-save-menu-item"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Save Changes'
                    : 'Create Menu Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
