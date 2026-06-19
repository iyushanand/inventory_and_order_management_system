import React, { useState, useEffect } from 'react';

export default function Customers({ apiBaseUrl }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/customers`);
      if (!res.ok) throw new Error('Failed to load customers');
      const data = await res.json();
      setCustomers(data);
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
    if (!formName.trim()) errors.name = 'Full name is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formEmail)) {
      errors.email = 'Invalid email format (e.g., name@example.com)';
    }

    if (!formPhone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (formPhone.trim().length < 5) {
      errors.phone = 'Phone number must be at least 5 digits';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openAddModal = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formName.trim(),
      email: formEmail.trim().toLowerCase(),
      phone: formPhone.trim()
    };

    try {
      const res = await fetch(`${apiBaseUrl}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save customer');
      }

      showNotification(`Customer "${payload.name}" successfully created.`);
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      setFormErrors({ api: err.message });
    }
  };

  const handleDeleteCustomer = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete customer "${customer.name}"?`)) return;

    try {
      const res = await fetch(`${apiBaseUrl}/customers/${customer.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete customer');
      }

      showNotification(`Customer "${customer.name}" successfully deleted.`);
      fetchCustomers();
    } catch (err) {
      showNotification(err.message, false);
    }
  };

  return (
    <div className="customers-view">
      <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Customers Database</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <line x1="19" y1="8" x2="19" y2="14"></line>
            <line x1="16" y1="11" x2="22" y2="11"></line>
          </svg>
          Add Customer
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
          <p>Loading customers list...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <div className="success-icon-wrapper" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <h4 style={{ marginTop: '16px', fontSize: '1.1rem' }}>No Customers Registered</h4>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Register new customers to enable order placement.</p>
          <button className="btn btn-primary btn-sm" onClick={openAddModal}>Add Customer</button>
        </div>
      ) : (
        <div className="table-container glass-panel fade-in">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Email Address</th>
                <th>Phone Number</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td><code>{customer.email}</code></td>
                  <td>{customer.phone}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCustomer(customer)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Register New Customer</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {formErrors.api && (
                <div className="alert alert-danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
                  <span>{formErrors.api}</span>
                </div>
              )}

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., Alice Vance"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
                {formErrors.name && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., alice.vance@example.com"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                />
                {formErrors.email && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., +1 (555) 019-2834"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                />
                {formErrors.phone && <span className="helper-text" style={{ color: 'var(--danger)' }}>{formErrors.phone}</span>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
