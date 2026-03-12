const { query } = require('./src/database/connection');
const bcrypt = require('bcryptjs');

async function updateAdminPassword() {
  try {
    // Hash the new password
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update the admin password
    const updateQuery = 'UPDATE admins SET password = $1 WHERE email = $2';
    await query(updateQuery, [hashedPassword, 'admin@srikannantraders.com']);
    
    console.log('✅ Admin password updated successfully!');
    console.log('Email: admin@srikannantraders.com');
    console.log('Password: admin123');
    
    // Also update customer passwords
    const customerPassword = 'password123';
    const hashedCustomerPassword = await bcrypt.hash(customerPassword, 10);
    
    const updateCustomerQuery = 'UPDATE customers SET password = $1 WHERE email = $2';
    await query(updateCustomerQuery, [hashedCustomerPassword, 'ramesh@email.com']);
    await query(updateCustomerQuery, [hashedCustomerPassword, 'suresh@email.com']);
    await query(updateCustomerQuery, [hashedCustomerPassword, 'mahesh@email.com']);
    await query(updateCustomerQuery, [hashedCustomerPassword, 'vijay@email.com']);
    
    console.log('✅ Customer passwords updated successfully!');
    console.log('Email: ramesh@email.com, Password: password123');
    console.log('Email: suresh@email.com, Password: password123');
    console.log('Email: mahesh@email.com, Password: password123');
    console.log('Email: vijay@email.com, Password: password123');
    
  } catch (error) {
    console.error('❌ Error updating passwords:', error);
  } finally {
    process.exit(0);
  }
}

updateAdminPassword();
