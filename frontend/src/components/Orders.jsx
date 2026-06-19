import React, { useState, useEffect } from 'react';

export default function Orders({ apiBaseUrl }) {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // UI States
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Order Form States
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [orderItems, setOrderItems] = useState([{ product_id: '', quantity: 1, stockLimit: 0, price: 0, sku: '', name: '' }]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      // Fetch orders, customers, and products in parallel
      const [resOrders, resCustomers, resProducts] = await Promise.all([
        fetch(`${apiBaseUrl}/orders`),
        fetch(`${apiBaseUrl}/customers`),
        fetch(`${apiBaseUrl}/products`)
      ]);

      if (!resOrders.ok || !resCustomers.ok || !resProducts.ok) {
        throw new Error('Failed to load required orders/customers/products lists');
      }

      const [dataOrders, dataCustomers, dataProducts] = await Promise.all([
        resOrders.json(),
        resCustomers.json(),
        resProducts.json()
      ]);

      setOrders(dataOrders);
      setCustomers(dataCustomers);
      setProducts(dataProducts);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(null), 5000);
    }
  };

  const toggleOrderExpand = (orderId) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
    } else {
      setExpandedOrderId(orderId);
    }
  };

  const openCreateModal = () => {
    // Reset form states
    setSelectedCustomerId('');
    setOrderItems([{ product_id: '', quantity: 1, stockLimit: 0, price: 0, sku: '', name: '' }]);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Manage Order Items Builder
  const handleItemProductChange = (index, productId) => {
    const updatedItems = [...orderItems];
    const product = products.find(p => p.id === parseInt(productId, 10));

    if (product) {
      updatedItems[index].product_id = product.id;
      updatedItems[index].name = product.name;
      updatedItems[index].sku = product.sku;
      updatedItems[index].price = product.price;
      updatedItems[index].stockLimit = product.quantity_in_stock;
      
      // Auto-adjust quantity if it exceeds stock limit
      if (updatedItems[index].quantity > product.quantity_in_stock) {
        updatedItems[index].quantity = product.quantity_in_stock > 0 ? 1 : 0;
      }
    } else {
      updatedItems[index].product_id = '';
      updatedItems[index].name = '';
      updatedItems[index].sku = '';
      updatedItems[index].price = 0;
      updatedItems[index].stockLimit = 0;
      updatedItems[index].quantity = 1;
    }
    
    setOrderItems(updatedItems);
  };

  const handleItemQuantityChange = (index, qty) => {
    const updatedItems = [...orderItems];
    const parsedQty = parseInt(qty, 10);
    
    updatedItems[index].quantity = isNaN(parsedQty) ? '' : parsedQty;
    setOrderItems(updatedItems);
  };

  const addNewItemRow = () => {
    setOrderItems([...orderItems, { product_id: '', quantity: 1, stockLimit: 0, price: 0, sku: '', name: '' }]);
  };

  const removeItemRow = (index) => {
    if (orderItems.length === 1) return; // Must have at least 1 item
    const updatedItems = orderItems.filter((_, idx) => idx !== index);
    setOrderItems(updatedItems);
  };

  const calculateLiveTotal = () => {
    return orderItems.reduce((acc, item) => {
      const q = parseInt(item.quantity, 10) || 0;
      return acc + (q * item.price);
    }, 0);
  };

  const validateOrderForm = () => {
    const errors = {};
    if (!selectedCustomerId) errors.customer = 'Please select a customer';
    
    const itemsErrors = [];
    orderItems.forEach((item, index) => {
      const itemErr = {};
      if (!item.product_id) {
        itemErr.product = 'Select a product';
      }
      
      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        itemErr.quantity = 'Must be greater than 0';
      } else if (qty > item.stockLimit) {
        itemErr.quantity = `Max available is ${item.stockLimit}`;
      }
      
      if (Object.keys(itemErr).length > 0) {
        itemsErrors[index] = itemErr;
      }
    });

    if (itemsErrors.length > 0) {
      errors.items = itemsErrors;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!validateOrderForm()) return;

    const payload = {
      customer_id: parseInt(selectedCustomerId, 10),
      items: orderItems.map(item => ({
        product_id: parseInt(item.product_id, 10),
        quantity: parseInt(item.quantity, 10)
      }))
    };

    try {
      const res = await fetch(`${apiBaseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to place order');
      }

      showNotification(`Order placed successfully! Total Amount: $${data.total_amount.toFixed(2)}`);
      setIsModalOpen(false);
      fetchOrdersData();
    } catch (err) {
      setFormErrors({ api: err.message });
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel/delete order #${order.id}? This will restore product stocks.`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/orders/${order.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to cancel order');
      }

      showNotification(`Order #${order.id} cancelled. Restored product quantities.`);
      fetchOrdersData();
    } catch (err) {
      showNotification(err.message, false);
    }
  };

  return (
    <div className="orders-view">
      <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Order Desk</h2>
        <button className="btn btn-primary" onClick={openCreateModal} disabled={customers.length === 0 || products.length === 0}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <plus-circle></plus-circle>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Order
        </button>
      </div>

      {customers.length === 0 && !loading && (
        <div className="alert alert-warning fade-in" style={{ marginBottom: '16px' }}>
          <span>Warning: You must register at least one Customer before placing an order.</span>
        </div>
      )}
      {products.length === 0 && !loading && (
        <div className="alert alert-warning fade-in" style={{ marginBottom: '16px' }}>
          <span>Warning: You must add at least one Product to the catalog before placing an order.</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success fade-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-danger fade-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="dashboard-loading">
          <div className="spinner"></div>
          <p>Loading orders list...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="success-icon-wrapper" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
          </div>
          <h4 style={{ marginTop: '16px', fontSize: '1.1rem' }}>No Orders Recorded</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create orders to track products sales and checkouts.</p>
          <button className="btn btn-primary btn-sm" onClick={openCreateModal} disabled={customers.length === 0 || products.length === 0}>
            Create Order
          </button>
        </div>
      ) : (
        <div className="table-container glass-panel fade-in">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Date Placed</th>
                <th>Items Count</th>
                <th>Total Value</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;
                const date = new Date(order.created_at).toLocaleString();
                const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

                return (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td>
                        <button
                          onClick={() => toggleOrderExpand(order.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </button>
                      </td>
                      <td><code>#ORD-{order.id}</code></td>
                      <td><strong>{order.customer?.name || `Customer ID: ${order.customer_id}`}</strong></td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{date}</td>
                      <td>{totalItems} unit(s)</td>
                      <td className="font-semibold" style={{ color: 'var(--success)' }}>
                        ${order.total_amount.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleCancelOrder(order)}>
                          Cancel Order
                        </button>
                      </td>
                    </tr>

                    {/* Expanded details row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan="7" style={{ padding: '0 20px 20px 20px', background: 'rgba(255, 255, 255, 0.01)' }}>
                          <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Checkout Items Detail
                            </h4>
                            
                            <table style={{ background: 'transparent' }}>
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <th style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'transparent' }}>Product Name</th>
                                  <th style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'transparent' }}>SKU</th>
                                  <th style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'transparent' }}>Unit Price</th>
                                  <th style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'transparent' }}>Quantity</th>
                                  <th style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'transparent', textAlign: 'right' }}>Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {order.items.map((item) => (
                                  <tr key={item.id}>
                                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{item.product?.name || `Product ID: ${item.product_id}`}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}><code>{item.product?.sku || 'N/A'}</code></td>
                                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>${item.unit_price.toFixed(2)}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '0.85rem' }}>{item.quantity}</td>
                                    <td style={{ padding: '10px 12px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>
                                      ${(item.unit_price * item.quantity).toFixed(2)}
                                    </td>
                                  </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                                  <td colSpan="4" style={{ padding: '12px 12px 0 12px', textAlign: 'right' }}>Total Amount:</td>
                                  <td style={{ padding: '12px 12px 0 12px', textAlign: 'right', color: 'var(--success)' }}>
                                    ${order.total_amount.toFixed(2)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Order Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Create New Order</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleCreateOrderSubmit}>
              {formErrors.api && (
                <div className="alert alert-danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
                  <span>{formErrors.api}</span>
                </div>
              )}

              {/* Customer selection */}
              <div className="form-group">
                <label>Select Customer</label>
                <select
                  className="form-control"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  style={{ background: 'var(--bg-primary)' }}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
                {formErrors.customer && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.customer}</span>}
              </div>

              {/* Items Section */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Order Items</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={addNewItemRow}>
                    + Add Item
                  </button>
                </div>

                {orderItems.map((item, idx) => {
                  const itemErr = formErrors.items?.[idx] || {};
                  return (
                    <div className="form-row" key={idx} style={{ marginBottom: '14px', alignItems: 'flex-start' }}>
                      {/* Product selection */}
                      <div style={{ flex: 2 }}>
                        <select
                          className="form-control"
                          value={item.product_id}
                          onChange={(e) => handleItemProductChange(idx, e.target.value)}
                          style={{ background: 'var(--bg-primary)' }}
                        >
                          <option value="">-- Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.quantity_in_stock <= 0}>
                              {p.name} (${p.price.toFixed(2)} - Stock: {p.quantity_in_stock})
                            </option>
                          ))}
                        </select>
                        {itemErr.product && <span className="helper-text" style={{ color: 'var(--danger)', display: 'block' }}>{itemErr.product}</span>}
                      </div>

                      {/* Quantity input */}
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          className="form-control"
                          value={item.quantity}
                          onChange={(e) => handleItemQuantityChange(idx, e.target.value)}
                          disabled={!item.product_id}
                        />
                        {itemErr.quantity && <span className="helper-text" style={{ color: 'var(--danger)', display: 'block' }}>{itemErr.quantity}</span>}
                      </div>

                      {/* Line subtotal */}
                      <div style={{ display: 'flex', alignItems: 'center', height: '45px', padding: '0 10px', fontSize: '0.9rem', minWidth: '80px', justifyContent: 'flex-end', fontWeight: 600 }}>
                        ${((parseInt(item.quantity, 10) || 0) * item.price).toFixed(2)}
                      </div>

                      {/* Delete item button */}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => removeItemRow(idx)}
                        disabled={orderItems.length === 1}
                        style={{ height: '42px', padding: '0 12px' }}
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Order total display */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingPoint: '16px', paddingTop: '16px', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Calculated Total Amount:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                  ${calculateLiveTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={orderItems.length === 0}>
                  Place Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
