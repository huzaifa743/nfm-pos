// Auto-setup super admin - can be called from server startup
const bcrypt = require('bcryptjs');
const { masterDbHelpers, ensureInitialized } = require('./tenantManager');

async function autoSetupSuperAdmin() {
  try {
    await ensureInitialized();

    const existing = await masterDbHelpers.get('SELECT * FROM super_admins LIMIT 1');
    if (existing) {
      return { success: true, message: 'Super admin already exists' };
    }

    const username = process.env.SUPER_ADMIN_USERNAME || 'superadmin';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'superadmin123';
    const email = process.env.SUPER_ADMIN_EMAIL || 'admin@restaurant-pos.com';
    const fullName = process.env.SUPER_ADMIN_NAME || 'Super Administrator';

    const hashedPassword = await bcrypt.hash(password, 10);
    await masterDbHelpers.run(
      'INSERT INTO super_admins (username, password, email, full_name) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, fullName]
    );

    console.log('✅ Super admin auto-created (username: ' + username + ')');
    return { success: true, message: 'Super admin created successfully' };
  } catch (error) {
    console.error('❌ Error in auto-setup super admin:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { autoSetupSuperAdmin };
