const bcrypt = require('bcryptjs');
const { run } = require('./database');

async function setupAdmin() {
  try {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await run(
      `UPDATE users SET password = ? WHERE username = 'admin'`,
      [hashedPassword]
    );
    
    console.log('Admin password set successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();
