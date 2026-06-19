from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app import models, schemas

# --- PRODUCT CRUD ---
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity_in_stock=product.quantity_in_stock
    )
    db.add(db_product)
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Product SKU must be unique") from e

def update_product(db: Session, product_id: int, product_update: schemas.ProductUpdate):
    db_product = get_product(db, product_id)
    if not db_product:
        return None
    
    update_data = product_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
        
    try:
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Product SKU must be unique") from e

def delete_product(db: Session, product_id: int):
    db_product = get_product(db, product_id)
    if not db_product:
        return False
    
    # Check if product is referenced in order items
    has_orders = db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    if has_orders:
        raise ValueError("Cannot delete product because it is referenced in orders. Delete the orders first.")

    db.delete(db_product)
    try:
        db.commit()
        return True
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Cannot delete product due to database integrity constraints.") from e


# --- CUSTOMER CRUD ---
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(
        name=customer.name,
        email=customer.email,
        phone=customer.phone
    )
    db.add(db_customer)
    try:
        db.commit()
        db.refresh(db_customer)
        return db_customer
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Customer email must be unique") from e

def delete_customer(db: Session, customer_id: int):
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return False
        
    # Check if customer has orders
    has_orders = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if has_orders:
        raise ValueError("Cannot delete customer because they have active orders. Delete the orders first.")
        
    db.delete(db_customer)
    try:
        db.commit()
        return True
    except IntegrityError as e:
        db.rollback()
        raise ValueError("Cannot delete customer due to database integrity constraints.") from e


# --- ORDER CRUD ---
def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order_data: schemas.OrderCreate):
    # 1. Validate Customer Exists
    customer = get_customer(db, order_data.customer_id)
    if not customer:
        raise ValueError(f"Customer with ID {order_data.customer_id} does not exist.")

    # We will compute total_amount dynamically
    total_amount = 0.0
    order_items_to_create = []

    # 2. Process items and lock/validate stock
    for item in order_data.items:
        # Fetch product and lock the row for updates to avoid race conditions
        product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
        if not product:
            raise ValueError(f"Product with ID {item.product_id} does not exist.")
        
        # Check stock sufficiency
        if product.quantity_in_stock < item.quantity:
            raise ValueError(
                f"Insufficient stock for product '{product.name}' (SKU: {product.sku}). "
                f"Requested: {item.quantity}, Available: {product.quantity_in_stock}."
            )
        
        # Deduct stock
        product.quantity_in_stock -= item.quantity
        
        # Calculate subtotal
        item_subtotal = product.price * item.quantity
        total_amount += item_subtotal
        
        # Create OrderItem object
        db_order_item = models.OrderItem(
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price
        )
        order_items_to_create.append(db_order_item)

    # 3. Create the Order
    db_order = models.Order(
        customer_id=order_data.customer_id,
        total_amount=total_amount,
        items=order_items_to_create
    )
    
    db.add(db_order)
    try:
        db.commit()
        db.refresh(db_order)
        return db_order
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to create order due to database error: {str(e)}") from e

def delete_order(db: Session, order_id: int):
    # Start transaction to restock and delete
    db_order = db.query(models.Order).filter(models.Order.id == order_id).with_for_update().first()
    if not db_order:
        return False
        
    # Restock products
    for item in db_order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).with_for_update().first()
        if product:
            product.quantity_in_stock += item.quantity
            
    db.delete(db_order)
    try:
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise ValueError(f"Failed to delete/cancel order: {str(e)}") from e
