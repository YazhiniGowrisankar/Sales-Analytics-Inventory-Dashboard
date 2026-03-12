const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { query, transaction } = require('../database/connection');
const { body, validationResult } = require('express-validator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    try {
      await fsPromises.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xlsx', '.xls'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// Validation rules for dataset upload
const uploadValidation = [
  body('dataset_type').isIn(['sales_data', 'product_data', 'customer_data']).withMessage('Invalid dataset type'),
  body('overwrite_existing').optional().isBoolean().withMessage('overwrite_existing must be boolean')
];

// Parse CSV file
const parseCSV = async (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Parse Excel file
const parseExcel = async (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    return jsonData;
  } catch (error) {
    throw new Error('Error parsing Excel file: ' + error.message);
  }
};

// Upload and process dataset
const uploadDataset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const { dataset_type, overwrite_existing = false } = req.body;
    const filePath = req.file.path;
    
    let data;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // Parse the file based on its type
    try {
      if (fileExtension === '.csv') {
        data = await parseCSV(filePath);
      } else if (fileExtension === '.xlsx' || fileExtension === '.xls') {
        data = await parseExcel(filePath);
      } else {
        throw new Error('Unsupported file format');
      }
    } catch (parseError) {
      // Clean up uploaded file
      await fsPromises.unlink(filePath);
      return res.status(400).json({
        success: false,
        message: 'Error parsing file: ' + parseError.message
      });
    }
    
    if (data.length === 0) {
      await fsPromises.unlink(filePath);
      return res.status(400).json({
        success: false,
        message: 'No data found in the uploaded file'
      });
    }
    
    let processResult;
    
    // Process data based on dataset type
    switch (dataset_type) {
      case 'sales_data':
        processResult = await processSalesData(data, overwrite_existing);
        break;
      case 'product_data':
        processResult = await processProductData(data, overwrite_existing);
        break;
      case 'customer_data':
        processResult = await processCustomerData(data, overwrite_existing);
        break;
      default:
        throw new Error('Invalid dataset type');
    }
    
    // Clean up uploaded file
    await fsPromises.unlink(filePath);
    
    res.status(200).json({
      success: true,
      message: 'Dataset uploaded and processed successfully',
      data: {
        dataset_type,
        records_processed: data.length,
        ...processResult
      }
    });
  } catch (error) {
    console.error('Upload dataset error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fsPromises.unlink(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
};

// Process sales data
const processSalesData = async (data, overwriteExisting) => {
  const results = {
    orders_created: 0,
    customers_created: 0,
    products_created: 0,
    errors: []
  };
  
  await transaction(async (client) => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate required fields
        if (!row.order_id || !row.product_name || !row.quantity || !row.price || !row.order_date) {
          results.errors.push(`Row ${i + 1}: Missing required fields`);
          continue;
        }
        
        // Find or create customer
        let customerId;
        if (row.customer_email) {
          const customerResult = await client.query(
            'SELECT customer_id FROM customers WHERE email = $1',
            [row.customer_email]
          );
          
          if (customerResult.rows.length > 0) {
            customerId = customerResult.rows[0].customer_id;
          } else {
            // Create new customer
            const newCustomerResult = await client.query(
              `INSERT INTO customers (name, shop_name, email, phone, address, password)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING customer_id`,
              [
                row.customer_name || 'Unknown Customer',
                row.shop_name || 'Unknown Shop',
                row.customer_email,
                row.customer_phone || null,
                row.customer_address || null,
                '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ' // default password
              ]
            );
            customerId = newCustomerResult.rows[0].customer_id;
            results.customers_created++;
          }
        } else {
          results.errors.push(`Row ${i + 1}: Customer email required`);
          continue;
        }
        
        // Find or create product
        let productId;
        const productResult = await client.query(
          'SELECT product_id FROM products WHERE name = $1',
          [row.product_name]
        );
        
        if (productResult.rows.length > 0) {
          productId = productResult.rows[0].product_id;
        } else {
          // Create new product
          const newProductResult = await client.query(
            `INSERT INTO products (name, category, price, stock_quantity, description)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING product_id`,
            [
              row.product_name,
              row.category || 'General',
              parseFloat(row.price),
              parseInt(row.stock_quantity) || 100,
              row.description || null
            ]
          );
          productId = newProductResult.rows[0].product_id;
          results.products_created++;
        }
        
        // Check if order already exists
        const existingOrder = await client.query(
          'SELECT order_id FROM orders WHERE order_id = $1',
          [row.order_id]
        );
        
        if (existingOrder.rows.length > 0 && !overwriteExisting) {
          results.errors.push(`Row ${i + 1}: Order ${row.order_id} already exists`);
          continue;
        }
        
        // Create or update order
        const orderResult = await client.query(
          `INSERT INTO orders (customer_id, order_date, total_amount, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (order_id) DO UPDATE SET
           customer_id = EXCLUDED.customer_id,
           order_date = EXCLUDED.order_date,
           total_amount = EXCLUDED.total_amount,
           status = EXCLUDED.status
           RETURNING order_id`,
          [
            customerId,
            row.order_date,
            parseFloat(row.quantity) * parseFloat(row.price),
            row.status || 'Completed'
          ]
        );
        
        const orderId = orderResult.rows[0].order_id;
        
        // Create order item
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, price)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING`,
          [
            orderId,
            productId,
            parseInt(row.quantity),
            parseFloat(row.price)
          ]
        );
        
        results.orders_created++;
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
  });
  
  return results;
};

// Process product data
const processProductData = async (data, overwriteExisting) => {
  const results = {
    products_created: 0,
    products_updated: 0,
    errors: []
  };
  
  await transaction(async (client) => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate required fields
        if (!row.name || !row.price) {
          results.errors.push(`Row ${i + 1}: Missing required fields (name, price)`);
          continue;
        }
        
        // Check if product exists
        const existingProduct = await client.query(
          'SELECT product_id FROM products WHERE name = $1',
          [row.name]
        );
        
        if (existingProduct.rows.length > 0) {
          if (overwriteExisting) {
            // Update existing product
            await client.query(
              `UPDATE products 
               SET category = $1, price = $2, stock_quantity = $3, description = $4
               WHERE product_id = $5`,
              [
                row.category || 'General',
                parseFloat(row.price),
                parseInt(row.stock_quantity) || 0,
                row.description || null,
                existingProduct.rows[0].product_id
              ]
            );
            results.products_updated++;
          } else {
            results.errors.push(`Row ${i + 1}: Product '${row.name}' already exists`);
          }
        } else {
          // Create new product
          await client.query(
            `INSERT INTO products (name, category, price, stock_quantity, description)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              row.name,
              row.category || 'General',
              parseFloat(row.price),
              parseInt(row.stock_quantity) || 0,
              row.description || null
            ]
          );
          results.products_created++;
        }
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
  });
  
  return results;
};

// Process customer data
const processCustomerData = async (data, overwriteExisting) => {
  const results = {
    customers_created: 0,
    customers_updated: 0,
    errors: []
  };
  
  await transaction(async (client) => {
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        // Validate required fields
        if (!row.email) {
          results.errors.push(`Row ${i + 1}: Missing required field (email)`);
          continue;
        }
        
        // Check if customer exists
        const existingCustomer = await client.query(
          'SELECT customer_id FROM customers WHERE email = $1',
          [row.email]
        );
        
        if (existingCustomer.rows.length > 0) {
          if (overwriteExisting) {
            // Update existing customer
            await client.query(
              `UPDATE customers 
               SET name = $1, shop_name = $2, phone = $3, address = $4
               WHERE customer_id = $5`,
              [
                row.name || 'Unknown Customer',
                row.shop_name || 'Unknown Shop',
                row.phone || null,
                row.address || null,
                existingCustomer.rows[0].customer_id
              ]
            );
            results.customers_updated++;
          } else {
            results.errors.push(`Row ${i + 1}: Customer with email '${row.email}' already exists`);
          }
        } else {
          // Create new customer
          await client.query(
            `INSERT INTO customers (name, shop_name, phone, email, address, password)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              row.name || 'Unknown Customer',
              row.shop_name || 'Unknown Shop',
              row.phone || null,
              row.email,
              row.address || null,
              '$2b$10$rOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQZQZQZQZOzJqQZQZQZQZQ' // default password
            ]
          );
          results.customers_created++;
        }
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }
  });
  
  return results;
};

// Get upload history
const getUploadHistory = async (req, res) => {
  try {
    // This would typically be stored in a database table
    // For now, return a placeholder response
    res.status(200).json({
      success: true,
      data: {
        uploads: [
          {
            id: 1,
            dataset_type: 'sales_data',
            file_name: 'sales_data.csv',
            records_processed: 150,
            upload_date: new Date().toISOString(),
            status: 'completed'
          }
        ]
      }
    });
  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Download sample template
const downloadTemplate = async (req, res) => {
  try {
    const { dataset_type } = req.params;
    
    let templateData;
    let filename;
    
    switch (dataset_type) {
      case 'sales_data':
        templateData = [
          {
            order_id: 'ORD001',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            shop_name: 'John Stationery',
            customer_phone: '1234567890',
            customer_address: '123 Main St',
            product_name: 'A4 Size Paper',
            category: 'Paper',
            quantity: 5,
            price: 250.00,
            order_date: '2024-01-15',
            status: 'Completed'
          }
        ];
        filename = 'sales_data_template.csv';
        break;
        
      case 'product_data':
        templateData = [
          {
            name: 'A4 Size Paper',
            category: 'Paper',
            price: 250.00,
            stock_quantity: 100,
            description: 'High quality A4 paper'
          }
        ];
        filename = 'product_data_template.csv';
        break;
        
      case 'customer_data':
        templateData = [
          {
            name: 'John Doe',
            shop_name: 'John Stationery',
            email: 'john@example.com',
            phone: '1234567890',
            address: '123 Main St'
          }
        ];
        filename = 'customer_data_template.csv';
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid dataset type'
        });
    }
    
    // Convert to CSV
    const csv = require('json2csv').parse;
    const csvData = csv(templateData);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (error) {
    console.error('Download template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  uploadDataset,
  getUploadHistory,
  downloadTemplate,
  upload,
  uploadValidation
};
