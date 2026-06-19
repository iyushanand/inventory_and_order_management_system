import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Customers from './components/Customers';
import Orders from './components/Orders';
import './App.css';

// Read the API base URL from the environment or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard apiBaseUrl={API_BASE_URL} />}
      {activeTab === 'products' && <Products apiBaseUrl={API_BASE_URL} />}
      {activeTab === 'customers' && <Customers apiBaseUrl={API_BASE_URL} />}
      {activeTab === 'orders' && <Orders apiBaseUrl={API_BASE_URL} />}
    </Layout>
  );
}

export default App;
