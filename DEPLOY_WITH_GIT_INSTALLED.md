# 🚀 Deployment Steps - After Git is Installed

This guide assumes you have already installed Git. If not, see `INSTALL_GIT_WINDOWS.md` first.

## Fixing Repository URL with Spaces/Special Characters

Your repository name "NfM Servies & Solution-POS" has spaces and special characters. Here are your options:

### Option 1: Rename Repository on GitHub (Recommended)

1. Go to your repository on GitHub: https://github.com/huzaifa743/NfM Servies & Solution-POS
2. Click **Settings** (top right of repository)
3. Scroll down to **Danger Zone**
4. Click **Change repository name**
5. Rename to: `NfM-Servies-Solution-POS` (no spaces, no special characters)
6. Click **I understand, change repository name**

### Option 2: Use Quotes in PowerShell

If you want to keep the repository name as-is, use quotes in PowerShell:

```powershell
git remote add origin "https://github.com/huzaifa743/NfM Servies & Solution-POS.git"
```

**However, this may cause issues later. Option 1 is recommended.**

---

## Complete Deployment Steps

### Step 1: Navigate to Your Project Folder

Open PowerShell and go to your project:

```powershell
cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
```

### Step 2: Initialize Git Repository

```powershell
git init
```

### Step 3: Add All Files

```powershell
git add .
```

### Step 4: Create Initial Commit

```powershell
git commit -m "Initial commit - Restaurant POS"
```

### Step 5: Add GitHub Remote

**If you renamed your repo (recommended):**
```powershell
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git
```

**If keeping original name (not recommended):**
```powershell
git remote add origin "https://github.com/huzaifa743/NfM Servies & Solution-POS.git"
```

### Step 6: Push to GitHub

First, check what branch you're on:
```powershell
git branch
```

If you see "master" instead of "main", use:
```powershell
git branch -M main
```

Then push:
```powershell
git push -u origin main
```

**Note:** You may need to authenticate:
- GitHub will prompt for username and password
- For password, use a **Personal Access Token** (not your account password)
- To create a token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token
- Give it `repo` permissions

---

## After Pushing to GitHub

Continue with the deployment steps in `HOW_TO_DEPLOY.md` starting from Step 2 (Go to Render.com).

---

## Troubleshooting

### "Remote origin already exists" Error

If you already added the remote but want to change it:
```powershell
git remote remove origin
git remote add origin YOUR_NEW_URL
```

### "Authentication failed" Error

- Create a Personal Access Token on GitHub
- Use the token as your password (not your account password)

### "Branch main does not exist" Error

Create and switch to main branch:
```powershell
git checkout -b main
git push -u origin main
```
