const bcrypt = require('bcryptjs');

async function generatePassword() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log('Hashed password for admin123:', hashedPassword);
  
  // Also generate for customer password 'password123'
  const customerPassword = 'password123';
  const hashedCustomerPassword = await bcrypt.hash(customerPassword, 10);
  console.log('Hashed password for password123:', hashedCustomerPassword);
}

generatePassword().catch(console.error);
