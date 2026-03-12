-- SRI KANNAN TRADERS Database Schema
-- PostgreSQL Database Schema for Stationery Wholesale Shop Management System

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS cart CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Create admins table
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    shop_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'Pending' 
        CHECK (status IN ('Pending', 'Processing', 'Completed', 'Cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table (junction table for orders and products)
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create cart table
CREATE TABLE cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(customer_id, product_id) -- Ensure one cart entry per customer per product
);

-- Create indexes for better performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_cart_customer_id ON cart(customer_id);
CREATE INDEX idx_cart_product_id ON cart(product_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_updated_at BEFORE UPDATE ON cart
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for analytics
CREATE VIEW monthly_sales AS
SELECT 
    DATE_TRUNC('month', order_date) AS month,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue
FROM orders
WHERE status = 'Completed'
GROUP BY DATE_TRUNC('month', order_date)
ORDER BY month DESC;

CREATE VIEW top_selling_products AS
SELECT 
    p.product_id,
    p.name,
    p.category,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'Completed'
GROUP BY p.product_id, p.name, p.category
ORDER BY total_quantity_sold DESC;

CREATE VIEW category_sales AS
SELECT 
    p.category,
    COUNT(DISTINCT o.order_id) AS total_orders,
    SUM(oi.quantity) AS total_quantity_sold,
    SUM(oi.quantity * oi.price) AS total_revenue
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'Completed'
GROUP BY p.category
ORDER BY total_revenue DESC;

CREATE VIEW low_stock_products AS
SELECT 
    product_id,
    name,
    category,
    stock_quantity,
    CASE 
        WHEN stock_quantity = 0 THEN 'Out of Stock'
        WHEN stock_quantity <= 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status
FROM products
WHERE stock_quantity <= 10
ORDER BY stock_quantity ASC;

-- Create function to check and update stock when placing orders
CREATE OR REPLACE FUNCTION check_and_update_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if enough stock is available
    IF EXISTS (
        SELECT 1 FROM products p
        WHERE p.product_id = NEW.product_id
        AND p.stock_quantity < NEW.quantity
    ) THEN
        RAISE EXCEPTION 'Insufficient stock for product ID %', NEW.product_id;
    END IF;
    
    -- Update product stock
    UPDATE products 
    SET stock_quantity = stock_quantity - NEW.quantity
    WHERE product_id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for stock management
CREATE TRIGGER order_items_stock_check
BEFORE INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION check_and_update_stock();

-- Create function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- Only restore stock if order is being cancelled
    IF OLD.status != 'Cancelled' AND NEW.status = 'Cancelled' THEN
        UPDATE products 
        SET stock_quantity = stock_quantity + oi.quantity
        FROM order_items oi
        WHERE oi.order_id = NEW.order_id 
        AND oi.product_id = products.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for stock restoration on order cancellation
CREATE TRIGGER restore_stock_trigger
AFTER UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();

-- Add comments for documentation
COMMENT ON TABLE admins IS 'Admin users who manage the shop';
COMMENT ON TABLE customers IS 'Retail shop owners who purchase wholesale products';
COMMENT ON TABLE products IS 'Stationery products available for sale';
COMMENT ON TABLE orders IS 'Customer orders with status tracking';
COMMENT ON TABLE order_items IS 'Individual items within each order';
COMMENT ON TABLE cart IS 'Shopping cart items for customers';

COMMENT ON COLUMN orders.status IS 'Order status: Pending, Processing, Completed, Cancelled';
COMMENT ON COLUMN products.stock_quantity IS 'Current inventory level for the product';
COMMENT ON COLUMN customers.shop_name IS 'Name of the retail shop owned by the customer';
