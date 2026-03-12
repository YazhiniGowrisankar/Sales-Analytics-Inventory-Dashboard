-- SRI KANNAN TRADERS Seed Data
-- Initial data for the stationery wholesale shop management system

-- Insert default admin
INSERT INTO admins (name, email, password) VALUES 
('Admin User', 'admin@srikannantraders.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ');

-- Insert sample customers
INSERT INTO customers (name, shop_name, phone, email, password, address) VALUES 
('Ramesh Kumar', 'Ramesh Stationery Shop', '9876543210', 'ramesh@email.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', '123 Main Street, Chennai'),
('Suresh Babu', 'Suresh Book Store', '9876543211', 'suresh@email.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', '456 Park Road, Chennai'),
('Mahesh Reddy', 'Mahesh Stationery', '9876543212', 'mahesh@email.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', '789 Market Street, Chennai'),
('Vijay Kumar', 'Vijay Office Supplies', '9876543213', 'vijay@email.com', '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ', '321 Business Ave, Chennai');

-- Insert sample products
INSERT INTO products (name, category, price, stock_quantity, description) VALUES 
('A4 Size Paper (500 sheets)', 'Paper', 250.00, 100, 'High quality A4 size paper, 500 sheets per pack'),
('A3 Size Paper (250 sheets)', 'Paper', 300.00, 50, 'Premium A3 size paper, 250 sheets per pack'),
('Ball Pen (Blue) - Box of 20', 'Pens', 120.00, 200, 'Smooth writing blue ball pens, box of 20'),
('Ball Pen (Black) - Box of 20', 'Pens', 120.00, 200, 'Smooth writing black ball pens, box of 20'),
('Gel Pen (Blue) - Box of 10', 'Pens', 150.00, 100, 'Premium gel pens in blue, box of 10'),
('Gel Pen (Black) - Box of 10', 'Pens', 150.00, 100, 'Premium gel pens in black, box of 10'),
('Notebook (200 pages)', 'Notebooks', 80.00, 300, 'Spiral notebook with 200 pages'),
('Notebook (100 pages)', 'Notebooks', 45.00, 400, 'Compact notebook with 100 pages'),
('Register Book (300 pages)', 'Notebooks', 120.00, 150, 'Hard cover register book with 300 pages'),
('Pencil Box (12 pieces)', 'Pencils', 60.00, 250, 'Standard HB pencils in a box of 12'),
('Eraser (10 pieces)', 'Accessories', 40.00, 300, 'High quality erasers, pack of 10'),
('Sharpener (6 pieces)', 'Accessories', 30.00, 200, 'Plastic sharpeners, pack of 6'),
('Ruler (30 cm) - 10 pieces', 'Accessories', 50.00, 150, 'Plastic rulers, 30 cm, pack of 10'),
('Stapler (Small)', 'Office Supplies', 180.00, 80, 'Small desktop stapler'),
('Stapler Pins (1000 pins)', 'Office Supplies', 40.00, 200, 'Standard stapler pins, 1000 pieces'),
('File Folder (10 pieces)', 'Office Supplies', 120.00, 100, 'Plastic file folders, pack of 10'),
('Marker (Black) - Box of 5', 'Markers', 90.00, 120, 'Permanent black markers, box of 5'),
('Marker (Blue) - Box of 5', 'Markers', 90.00, 120, 'Permanent blue markers, box of 5'),
('Marker (Red) - Box of 5', 'Markers', 90.00, 120, 'Permanent red markers, box of 5'),
('Highlighter (Yellow) - Box of 4', 'Markers', 60.00, 150, 'Yellow highlighters, box of 4'),
('Highlighter (Green) - Box of 4', 'Markers', 60.00, 150, 'Green highlighters, box of 4'),
('Highlighter (Pink) - Box of 4', 'Markers', 60.00, 150, 'Pink highlighters, box of 4'),
('Glue Stick (5 pieces)', 'Accessories', 80.00, 100, 'White glue sticks, pack of 5'),
('Scissors (Small)', 'Accessories', 45.00, 80, 'Small stainless steel scissors'),
('Calculator (Basic)', 'Office Supplies', 250.00, 60, 'Basic calculator with standard functions'),
('Calculator (Scientific)', 'Office Supplies', 450.00, 40, 'Scientific calculator with advanced functions'),
('Printer Paper (A4) - 1000 sheets', 'Paper', 450.00, 30, 'Bulk pack of A4 printer paper, 1000 sheets'),
('Envelope (100 pieces)', 'Office Supplies', 80.00, 120, 'Standard business envelopes, pack of 100'),
('Clipboard (A4 size)', 'Office Supplies', 150.00, 70, 'A4 size clipboard with clip'),
('Whiteboard Marker (Black) - 4 pieces', 'Markers', 100.00, 90, 'Whiteboard markers, black, pack of 4'),
('Whiteboard Marker (Blue) - 4 pieces', 'Markers', 100.00, 90, 'Whiteboard markers, blue, pack of 4'),
('Drawing Book (50 pages)', 'Notebooks', 70.00, 180, 'Drawing book with 50 pages'),
('Geometry Box (Complete Set)', 'Accessories', 200.00, 60, 'Complete geometry set with all instruments'),
('Tape (Transparent) - 3 rolls', 'Office Supplies', 120.00, 100, 'Transparent adhesive tape, 3 rolls'),
('Paper Clips (200 pieces)', 'Office Supplies', 30.00, 250, 'Standard paper clips, pack of 200'),
('Binder Clips (50 pieces)', 'Office Supplies', 60.00, 120, 'Binder clips, pack of 50'),
('Folder File (A4) - 20 pieces', 'Office Supplies', 200.00, 80, 'A4 folder files, pack of 20'),
('ID Card Holder (10 pieces)', 'Office Supplies', 80.00, 150, 'Plastic ID card holders, pack of 10'),
('Stamp Pad (Black)', 'Office Supplies', 90.00, 60, 'Black stamp pad'),
('Ink Pad (Red)', 'Office Supplies', 70.00, 80, 'Red ink pad'),
('Correction Fluid', 'Accessories', 45.00, 120, 'White correction fluid'),
('Correction Tape', 'Accessories', 55.00, 100, 'Correction tape dispenser'),
('File Cabinet Key Tag (10 pieces)', 'Office Supplies', 40.00, 200, 'Key tags for file cabinets, pack of 10');

-- Insert sample orders
INSERT INTO orders (customer_id, total_amount, status) VALUES 
(1, 1250.00, 'Completed'),
(2, 890.00, 'Completed'),
(3, 1560.00, 'Completed'),
(4, 720.00, 'Processing'),
(1, 450.00, 'Pending'),
(2, 2100.00, 'Completed'),
(3, 680.00, 'Completed'),
(4, 1350.00, 'Pending');

-- Insert sample order items
INSERT INTO order_items (order_id, product_id, quantity, price) VALUES 
-- Order 1 items
(1, 1, 2, 250.00),  -- A4 Paper
(1, 3, 3, 120.00),  -- Ball Pen Blue
(1, 7, 2, 80.00),   -- Notebook 200 pages
(1, 10, 2, 60.00),  -- Pencil Box

-- Order 2 items
(2, 2, 1, 300.00),  -- A3 Paper
(2, 4, 2, 120.00),  -- Ball Pen Black
(2, 8, 3, 45.00),   -- Notebook 100 pages
(2, 11, 2, 40.00),  -- Eraser

-- Order 3 items
(3, 1, 3, 250.00),  -- A4 Paper
(3, 5, 2, 150.00),  -- Gel Pen Blue
(3, 9, 2, 120.00),  -- Register Book
(3, 14, 1, 180.00), -- Stapler
(3, 15, 2, 40.00),  -- Stapler Pins

-- Order 4 items
(4, 3, 2, 120.00),  -- Ball Pen Blue
(4, 7, 3, 80.00),   -- Notebook 200 pages
(4, 10, 1, 60.00),  -- Pencil Box
(4, 12, 2, 30.00),  -- Sharpener

-- Order 5 items
(5, 1, 1, 250.00),  -- A4 Paper
(5, 8, 2, 45.00),   -- Notebook 100 pages
(5, 10, 1, 60.00),  -- Pencil Box

-- Order 6 items
(6, 1, 4, 250.00),  -- A4 Paper
(6, 2, 2, 300.00),  -- A3 Paper
(6, 3, 3, 120.00),  -- Ball Pen Blue
(6, 4, 3, 120.00),  -- Ball Pen Black
(6, 7, 2, 80.00),   -- Notebook 200 pages

-- Order 7 items
(7, 5, 1, 150.00),  -- Gel Pen Blue
(7, 6, 1, 150.00),  -- Gel Pen Black
(7, 7, 1, 80.00),   -- Notebook 200 pages
(7, 10, 1, 60.00),  -- Pencil Box
(7, 11, 1, 40.00),  -- Eraser

-- Order 8 items
(8, 1, 2, 250.00),  -- A4 Paper
(8, 3, 2, 120.00),  -- Ball Pen Blue
(8, 7, 1, 80.00),   -- Notebook 200 pages
(8, 9, 1, 120.00),  -- Register Book
(8, 14, 1, 180.00); -- Stapler

-- Insert sample cart items
INSERT INTO cart (customer_id, product_id, quantity) VALUES 
(1, 1, 1),  -- Customer 1 has A4 Paper in cart
(1, 3, 2),  -- Customer 1 has Ball Pens in cart
(2, 7, 1),  -- Customer 2 has Notebook in cart
(3, 10, 1); -- Customer 3 has Pencil Box in cart

-- Update product stock based on orders
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 1; -- A4 Paper
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 2; -- A3 Paper
UPDATE products SET stock_quantity = stock_quantity - 3 WHERE product_id = 3; -- Ball Pen Blue
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 4; -- Ball Pen Black
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 5; -- Gel Pen Blue
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 6; -- Gel Pen Black
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 7; -- Notebook 200 pages
UPDATE products SET stock_quantity = stock_quantity - 3 WHERE product_id = 8; -- Notebook 100 pages
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 9; -- Register Book
UPDATE products SET stock_quantity = stock_quantity - 3 WHERE product_id = 10; -- Pencil Box
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 11; -- Eraser
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 12; -- Sharpener
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE product_id = 14; -- Stapler
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE product_id = 15; -- Stapler Pins

-- Note: The password hash used above is for 'password123'
-- In a real application, you would use proper bcrypt hashing
