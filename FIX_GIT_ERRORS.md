# 🔧 Fixing Git Errors - Quick Solutions

## Problem 1: "git is not recognized"

**Error Message:**
```
git : The term 'git' is not recognized as the name of a cmdlet, function, script file, or operable program.
```

### Solution: Install Git

1. **Download Git for Windows:**
   - Visit: https://git-scm.com/download/win
   - Or direct link: https://github.com/git-for-windows/git/releases/latest
   - Download the `.exe` file (e.g., `Git-2.43.0-64-bit.exe`)

2. **Install Git:**
   - Double-click the downloaded `.exe` file
   - Click "Next" through all steps (default settings are fine)
   - Click "Install"
   - Wait for installation to complete

3. **Restart PowerShell:**
   - **IMPORTANT:** Close your current PowerShell window completely
   - Open a new PowerShell window
   - Navigate back to your project folder:
     ```powershell
     cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
     ```

4. **Verify Installation:**
   ```powershell
   git --version
   ```
   You should see something like: `git version 2.43.0.windows.1`

5. **Configure Git (first time only):**
   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

---

## Problem 2: Repository URL with Spaces and Special Characters

**Error Message:**
```
The ampersand (&) character is not allowed. The & operator is reserved for future use;
wrap an ampersand in double quotation marks ("&") to pass it as part of a string.
```

Your repository name "NfM Servies & Solution-POS" contains spaces and special characters.

### Solution: Rename Repository (Recommended)

**Option A: Rename on GitHub (Best)**

1. Go to your GitHub repository
2. Click **Settings** (in the repository menu)
3. Scroll to **Danger Zone** section
4. Click **Change repository name**
5. Change from: `NfM Servies & Solution-POS`
6. Change to: `NfM-Servies-Solution-POS` (no spaces, no special characters)
7. Click **I understand, change repository name**

Then use:
```powershell
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git
```

### Solution: Use Quotes (Alternative)

If you want to keep the name, wrap the URL in quotes:

```powershell
git remote add origin "https://github.com/huzaifa743/NfM Servies & Solution-POS.git"
```

**⚠️ Warning:** This may cause issues in future commands. Renaming is recommended.

---

## Complete Corrected Commands

After installing Git and fixing the repository name, use these commands in order:

```powershell
# 1. Navigate to project (if not already there)
cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"

# 2. Initialize git
git init

# 3. Add all files
git add .

# 4. Commit files
git commit -m "Initial commit - Restaurant POS"

# 5. Add remote (use your ACTUAL repository name)
# If renamed: NfM-Servies-Solution-POS
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git

# 6. Check/rename branch to main
git branch -M main

# 7. Push to GitHub
git push -u origin main
```

---

## If You Get Authentication Errors

When you run `git push`, GitHub may ask for credentials:

1. **Username:** Your GitHub username (`huzaifa743`)
2. **Password:** Use a **Personal Access Token** (NOT your GitHub password)

### Creating a Personal Access Token:

1. Go to GitHub → Click your profile picture (top right)
2. Click **Settings**
3. Scroll down → Click **Developer settings** (left sidebar)
4. Click **Personal access tokens** → **Tokens (classic)**
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name: `Restaurant POS Deployment`
7. Select scopes: Check **repo** (all checkboxes under it)
8. Click **Generate token**
9. **COPY THE TOKEN** (you won't see it again!)
10. Use this token as your password when pushing

---

## Quick Checklist

- [ ] Git is installed (`git --version` works)
- [ ] PowerShell restarted after Git installation
- [ ] Repository renamed (removed spaces/special chars) OR using quotes
- [ ] Git configured with name and email
- [ ] Personal Access Token created (if authentication needed)

---

## Still Having Issues?

1. Make sure you closed and reopened PowerShell after installing Git
2. Check that your repository name doesn't have spaces (rename it if it does)
3. Verify you're in the correct folder:
   ```powershell
   pwd  # Should show: C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant
   ```

---

**Next Steps:** Once Git is working and code is pushed to GitHub, continue with deployment steps in `HOW_TO_DEPLOY.md`
