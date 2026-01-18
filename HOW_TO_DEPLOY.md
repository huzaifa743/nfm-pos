# 🚀 How to Deploy Your Restaurant POS - Simple Guide

Want to make your Restaurant POS live? Follow these simple steps!

## ⚠️ First: Install Git (If Not Already Installed)

**If you see "git is not recognized" error**, you need to install Git first!

### Quick Git Installation for Windows:

1. **Download Git:**
   - Go to: https://git-scm.com/download/win
   - Click "Download for Windows"
   - Run the installer (use default settings)

2. **After Installation:**
   - **Close and reopen PowerShell** (very important!)
   - Test by typing: `git --version`

3. **Configure Git (first time only):**
   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

📖 **For detailed Git installation instructions, see `INSTALL_GIT_WINDOWS.md`**

---

## 🎯 The Easiest Way: Render.com (5-10 minutes)

### What You Need
- ✅ Git installed (see above if needed)
- GitHub account (free)
- Render.com account (free)
- Your code pushed to GitHub

### Steps

#### 1️⃣ Push Code to GitHub

**Important:** If your repository name has spaces or special characters (like "&"), you should:
- **Option A (Recommended):** Rename your GitHub repository to remove spaces (e.g., "NfM-Servies-Solution-POS")
- **Option B:** Use quotes around the URL in PowerShell

**In PowerShell, run these commands:**
```powershell
git init
git add .
git commit -m "Ready to deploy"
git remote add origin "https://github.com/huzaifa743/NfM-Servies-Solution-POS.git"
git push -u origin main
```

**Note:** If you get an error about repository name with spaces, rename your repo on GitHub first to remove spaces and special characters.

#### 2️⃣ Go to Render.com
1. Visit https://render.com
2. Sign up with GitHub (easiest)
3. Click **"New +"** → **"Web Service"**
4. Connect your repository

#### 3️⃣ Configure Your App
- **Name**: restaurant-pos
- **Build Command**: `npm run install-all && npm run build`
- **Start Command**: `npm start`

#### 4️⃣ Add These Environment Variables
```
NODE_ENV = production
PORT = 5000
JWT_SECRET = any-long-random-string-here
VITE_API_URL = (leave empty, update after deploy)
```

#### 5️⃣ Deploy & Update
1. Click **"Create Web Service"**
2. Wait 5-10 minutes
3. Copy your URL (like `https://restaurant-pos-xxxx.onrender.com`)
4. Go to **Environment** tab
5. Update `VITE_API_URL` = `https://YOUR-URL.onrender.com/api`
6. Save (auto-redeploys)

#### 6️⃣ Done! 🎉
- Visit your URL
- Login: `admin` / `admin123`
- **Change password immediately!**

---

## 📋 Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created
- [ ] Web service created
- [ ] Environment variables added
- [ ] Deployed successfully
- [ ] `VITE_API_URL` updated
- [ ] Tested login
- [ ] Changed default password

---

## 🆘 Need More Details?

- **Complete Guide**: See `DEPLOYMENT.md`
- **Quick Checklist**: See `DEPLOY_CHECKLIST.md`
- **Local Testing**: See `QUICK_START.md`

---

## 💡 Tips

1. **Free Tier Sleeps**: Render free tier sleeps after 15 min. It auto-wakes when someone visits (takes ~30 seconds)

2. **Database**: Your SQLite database is included automatically. Back it up regularly!

3. **First Login**: Always use `admin` / `admin123`, then change it immediately

4. **Environment Variables**: Keep them safe! Don't share your `JWT_SECRET`

---

**That's it! Your Restaurant POS is now live! 🎉**
