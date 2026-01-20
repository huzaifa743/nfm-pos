# Multi-Tenant System Documentation

## Overview

This POS system now supports **multi-tenancy** - each restaurant owner gets their own:
- ✅ **Separate database** (complete data isolation)
- ✅ **Unique login credentials**
- ✅ **Isolated data** (only sees their own sales, products, customers, etc.)
- ✅ **Independent settings** (restaurant name, logo, currency, etc.)

## Architecture

### Master Database (`master.db`)
- Stores information about all tenants/restaurants
- Contains: tenant_code, restaurant_name, owner details, credentials
- Only accessible by **super admin**

### Tenant Databases (`tenants/{tenant_code}.db`)
- Each restaurant has its own SQLite database file
- Complete isolation - no data sharing between tenants
- Contains: users, products, sales, customers, settings, etc.

## User Roles

### 1. Super Admin
- **Username**: `superadmin`
- **Password**: `superadmin123` (change this!)
- **Access**: Can create/manage tenants
- **Database**: Master database only
- **Purpose**: Software vendor/developer account

### 2. Restaurant Owner (Admin)
- **Access**: Full access to their restaurant's data
- **Database**: Their tenant database only
- **Can**: Manage users, products, sales, settings for their restaurant

### 3. Cashier/Staff
- **Access**: Limited to their restaurant's data
- **Database**: Their tenant database only
- **Can**: Process sales, view products (as configured by owner)

## How It Works

### Creating a New Tenant (Restaurant)

1. **Super Admin logs in** (no tenant_code needed)
2. **Goes to Tenants page**
3. **Creates new tenant** with:
   - Restaurant name
   - Owner name, email, phone
   - Username and password for owner
4. **System automatically**:
   - Creates unique tenant_code
   - Creates separate database file
   - Sets up all tables
   - Creates owner as admin user
   - Sets restaurant name in settings

### Restaurant Owner Login

1. **Owner logs in** with:
   - Username (provided by super admin)
   - Password (provided by super admin)
   - Tenant code (unique identifier)
2. **System**:
   - Validates credentials in master database
   - Connects to their tenant database
   - Shows only their restaurant's data

### Data Isolation

- Each tenant database is completely separate
- No way for one restaurant to see another's data
- Each has their own:
  - Products
  - Sales
  - Customers
  - Users
  - Settings

## API Endpoints

### Authentication
```
POST /api/auth/login
Body: {
  username: "owner_username",
  password: "password",
  tenant_code: "restaurant123"  // Required for tenant login
}
```

### Tenant Management (Super Admin Only)
```
POST /api/tenants          - Create new tenant
GET  /api/tenants          - List all tenants
GET  /api/tenants/:id      - Get tenant details
PUT  /api/tenants/:id      - Update tenant
DELETE /api/tenants/:id    - Delete tenant
```

## Database Structure

### Master Database Tables
- `tenants` - Stores all restaurant/tenant information

### Tenant Database Tables (Same for each tenant)
- `users` - Restaurant staff users
- `products` - Restaurant products
- `categories` - Product categories
- `customers` - Restaurant customers
- `sales` - Sales transactions
- `sale_items` - Sale line items
- `settings` - Restaurant settings

## File Structure

```
server/
├── master.db                    # Master database
├── tenantManager.js             # Tenant management logic
├── tenants/                     # Tenant databases directory
│   ├── restaurant1.db          # Restaurant 1 database
│   ├── restaurant2.db          # Restaurant 2 database
│   └── ...
├── middleware/
│   ├── auth.js                 # Authentication
│   └── tenant.js               # Tenant database middleware
└── routes/
    ├── tenants.js              # Tenant management routes
    └── ...                      # Other routes (use tenant DB)
```

## Security

- ✅ Each tenant has isolated database
- ✅ JWT tokens include tenant_code
- ✅ All queries automatically scoped to tenant
- ✅ Super admin can only manage tenants, not access tenant data
- ✅ No cross-tenant data access possible

## Setup Instructions

### 1. Initial Setup

1. **Create super admin account** (manually or via script)
2. **Login as super admin**
3. **Create tenants** via Tenants management page

### 2. For Each Restaurant Owner

1. **Super admin creates tenant** with:
   - Restaurant details
   - Owner credentials
2. **System generates** unique tenant_code
3. **Owner receives**:
   - Username
   - Password
   - Tenant code
4. **Owner logs in** with all three pieces of information

## Benefits

✅ **Complete Data Isolation** - Each restaurant's data is separate
✅ **Scalability** - Easy to add new restaurants
✅ **Security** - No risk of data leakage between tenants
✅ **Independence** - Each restaurant manages their own data
✅ **Backup** - Can backup individual tenant databases
✅ **Maintenance** - Can manage tenants independently

## Next Steps

1. ✅ Create tenant management UI page
2. ✅ Update all routes to use tenant database middleware
3. ✅ Update login page to include tenant_code field
4. ✅ Create super admin dashboard
5. ✅ Test multi-tenant functionality

## Important Notes

⚠️ **Super Admin Password**: Change default password immediately!
⚠️ **Tenant Codes**: Keep tenant codes secure - they're like API keys
⚠️ **Backups**: Backup master.db and tenants/ directory regularly
⚠️ **Database Files**: Each tenant database is a separate file

## Migration from Single Tenant

If you have existing data:
1. Create a tenant for existing restaurant
2. Migrate data to tenant database
3. Update login to use tenant_code

---

**This system allows you to sell your POS software to multiple restaurants, each with complete data isolation!** 🎉
