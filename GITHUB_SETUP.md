# How to Push Your Code to GitHub 🚀

This guide will help you push your Restaurant POS code to GitHub so you can deploy it to Railway, Render, or other cloud services.

---

## 📋 Prerequisites

Before you start, you need to:

1. **Install Git** (if not already installed)
   - Download from: https://git-scm.com/download/win
   - Install using default settings
   - Restart your terminal/PowerShell after installation

2. **Create a GitHub Account** (if you don't have one)
   - Sign up at: https://github.com/signup
   - It's free!

---

## 🎯 Step-by-Step Guide

### Step 1: Install Git (if not installed)

1. Go to https://git-scm.com/download/win
2. Download the installer
3. Run the installer (use default settings)
4. **Important:** Restart PowerShell/Command Prompt after installation

### Step 2: Verify Git Installation

Open PowerShell and run:

```powershell
git --version
```

You should see something like: `git version 2.xx.x`

---

### Step 3: Configure Git (First Time Only)

Set your name and email:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

Replace with your actual name and email.

---

### Step 4: Initialize Git in Your Project

Navigate to your project folder and initialize Git:

```powershell
cd "c:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
git init
```

This creates a Git repository in your project folder.

---

### Step 5: Add Files to Git

Add all your project files:

```powershell
git add .
```

This stages all files for commit (respects `.gitignore` rules).

---

### Step 6: Make Your First Commit

Save your files with a commit message:

```powershell
git commit -m "Initial commit: Restaurant POS System"
```

---

### Step 7: Create a GitHub Repository

1. **Go to GitHub.com** and sign in
2. Click the **"+" icon** (top right) → **"New repository"**
3. Fill in:
   - **Repository name:** `restaurant-pos` (or any name you like)
   - **Description:** "Restaurant Point of Sale System"
   - **Visibility:** Choose **Public** (free) or **Private**
   - **DO NOT** check "Initialize with README" (you already have files)
4. Click **"Create repository"**

---

### Step 8: Connect Your Local Repository to GitHub

GitHub will show you commands. Copy and run these (replace `YOUR_USERNAME` with your GitHub username):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/restaurant-pos.git
git branch -M main
git push -u origin main
```

**Example:**
If your GitHub username is `john123`, the command would be:
```powershell
git remote add origin https://github.com/john123/restaurant-pos.git
```

---

### Step 9: Push Your Code

After connecting, push your code:

```powershell
git push -u origin main
```

**Note:** You'll be asked to sign in:
- **Username:** Your GitHub username
- **Password:** You'll need a **Personal Access Token** (see below)

---

## 🔐 GitHub Authentication (Important!)

GitHub no longer accepts regular passwords. You need a **Personal Access Token**:

### Create a Personal Access Token:

1. Go to GitHub.com → Click your **profile picture** (top right)
2. Go to **Settings** → **Developer settings** (bottom left)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Click **"Generate new token"** → **"Generate new token (classic)"**
5. Give it a name: `My POS System`
6. Select scopes: Check **`repo`** (this gives full repository access)
7. Click **"Generate token"** at the bottom
8. **IMPORTANT:** Copy the token immediately (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Use the Token:

When you run `git push`, use:
- **Username:** Your GitHub username
- **Password:** Paste your **Personal Access Token** (not your GitHub password)

---

## ✅ Verify Your Push

After pushing, refresh your GitHub repository page. You should see all your files!

---

## 🔄 Future Updates (After First Push)

Whenever you make changes to your code:

```powershell
# Navigate to your project folder
cd "c:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"

# Add changes
git add .

# Commit changes
git commit -m "Description of your changes"

# Push to GitHub
git push
```

---

## 📝 Quick Reference Commands

```powershell
# Initialize Git
git init

# Add all files
git add .

# Commit changes
git commit -m "Your commit message"

# Connect to GitHub (first time only)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main

# Check status
git status

# View changes
git log
```

---

## ❓ Troubleshooting

### "git is not recognized"
- Git is not installed. Install from https://git-scm.com/download/win
- **Restart PowerShell** after installation

### "Authentication failed"
- Use a **Personal Access Token** instead of your password
- See "GitHub Authentication" section above

### "Repository not found"
- Check your repository URL is correct
- Make sure the repository exists on GitHub
- Verify you have access to the repository

### "Everything up-to-date"
- Your code is already pushed! No changes to push.

---

## 🎉 Success!

Once your code is on GitHub, you can:

1. **Deploy to Railway/Render** - They can automatically deploy from your GitHub repo
2. **Share your code** - Others can see and contribute
3. **Backup your code** - Your code is safely stored in the cloud
4. **Version control** - Track all changes to your code

---

## 🚀 Next Steps

After pushing to GitHub:

1. Read `QUICK_START.md` for deployment instructions
2. Deploy to **Railway** or **Render** using your GitHub repository
3. Get your public URL and access your POS system from anywhere!

---

**Need Help?** If you encounter any issues, check:
- GitHub Documentation: https://docs.github.com/
- Git Documentation: https://git-scm.com/doc
