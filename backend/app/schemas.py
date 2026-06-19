from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime

# --- PRODUCT SCHEMAS ---
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the product")
    sku: str = Field(..., min_length=1, description="Unique Stock Keeping Unit (SKU)")
    price: float = Field(..., description="Unit price of the product")
    quantity_in_stock: int = Field(..., description="Stock count")

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @field_validator("quantity_in_stock")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Quantity in stock cannot be negative")
        return v

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1)
    sku: Optional[str] = Field(None, min_length=1)
    price: Optional[float] = None
    quantity_in_stock: Optional[int] = None

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("Price cannot be negative")
        return v

    @field_validator("quantity_in_stock")
    @classmethod
    def validate_quantity(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Quantity in stock cannot be negative")
        return v

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- CUSTOMER SCHEMAS ---
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1, description="Full name of the customer")
    email: EmailStr = Field(..., description="Email address (must be unique)")
    phone: str = Field(..., min_length=5, description="Phone number")

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# --- ORDER ITEM SCHEMAS ---
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., description="Quantity ordered")

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity ordered must be greater than zero")
        return v

class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    product: ProductResponse  # Nested details of product
    model_config = ConfigDict(from_attributes=True)


# --- ORDER SCHEMAS ---
class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_items=1, description="List of items in the order")

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    total_amount: float
    created_at: datetime
    customer: CustomerResponse  # Nested details of customer
    items: List[OrderItemResponse]  # Nested list of items
    model_config = ConfigDict(from_attributes=True)
