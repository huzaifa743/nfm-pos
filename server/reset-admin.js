const bcrypt = require('bcryptjs');
const { run, get } = require('./database');

async function resetAdminPassword() {
  try {
    console.log('Resetting admin password...');
    
    // Check if admin exists
    const admin = await get('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (!admin) {
      console.log('Admin user not found. Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        'INSERT INTO users (username, email, password, role, full_name) VALUES (?, ?, ?, ?, ?)',
        ['admin', 'admin@restaurant.com', hashedPassword, 'admin', 'Administrator']
      );
      console.log('✅ Admin user created successfully!');
    } else {
      console.log('Admin user found. Updating password...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await run(
        'UPDATE users SET password = ? WHERE username = ?',
        [hashedPassword, 'admin']
      );
      console.log('✅ Admin password reset successfully!');
    }
    
    console.log('\n📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n⚠️  Please change this password after first login!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    process.exit(1);
  }
}

resetAdminPassword();
