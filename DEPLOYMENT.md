# Deployment Guide - Restaurant POS System

This guide will help you deploy your Restaurant POS system so it can be accessed via a URL in your browser.

## Prerequisites

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. All dependencies installed (`npm run install-all`)

---

## Quick Start: Run Locally (Testing)

### Step 1: Create Environment File

Create a `.env` file in the root directory with:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your-very-secure-random-secret-key-here-change-this
```

**Important:** Generate a secure JWT_SECRET. You can use:
- Online generator: https://generate-secret.vercel.app/32
- Or run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 2: Build the Frontend

```bash
npm run build
```

This creates a production-ready build in `client/dist/`

### Step 3: Start the Server

```bash
npm start
```

The application will be available at: **http://localhost:5000**

Open your browser and navigate to this URL.

---

## Deploy to the Cloud (Make it Accessible via Public URL)

You have several options to deploy your application:

### Option 1: Railway (Recommended - Free Tier Available)

1. **Sign up** at [Railway.app](https://railway.app)
2. **Create a new project** → "Deploy from GitHub repo"
3. **Connect your GitHub repository**
4. **Set Environment Variables** in Railway dashboard:
   - `NODE_ENV=production`
   - `PORT=5000` (Railway will set this automatically)
   - `JWT_SECRET=<your-secure-secret-key>`
5. **Build Command:** `npm run install-all && npm run build`
6. **Start Command:** `npm start`
7. Railway will provide you with a public URL like: `https://your-app.up.railway.app`

### Option 2: Render (Free Tier Available)

1. **Sign up** at [Render.com](https://render.com)
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Settings:**
   - **Build Command:** `npm run install-all && npm run build`
   - **Start Command:** `npm start`
5. **Environment Variables:**
   - `NODE_ENV=production`
   - `JWT_SECRET=<your-secure-secret-key>`
6. Render will provide a URL like: `https://your-app.onrender.com`

### Option 3: Vercel (For Frontend) + Railway/Render (For Backend)

**For Backend (API Server):**
- Deploy the server separately using Railway or Render (same as above)

**For Frontend:**
1. Update `client/src/api/api.js` to use your backend URL
2. Sign up at [Vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Set root directory to `client/`
5. Build command: `npm run build`
6. Set environment variable: `VITE_API_URL=https://your-backend-url.com/api`

### Option 4: Heroku

1. Install Heroku CLI: [Download](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=<your-secure-secret-key>
   ```
5. Deploy: `git push heroku main`
6. Your app will be at: `https://your-app-name.herokuapp.com`

---

## Production Checklist

Before deploying, make sure:

- [ ] `.env` file has secure `JWT_SECRET`
- [ ] Frontend is built (`npm run build`)
- [ ] Database file (`server/pos.db`) exists and has proper permissions
- [ ] Admin user is set up (run `npm run setup-admin` if needed)
- [ ] Environment variables are set in your hosting platform
- [ ] All dependencies are installed

---

## Troubleshooting

### "Cannot find module" errors
Run: `npm run install-all`

### Database errors
Make sure `server/pos.db` exists. If not, the database will be created automatically on first run.

### Port already in use
Change the `PORT` in `.env` file or set it as an environment variable in your hosting platform.

### Frontend not loading in production
Make sure:
1. `npm run build` was executed successfully
2. `NODE_ENV=production` is set
3. `client/dist/` folder exists

---

## Accessing Your Deployed Application

Once deployed, you'll receive a URL from your hosting provider:
- Railway: `https://your-app.up.railway.app`
- Render: `https://your-app.onrender.com`
- Heroku: `https://your-app-name.herokuapp.com`

Open this URL in your browser to access your POS system!

---

## Need Help?

If you encounter any issues during deployment, check:
1. Server logs in your hosting platform's dashboard
2. Browser console for frontend errors
3. Network tab in browser DevTools for API errors
