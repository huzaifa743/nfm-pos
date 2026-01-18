# Restaurant Point of Sale (POS) System

A professional, full-featured Point of Sale system designed specifically for restaurants. Built with React, Node.js, Express, and SQLite.

## Features

### 🎯 Core Features

- **Dashboard**: Real-time sales metrics, revenue tracking, and charts
- **Billing System**: Complete POS with cart management, checkout, and thermal printer support
- **Inventory Management**: Product and category management with image support
- **Sales History**: Complete transaction history with receipt viewing and reprinting
- **Reports**: Comprehensive sales and product performance reports
- **User Management**: Multi-user support with role-based permissions (Admin/Cashier)
- **Multi-language Support**: English, Arabic, and Urdu
- **Responsive Design**: Works on desktop and tablet devices

### 💳 Billing System Features

- Product search and category filtering
- Real-time cart management
- Customer selection and management
- Discount (percentage or fixed amount)
- Manual VAT calculation with "No VAT" option
- Multiple payment methods (Cash, Card, Online, Pay After Delivery)
- Order types (Dine-in, Takeaway, Delivery)
- Thermal printer integration with proper formatting
- Receipt preview and printing

### 📊 Dashboard Features

- Total Sales Today
- Total Revenue Today
- Total Products and Categories
- Average Sale Value
- Top 5 High Selling Products
- Interactive charts and graphs

### 📦 Inventory Features

- Add/Edit/Delete products
- Category management
- Product images
- Stock quantity tracking
- Search and filter functionality

### 📈 Reports Features

- Sales reports with date range filtering
- Product performance reports
- Payment method analysis
- Order type breakdown
- Summary statistics

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Setup Instructions

1. **Clone or download the project**

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Create environment file**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your configuration:
   ```
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your-secret-key-change-in-production
   ```

5. **Start the development servers**

   Option 1: Run both servers together
   ```bash
   npm run dev
   ```

   Option 2: Run separately
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials

- **Username**: admin
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
restaurant-pos/
├── server/                 # Backend code
│   ├── routes/            # API routes
│   ├── middleware/        # Authentication middleware
│   ├── database.js        # Database setup
│   └── index.js          # Server entry point
├── client/               # Frontend code
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/    # React contexts
│   │   ├── api/         # API client
│   │   └── locales/     # Translation files
│   └── package.json
└── package.json
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Sales
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales` - Create sale

### Customers
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create customer

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/charts` - Get chart data

### Reports
- `GET /api/reports/sales` - Get sales report
- `GET /api/reports/products` - Get product report

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

## Thermal Printer Setup

The system includes thermal printer support. To configure:

1. **Browser Print Settings**:
   - Set paper size to 80mm (3 inches)
   - Disable headers and footers
   - Set margins to minimum

2. **Print Receipt**:
   - Complete a sale
   - Click "Print" button on receipt preview
   - Select your thermal printer
   - Ensure proper formatting

## Deployment Options

### Free Hosting Options

1. **Render** (Recommended)
   - Free tier available
   - Easy deployment
   - Automatic SSL
   - Visit: https://render.com

2. **Railway**
   - Free tier with limits
   - Simple deployment
   - Visit: https://railway.app

3. **Vercel** (Frontend only)
   - Free hosting for React apps
   - Visit: https://vercel.com

4. **Heroku** (Limited free tier)
   - Visit: https://heroku.com

### Self-Hosted Server

For your own server:

1. **VPS Providers**:
   - DigitalOcean ($5/month)
   - Linode ($5/month)
   - Vultr ($5/month)
   - AWS EC2 (Free tier available)

2. **Setup Steps**:
   ```bash
   # Install Node.js
   sudo apt update
   sudo apt install nodejs npm

   # Clone repository
   git clone <your-repo>
   cd restaurant-pos

   # Install dependencies
   npm install
   cd client && npm install && npm run build && cd ..

   # Set environment variables
   export NODE_ENV=production
   export PORT=5000
   export JWT_SECRET=your-secret-key

   # Start server
   npm start
   ```

3. **Use PM2 for process management**:
   ```bash
   npm install -g pm2
   pm2 start server/index.js --name pos-server
   pm2 save
   pm2 startup
   ```

## Security Considerations

1. **Change default credentials** immediately
2. **Use strong JWT_SECRET** in production
3. **Enable HTTPS** in production
4. **Regular backups** of database
5. **Keep dependencies updated**
6. **Use environment variables** for sensitive data

## Database

The system uses SQLite by default (easy to set up). For production, consider migrating to:
- PostgreSQL
- MySQL
- MongoDB

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

MIT License - Feel free to use and modify for your restaurant.

## Support

For issues or questions, please check the code comments or create an issue in the repository.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Made with ❤️ for restaurants**
