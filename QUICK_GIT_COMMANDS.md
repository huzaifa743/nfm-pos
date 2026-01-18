# 🚀 Quick Git Commands - Copy & Paste

## ⚠️ Important: You Must Be in the Project Folder!

Your project folder is: `C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant`

**NOT** just `Desktop`!

## Complete Commands (Run These in Order)

Copy and paste these commands **ONE BY ONE** into PowerShell:

### Step 1: Navigate to Project Folder
```powershell
cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
```

### Step 2: Verify You're in the Right Place
```powershell
pwd
```
You should see: `C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant`

### Step 3: Initialize Git Repository
```powershell
git init
```

### Step 4: Add All Files
```powershell
git add .
```

### Step 5: Create First Commit
```powershell
git commit -m "Initial commit - Restaurant POS"
```

### Step 6: Rename Branch to Main
```powershell
git branch -M main
```

### Step 7: Add GitHub Remote
```powershell
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git
```

### Step 8: Push to GitHub
```powershell
git push -u origin main
```

**Note:** When pushing, GitHub will ask for:
- **Username:** `huzaifa743`
- **Password:** Use a **Personal Access Token** (create one on GitHub if needed)

---

## If Remote Already Exists

If you get "remote origin already exists", remove it first:

```powershell
git remote remove origin
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git
```

---

## Complete Sequence (All At Once for Reference)

```powershell
# Navigate to project
cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"

# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Initial commit - Restaurant POS"

# Rename to main
git branch -M main

# Add remote
git remote add origin https://github.com/huzaifa743/NfM-Servies-Solution-POS.git

# Push
git push -u origin main
```

---

**Remember:** Always run these commands from **INSIDE** the project folder!
