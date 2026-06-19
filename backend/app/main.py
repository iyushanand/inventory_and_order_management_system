from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict

from app import models, schemas, crud
from app.database import engine, get_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup (creates them if they do not exist)
    try:
        models.Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Database connection skipped during startup: {e}")
    yield

app = FastAPI(
    title="Inventory & Order Management System API",
    description="Backend API for managing products, customers, and orders with automated inventory tracking.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - Allow all origins for flexibility, can be locked down in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint with system status
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "Inventory & Order Management API",
        "version": "1.0.0"
    }

# --- PRODUCT ENDPOINTS ---
@app.post("/products", response_model=schemas.ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_product(db=db, product=product)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/products", response_model=List[schemas.ProductResponse])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_products(db=db, skip=skip, limit=limit)

@app.get("/products/{id}", response_model=schemas.ProductResponse)
def read_product(id: int, db: Session = Depends(get_db)):
    db_product = crud.get_product(db=db, product_id=id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {id} not found")
    return db_product

@app.put("/products/{id}", response_model=schemas.ProductResponse)
def update_product(id: int, product_update: schemas.ProductUpdate, db: Session = Depends(get_db)):
    try:
        updated_product = crud.update_product(db=db, product_id=id, product_update=product_update)
        if not updated_product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {id} not found")
        return updated_product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.delete("/products/{id}", status_code=status.HTTP_200_OK)
def delete_product(id: int, db: Session = Depends(get_db)):
    try:
        success = crud.delete_product(db=db, product_id=id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product with ID {id} not found")
        return {"message": f"Product with ID {id} successfully deleted"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- CUSTOMER ENDPOINTS ---
@app.post("/customers", response_model=schemas.CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_customer(db=db, customer=customer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/customers", response_model=List[schemas.CustomerResponse])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_customers(db=db, skip=skip, limit=limit)

@app.get("/customers/{id}", response_model=schemas.CustomerResponse)
def read_customer(id: int, db: Session = Depends(get_db)):
    db_customer = crud.get_customer(db=db, customer_id=id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer with ID {id} not found")
    return db_customer

@app.delete("/customers/{id}", status_code=status.HTTP_200_OK)
def delete_customer(id: int, db: Session = Depends(get_db)):
    try:
        success = crud.delete_customer(db=db, customer_id=id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Customer with ID {id} not found")
        return {"message": f"Customer with ID {id} successfully deleted"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- ORDER ENDPOINTS ---
@app.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_order(db=db, order_data=order)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/orders", response_model=List[schemas.OrderResponse])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_orders(db=db, skip=skip, limit=limit)

@app.get("/orders/{id}", response_model=schemas.OrderResponse)
def read_order(id: int, db: Session = Depends(get_db)):
    db_order = crud.get_order(db=db, order_id=id)
    if not db_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order with ID {id} not found")
    return db_order

@app.delete("/orders/{id}", status_code=status.HTTP_200_OK)
def delete_order(id: int, db: Session = Depends(get_db)):
    try:
        success = crud.delete_order(db=db, order_id=id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Order with ID {id} not found")
        return {"message": f"Order with ID {id} successfully cancelled/deleted"}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- DASHBOARD METRICS ENDPOINT (Bonus utility for frontend) ---
@app.get("/dashboard-stats", status_code=status.HTTP_200_OK)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()
    
    # Low stock definition: < 10 units in stock
    low_stock_products = db.query(models.Product).filter(models.Product.quantity_in_stock < 10).all()
    
    # Calculate Total Inventory Value = sum(price * stock)
    products = db.query(models.Product).all()
    total_inventory_value = sum(p.price * p.quantity_in_stock for p in products)

    # Convert low stock products to schema response list
    low_stock_list = [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "price": p.price,
            "quantity_in_stock": p.quantity_in_stock
        } for p in low_stock_products
    ]

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_products": low_stock_list
    }
