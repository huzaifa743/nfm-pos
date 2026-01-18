# 🚀 Restaurant POS - Complete Deployment Guide

This guide will help you deploy your Restaurant Point of Sale system live on the internet.

## 📋 Table of Contents

1. [Quick Overview](#quick-overview)
2. [Option 1: Render.com (EASIEST - Recommended)](#option-1-rendercom-easiest---recommended)
3. [Option 2: Railway.app](#option-2-railwayapp)
4. [Option 3: Self-Hosted VPS](#option-3-self-hosted-vps)
5. [Post-Deployment Checklist](#post-deployment-checklist)
6. [Troubleshooting](#troubleshooting)

---

## Quick Overview

Your Restaurant POS system consists of:
- **Frontend**: React app (Vite) - runs on port 3000 in dev, built for production
- **Backend**: Node.js/Express API - runs on port 5000
- **Database**: SQLite (file-based, easy to manage)

**Important Files:**
- `.env` - Environment variables (create this!)
- `server/index.js` - Backend server
- `client/` - Frontend React app

---

## Option 1: Render.com (EASIEST - Recommended) ⭐

Render.com is the easiest way to deploy. It's free for small projects and handles everything automatically.

### Prerequisites

1. **GitHub Account** (free at github.com)
2. **Render.com Account** (free at render.com)
3. **Your code in a GitHub repository**

### Step-by-Step Guide

#### Step 1: Push Your Code to GitHub

1. Create a GitHub account if you don't have one
2. Create a new repository (e.g., "restaurant-pos")
3. Open terminal/PowerShell in your project folder:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit - Restaurant POS"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name.

#### Step 2: Create Render Account

1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with your GitHub account (easiest option)

#### Step 3: Create New Web Service on Render

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select your `restaurant-pos` repository
4. Configure the service:

   **Basic Settings:**
   - **Name**: `restaurant-pos` (or any name you like)
   - **Region**: Choose closest to you (e.g., `Oregon (US West)`)

   **Build & Deploy:**
   - **Root Directory**: Leave empty (root of repo)
   - **Environment**: `Node`
   - **Build Command**: 
     ```bash
     npm run install-all && npm run build
     ```
   - **Start Command**: 
     ```bash
     npm start
     ```

   **Environment Variables:**
   Click **"Add Environment Variable"** and add these:
   
   ```
   NODE_ENV = production
   PORT = 5000
   JWT_SECRET = your-super-secret-random-string-here-make-it-long-and-random
   VITE_API_URL = https://your-app-name.onrender.com/api
   ```
   
   **⚠️ Important**: 
   - Replace `your-super-secret-random-string-here` with a random long string (use password generator)
   - Replace `your-app-name.onrender.com` with your actual Render URL (you'll get this after first deploy)

5. Click **"Create Web Service"**

#### Step 4: Wait for Deployment

- Render will automatically install dependencies and build your app
- This takes 5-10 minutes the first time
- You'll see logs showing the progress

#### Step 5: Update VITE_API_URL (After First Deploy)

1. Once deployed, Render gives you a URL like: `https://restaurant-pos-xxxx.onrender.com`
2. Go back to **Environment** tab in Render dashboard
3. Update `VITE_API_URL` to: `https://YOUR-ACTUAL-URL.onrender.com/api`
4. Click **"Save Changes"** - this will trigger a redeploy

#### Step 6: Access Your Live App!

- Your app will be live at: `https://YOUR-URL.onrender.com`
- Default login:
  - Username: `admin`
  - Password: `admin123`

### Render Free Tier Limits

- App sleeps after 15 minutes of inactivity (freezes, but data is safe)
- Wakes up automatically on next request (takes ~30 seconds)
- Perfect for small restaurants!

**To avoid sleep:** Upgrade to paid plan ($7/month) or use scheduled pings

---

## Option 2: Railway.app

Railway is another easy option similar to Render.

### Steps

1. Go to https://railway.app
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js projects
5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   JWT_SECRET=your-secret-key
   VITE_API_URL=${{RAILWAY_PUBLIC_DOMAIN}}/api
   ```
6. Deploy! Railway provides a URL automatically

---

## Option 3: Self-Hosted VPS

If you have your own server or VPS, here's how to deploy.

### Requirements

- Ubuntu/Debian server (20.04+)
- Root/sudo access
- Domain name (optional, but recommended)

### Step-by-Step Setup

#### Step 1: Connect to Your Server

```bash
ssh root@YOUR_SERVER_IP
```

#### Step 2: Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x or higher
npm --version
```

#### Step 3: Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

#### Step 4: Clone Your Repository

```bash
# Install git if not installed
sudo apt install git -y

# Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd restaurant-pos
```

#### Step 5: Install Dependencies and Build

```bash
# Install all dependencies
npm run install-all

# Build the frontend
npm run build
```

#### Step 6: Create Environment File

```bash
# Create .env file
nano .env
```

Add these lines:
```
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-random-string-here
VITE_API_URL=http://YOUR_SERVER_IP:5000/api
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

#### Step 7: Start the Application with PM2

```bash
# Start the app
pm2 start server/index.js --name restaurant-pos

# Make it start on server reboot
pm2 save
pm2 startup
# Follow the instructions it shows
```

#### Step 8: Install Nginx (Optional but Recommended)

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx config
sudo nano /etc/nginx/sites-available/restaurant-pos
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/restaurant-pos /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

#### Step 9: Setup SSL with Let's Encrypt (Free HTTPS)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN
```

Follow the prompts. Your site will now have HTTPS!

---

## Post-Deployment Checklist ✅

After deploying, make sure to:

- [ ] **Change default admin password** (Login → Settings → Users → Change Password)
- [ ] **Test the application** (Login, add products, make a sale)
- [ ] **Backup your database** regularly (SQLite file: `server/pos.db`)
- [ ] **Update JWT_SECRET** to a strong random value
- [ ] **Set up regular backups** of your database
- [ ] **Monitor logs** for any errors

### Backup Your Database (Important!)

For SQLite database:
```bash
# On server or locally
cp server/pos.db server/pos.db.backup
```

Or use a cloud backup service.

---

## Troubleshooting 🔧

### Problem: App shows blank page after deployment

**Solution**: Check `VITE_API_URL` environment variable is set correctly with your actual domain.

### Problem: "Cannot connect to API" error

**Solution**: 
- Verify backend is running (check logs)
- Ensure `VITE_API_URL` points to correct API URL
- Check CORS settings (should allow your domain)

### Problem: App goes to sleep on Render

**Solution**: This is normal for free tier. It wakes up automatically. Consider:
- Upgrading to paid plan
- Using a ping service to keep it awake

### Problem: Database not persisting

**Solution**: 
- SQLite file should be in `server/pos.db`
- Check file permissions on server
- Ensure server has write access to directory

### Problem: Images not uploading

**Solution**: 
- Check `server/uploads/` directory exists
- Verify file permissions (should be writable)
- Check max file size settings

### Problem: Can't login after deployment

**Solution**:
- Try default credentials: `admin` / `admin123`
- Check database was created (look for `server/pos.db`)
- Check server logs for errors

### Check Application Logs

**Render**: Go to dashboard → Your service → Logs

**Railway**: Go to dashboard → Your service → Deployments → View logs

**VPS with PM2**: 
```bash
pm2 logs restaurant-pos
```

---

## Security Recommendations 🔒

1. **Change default password immediately**
2. **Use strong JWT_SECRET** (random 32+ character string)
3. **Enable HTTPS** (automatically done on Render/Railway, use Let's Encrypt on VPS)
4. **Regular backups** of database
5. **Keep dependencies updated**: `npm audit` and `npm update`
6. **Use environment variables** for all secrets (never commit `.env` to git!)

---

## Need Help?

- Check application logs for error messages
- Verify all environment variables are set
- Ensure database file has proper permissions
- Test locally first before deploying

---

## Quick Reference Commands

### Local Development
```bash
npm run install-all    # Install all dependencies
npm run dev           # Start dev servers
npm run build         # Build for production
npm start             # Start production server
```

### PM2 Commands (VPS)
```bash
pm2 start server/index.js --name restaurant-pos
pm2 stop restaurant-pos
pm2 restart restaurant-pos
pm2 logs restaurant-pos
pm2 status
```

---

**Congratulations! Your Restaurant POS is now live! 🎉**
