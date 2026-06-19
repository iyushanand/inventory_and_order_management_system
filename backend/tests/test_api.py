import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from app.main import app
from app.database import Base, get_db
from app.config import settings
from app import models

# Create client
client = TestClient(app)

# Helper: check database availability
def is_db_available():
    try:
        engine = create_engine(settings.DATABASE_URL, connect_args={'connect_timeout': 2})
        conn = engine.connect()
        conn.close()
        return True
    except Exception:
        return False

# Skip database tests if Postgres isn't running
pytestmark = pytest.mark.skipif(
    not is_db_available(),
    reason="PostgreSQL server is offline. Skipping database integration tests."
)

@pytest.fixture(scope="module", autouse=True)
def setup_test_database():
    engine = create_engine(settings.DATABASE_URL)
    # Recreate tables in the database
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    yield engine
    
    # Clean up afterwards
    Base.metadata.drop_all(bind=engine)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_product_lifecycle():
    # 1. Create a product
    prod_data = {
        "name": "Test Laptop",
        "sku": "LAP-TEST-001",
        "price": 999.99,
        "quantity_in_stock": 10
    }
    response = client.post("/products", json=prod_data)
    assert response.status_code == 201
    prod_id = response.json()["id"]
    assert response.json()["sku"] == "LAP-TEST-001"

    # 2. Check SKU uniqueness
    response_dup = client.post("/products", json=prod_data)
    assert response_dup.status_code == 400
    assert "SKU must be unique" in response_dup.json()["detail"]

    # 3. Validation: negative price
    invalid_price_data = prod_data.copy()
    invalid_price_data["sku"] = "LAP-TEST-002"
    invalid_price_data["price"] = -50.0
    response_invalid_price = client.post("/products", json=invalid_price_data)
    assert response_invalid_price.status_code == 422 # Pydantic validation error

    # 4. Get product
    response_get = client.get(f"/products/{prod_id}")
    assert response_get.status_code == 200
    assert response_get.json()["name"] == "Test Laptop"

    # 5. Update product
    update_data = {"quantity_in_stock": 15}
    response_update = client.put(f"/products/{prod_id}", json=update_data)
    assert response_update.status_code == 200
    assert response_update.json()["quantity_in_stock"] == 15


def test_customer_lifecycle():
    # 1. Create a customer
    cust_data = {
        "name": "Bob Smith",
        "email": "bob.smith@example.com",
        "phone": "1234567890"
    }
    response = client.post("/customers", json=cust_data)
    assert response.status_code == 201
    cust_id = response.json()["id"]

    # 2. Check email uniqueness
    response_dup = client.post("/customers", json=cust_data)
    assert response_dup.status_code == 400
    assert "email must be unique" in response_dup.json()["detail"]

    # 3. Invalid Email Format
    invalid_email_data = cust_data.copy()
    invalid_email_data["email"] = "bob.smith_at_example.com"
    response_invalid = client.post("/customers", json=invalid_email_data)
    assert response_invalid.status_code == 422


def test_order_placement_and_stock_deduction():
    # Reset/Create products and customers for order test
    # Get existing DB connection to insert seeds directly if needed, or use API
    # Create Product
    prod_resp = client.post("/products", json={
        "name": "Screws Pack",
        "sku": "SCRW-001",
        "price": 2.50,
        "quantity_in_stock": 100
    })
    prod_id = prod_resp.json()["id"]

    # Create Customer
    cust_resp = client.post("/customers", json={
        "name": "Jane Miller",
        "email": "jane.m@example.com",
        "phone": "0987654321"
    })
    cust_id = cust_resp.json()["id"]

    # 1. Place order (quantity: 10, total should be auto-calculated to 25.00)
    order_data = {
        "customer_id": cust_id,
        "items": [
            {"product_id": prod_id, "quantity": 10}
        ]
    }
    response = client.post("/orders", json=order_data)
    assert response.status_code == 201
    order = response.json()
    order_id = order["id"]
    assert order["total_amount"] == 25.00 # 10 * 2.50

    # Verify inventory was reduced (100 - 10 = 90)
    prod_get = client.get(f"/products/{prod_id}")
    assert prod_get.json()["quantity_in_stock"] == 90

    # 2. Fail to place order due to insufficient stock (available: 90, request: 100)
    insufficient_order_data = {
        "customer_id": cust_id,
        "items": [
            {"product_id": prod_id, "quantity": 100}
        ]
    }
    response_fail = client.post("/orders", json=insufficient_order_data)
    assert response_fail.status_code == 400
    assert "Insufficient stock" in response_fail.json()["detail"]

    # 3. Delete/Cancel order and verify product restocking (90 + 10 = 100)
    response_cancel = client.delete(f"/orders/{order_id}")
    assert response_cancel.status_code == 200
    
    # Check inventory is back to 100
    prod_restocked = client.get(f"/products/{prod_id}")
    assert prod_restocked.json()["quantity_in_stock"] == 100
