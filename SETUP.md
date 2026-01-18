# Setup Guide

## Quick Start

1. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

2. **Start the development servers:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Open your browser to: http://localhost:3000
   - Login with:
     - Username: `admin`
     - Password: `admin123`

## First Time Setup

The database will be automatically created when you first run the server. The default admin user is created with:
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the default password immediately after first login!

## Production Deployment

### Option 1: Free Hosting (Render.com)

1. Create account at https://render.com
2. Create new Web Service
3. Connect your GitHub repository
4. Set build command: `npm run install-all && npm run build`
5. Set start command: `npm start`
6. Add environment variables:
   - `NODE_ENV=production`
   - `PORT=5000`
   - `JWT_SECRET=your-secret-key-here`

### Option 2: Self-Hosted VPS

1. **Get a VPS** (DigitalOcean, Linode, etc.)
2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   git clone <your-repo>
   cd restaurant-pos
   npm run install-all
   npm run build
   ```

4. **Install PM2:**
   ```bash
   sudo npm install -g pm2
   pm2 start server/index.js --name pos-server
   pm2 save
   pm2 startup
   ```

5. **Setup Nginx (optional):**
   ```bash
   sudo apt install nginx
   # Configure nginx to proxy to localhost:5000
   ```

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key-change-in-production
```

## Troubleshooting

### Database Issues
- Delete `server/pos.db` and restart the server to reset the database
- The database will be recreated automatically

### Port Already in Use
- Change the PORT in `.env` file
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :5000
  taskkill /PID <PID> /F
  
  # Linux/Mac
  lsof -ti:5000 | xargs kill
  ```

### Frontend Not Loading
- Make sure both servers are running
- Check that port 3000 is available
- Clear browser cache

### Image Upload Issues
- Ensure `server/uploads` directory exists
- Check file permissions
- Verify file size limits (max 5MB)

## Support

For issues or questions, check the README.md file or create an issue in the repository.
