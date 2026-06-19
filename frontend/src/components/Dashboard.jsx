import React, { useState, useEffect } from 'react';

export default function Dashboard({ apiBaseUrl }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/dashboard-stats`);
      if (!res.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }
      const data = await res.json();
      setStats(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger fade-in">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Error loading dashboard stats: {error}</span>
        <button className="btn btn-secondary btn-sm" onClick={fetchStats} style={{ marginLeft: 'auto' }}>Retry</button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Products',
      value: stats?.total_products || 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      ),
      class: 'primary-accent'
    },
    {
      title: 'Active Customers',
      value: stats?.total_customers || 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
      class: 'success-accent'
    },
    {
      title: 'Total Orders',
      value: stats?.total_orders || 0,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
      class: 'warning-accent'
    },
    {
      title: 'Inventory Valuation',
      value: `$${stats?.total_inventory_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      ),
      class: 'danger-accent'
    }
  ];

  return (
    <div className="dashboard-view">
      {/* Metrics Grid */}
      <div className="stats-grid">
        {statCards.map((card, idx) => (
          <div key={idx} className={`stat-card glass-panel ${card.class}`}>
            <div className="stat-icon-wrapper">
              {card.icon}
            </div>
            <div className="stat-details">
              <h3>{card.title}</h3>
              <p className="stat-value">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings & Active Alerts */}
      <div className="dashboard-sections" style={{ marginTop: '30px' }}>
        <div className="glass-panel alert-section">
          <div className="section-header">
            <h3>Inventory Alert Feed</h3>
            <span className="badge badge-warning">{stats?.low_stock_products.length || 0} Alert(s)</span>
          </div>
          
          <div className="alert-content">
            {stats?.low_stock_products && stats.low_stock_products.length > 0 ? (
              <div className="low-stock-list">
                <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <span>Attention required: Some products have dropped below the safe threshold of 10 units!</span>
                </div>
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th>Price</th>
                        <th>Stock Remaining</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.low_stock_products.map((product) => (
                        <tr key={product.id}>
                          <td><strong>{product.name}</strong></td>
                          <td><code>{product.sku}</code></td>
                          <td>${product.price.toFixed(2)}</td>
                          <td className="text-danger font-semibold">{product.quantity_in_stock}</td>
                          <td>
                            <span className={`badge ${product.quantity_in_stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                              {product.quantity_in_stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="empty-alerts">
                <div className="success-icon-wrapper">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h4>All Stocks Healthy</h4>
                <p>No products are currently under the warning threshold. Everything is running smoothly!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
