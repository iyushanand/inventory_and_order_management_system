# Inventory & Order Management System (IMS)

A production-ready, full-stack, containerized **Inventory & Order Management System** built with **FastAPI** (Python), **React** (JavaScript), and **PostgreSQL**.

The application is fully containerized using Docker, managed with Docker Compose, and includes a continuous integration/deployment (CI/CD) workflow.

---

## 🌟 Key Features

* **Product Catalog**: Full CRUD (Create, Read, Update, Delete) management of products including automated validation for positive prices and stock limits.
* **Customer Registry**: Manage customer records with unique email verification and phone formatting.
* **Order Desk**: Create orders containing multiple items.
* **Business Logic Guards**:
  * SKUs and customer emails are strictly unique.
  * Transaction-safe order creation (reduces stock on placement).
  * Automatically calculates total order amount on the backend.
  * Blocks order placement if stock is insufficient.
  * Restores inventory quantities when orders are deleted/cancelled.
* **Dashboard Analytics**: Real-time business metrics displaying Total Products, Registered Customers, Total Orders, total Valuation of current inventory, and a low-stock alert banner notifying admins when products fall below 10 units.
* **Responsive Dark UI**: Clean, glassmorphic dark theme styled with CSS variables and flexbox grids.

---

## 📂 Project Architecture

```
inventory_order_system/
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD pipeline (Test, Build & Push Docker image)
├── backend/
│   ├── app/
│   │   ├── config.py        # Settings and environment loaders
│   │   ├── database.py      # SQLAlchemy connection & session providers
│   │   ├── models.py        # PostgreSQL tables (Product, Customer, Order, OrderItem)
│   │   ├── schemas.py       # Pydantic validation & schemas
│   │   ├── crud.py          # Database queries & transaction-based business logic
│   │   └── main.py          # FastAPI application routing & CORS
│   ├── tests/
│   │   └── test_api.py      # Pytest testing suite
│   ├── requirements.txt     # Python libraries
│   ├── Dockerfile           # Multi-stage backend container
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx   # Sidebar & Header layout wrapper
│   │   │   ├── Dashboard.jsx# Stats summary & Low-stock feeds
│   │   │   ├── Products.jsx # Product catalogue catalog & updates
│   │   │   ├── Customers.jsx# Customer registry
│   │   │   └── Orders.jsx   # Order creation wizard & checkout lists
│   │   ├── App.jsx          # React state controller & routing
│   │   ├── App.css          # Custom styling rules
│   │   ├── index.css        # CSS reset, variables, global tables & buttons
│   │   └── main.jsx
│   ├── index.html           # Main SPA entry
│   ├── nginx.conf           # Production Nginx configuration
│   ├── Dockerfile           # Multi-stage frontend compiler & Nginx server
│   └── .dockerignore
├── docker-compose.yml       # Local orchestration (DB, API, Client)
├── .env.example             # Configuration guidelines
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
Make sure you have [Docker](https://www.docker.com/products/docker-desktop) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.

### Step 1: Clone and Configuration
1. Clone your project code.
2. Create a `.env` file in the root directory by copying `.env.example`:
   ```bash
   cp .env.example .env
   ```

### Step 2: Spin Up Containers
Launch the database, API server, and web client simultaneously using Docker Compose:
```bash
docker-compose up --build
```

Docker Compose will perform the following actions:
1. Spin up a **PostgreSQL 15** database container.
2. Spin up the **FastAPI backend** container (waits until PostgreSQL passes its health checks).
3. Spin up the **React frontend** container (builds static assets and serves them via an **Nginx** server).

### Step 3: Access the Application
* **Frontend Web Client**: Open [http://localhost:3000](http://localhost:3000) in your web browser.
* **FastAPI Docs (Swagger UI)**: Open [http://localhost:8000/docs](http://localhost:8000/docs) to browse and run API tests.
* **Backend API Base**: [http://localhost:8000](http://localhost:8000)

---

## 🛠️ API Reference Documentation

All endpoints are hosted at `http://localhost:8000/`.

### Products
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/products` | Create a new product (Validates SKU uniqueness, price/qty >= 0) |
| `GET` | `/products` | Retrieve all products in catalog |
| `GET` | `/products/{id}` | Retrieve specific product details by ID |
| `PUT` | `/products/{id}` | Update product fields (name, price, stock quantity, SKU) |
| `DELETE` | `/products/{id}` | Delete product (Fails if referenced in an order) |

### Customers
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/customers` | Create a customer (Validates email format and email uniqueness) |
| `GET` | `/customers` | Retrieve all registered customers |
| `GET` | `/customers/{id}` | Retrieve customer details by ID |
| `DELETE` | `/customers/{id}` | Delete customer (Fails if customer has orders) |

### Orders
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/orders` | Create an order (Calculates total, checks stock, deducts stock) |
| `GET` | `/orders` | Retrieve all orders with customer details and item lists |
| `GET` | `/orders/{id}` | Retrieve specific order details |
| `DELETE` | `/orders/{id}` | Cancel/delete an order (Restores items back to product stock) |

---

## 🧪 Testing

To run backend tests locally:
1. Initialize a Python virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Run tests with:
   ```bash
   pytest -v
   ```
*Note: Pytest automatically skips database integration tests if a live PostgreSQL database connection is unavailable.*

---

## 🌐 Production Deployment Guide

Deploying the system online using free hosting platforms involves three main steps.

### Step 1: Provision a Managed PostgreSQL Database
Use a free managed database service like **Neon** (neon.tech) or **Supabase** (supabase.com):
1. Sign up and create a PostgreSQL instance.
2. Copy the connection string. It should look like:
   `postgresql://[user]:[password]@[host]/[dbname]?sslmode=require`

### Step 2: Deploy the Backend API
You can deploy the backend on platforms like **Render** or **Railway**:

#### Render Deployment:
1. Click **New +** and select **Web Service**.
2. Connect your GitHub repository.
3. Configure the following properties:
   * **Runtime**: `Docker`
   * **Dockerfile Path**: `backend/Dockerfile`
4. Add the following environment variables:
   * `DATABASE_URL`: (Paste your connection string from Step 1)
5. Deploy. Render will build the Docker container and expose a public URL (e.g., `https://ims-backend.onrender.com`).

### Step 3: Deploy the Frontend React Client
Deploy the static React assets to **Vercel** or **Netlify**:

#### Vercel Deployment:
1. Connect your GitHub repo.
2. Select the `frontend` folder as the root directory of the project.
3. Configure the settings:
   * **Framework Preset**: `Vite`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Add the environment variable:
   * `VITE_API_URL`: (Paste the live backend URL from Step 2, e.g., `https://ims-backend.onrender.com`)
5. Deploy. Vercel will build the frontend assets and provide a public URL (e.g., `https://ims-frontend.vercel.app`).

---

## 🤖 Continuous Integration & Docker Hub

This repository contains a GitHub Actions workflow that:
1. Automatically compiles and tests python files.
2. Builds the production-ready Docker image for the backend.
3. Pushes the image to **Docker Hub** on every merge to `main`.

To enable this:
1. Create a repository on Docker Hub named `ims-backend`.
2. In your GitHub repository settings, navigate to **Secrets and variables > Actions** and add:
   * `DOCKER_HUB_USERNAME`: Your Docker Hub username.
   * `DOCKER_HUB_ACCESS_TOKEN`: A Personal Access Token generated on Docker Hub.
