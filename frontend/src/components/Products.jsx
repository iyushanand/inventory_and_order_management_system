import React, { useState, useEffect } from 'react';

export default function Products({ apiBaseUrl }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedProductId, setSelectedProductId] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formQuantity, setFormQuantity] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/products`);
      if (!res.ok) throw new Error('Failed to load products');
      const data = await res.json();
      setProducts(data);
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

  const validateForm = () => {
    const errors = {};
    if (!formName.trim()) errors.name = 'Product name is required';
    if (!formSku.trim()) errors.sku = 'SKU is required';
    
    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      errors.price = 'Price must be a valid positive number';
    }
    
    const qtyNum = parseInt(formQuantity, 10);
    if (isNaN(qtyNum) || qtyNum < 0) {
      errors.quantity = 'Quantity must be a valid non-negative integer';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openAddModal = () => {
    setModalMode('add');
    setFormName('');
    setFormSku('');
    setFormPrice('');
    setFormQuantity('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setModalMode('edit');
    setSelectedProductId(product.id);
    setFormName(product.name);
    setFormSku(product.sku);
    setFormPrice(product.price.toString());
    setFormQuantity(product.quantity_in_stock.toString());
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formName.trim(),
      sku: formSku.trim(),
      price: parseFloat(formPrice),
      quantity_in_stock: parseInt(formQuantity, 10)
    };

    try {
      let url = `${apiBaseUrl}/products`;
      let method = 'POST';

      if (modalMode === 'edit') {
        url = `${apiBaseUrl}/products/${selectedProductId}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save product');
      }

      showNotification(`Product "${payload.name}" successfully ${modalMode === 'add' ? 'created' : 'updated'}.`);
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      setFormErrors({ api: err.message });
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/products/${product.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete product');
      }

      showNotification(`Product "${product.name}" successfully deleted.`);
      fetchProducts();
    } catch (err) {
      showNotification(err.message, false);
    }
  };

  return (
    <div className="products-view">
      <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Products Catalog</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Product
        </button>
      </div>

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
          <p>Loading products list...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="success-icon-wrapper" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <h4 style={{ marginTop: '16px', fontSize: '1.1rem' }}>No Products Available</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Get started by adding your first product to the catalog.</p>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>Add Product</button>
        </div>
      ) : (
        <div className="table-container glass-panel fade-in">
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>SKU Code</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isOut = product.quantity_in_stock === 0;
                const isLow = product.quantity_in_stock < 10;
                
                return (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong></td>
                    <td><code>{product.sku}</code></td>
                    <td>${product.price.toFixed(2)}</td>
                    <td>{product.quantity_in_stock}</td>
                    <td>
                      <span className={`badge ${isOut ? 'badge-danger' : isLow ? 'badge-warning' : 'badge-success'}`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(product)}>
                          Edit
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteProduct(product)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>{modalMode === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              {formErrors.api && (
                <div className="alert alert-danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
                  <span>{formErrors.api}</span>
                </div>
              )}

              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Wireless Gaming Mouse"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                {formErrors.name && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>SKU / Product Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., MOUSE-WRLS-01"
                  value={formSku}
                  onChange={(e) => setFormSku(e.target.value)}
                  disabled={modalMode === 'edit'} // SKU usually shouldn't change
                />
                {formErrors.sku && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.sku}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    placeholder="0.00"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                  />
                  {formErrors.price && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label>Quantity in Stock</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="0"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(e.target.value)}
                  />
                  {formErrors.quantity && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.quantity}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Save Product' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
