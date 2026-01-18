# Installing Git on Windows

You need to install Git first before you can push your code to GitHub.

## Method 1: Download Git Installer (Recommended)

1. **Download Git for Windows:**
   - Go to: https://git-scm.com/download/win
   - Or direct download: https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe

2. **Run the Installer:**
   - Double-click the downloaded `.exe` file
   - Click "Next" through the installation wizard
   - **Recommended settings:**
     - Choose "Git from the command line and also from 3rd-party software"
     - Choose "Use bundled OpenSSH"
     - Choose "Use the OpenSSL library"
     - Choose "Checkout Windows-style, commit Unix-style line endings"
   - Click "Install"

3. **Verify Installation:**
   - Close and reopen PowerShell/Command Prompt
   - Type: `git --version`
   - You should see: `git version 2.x.x`

## Method 2: Using Winget (Windows 11/Windows Package Manager)

If you have Windows 11 or Windows Package Manager installed:

```powershell
winget install --id Git.Git -e --source winget
```

Then restart PowerShell.

## Method 3: Using Chocolatey

If you have Chocolatey installed:

```powershell
choco install git -y
```

Then restart PowerShell.

---

## After Installing Git

1. **Close and reopen PowerShell** (important!)
2. Navigate back to your project folder:
   ```powershell
   cd "C:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
   ```
3. **Configure Git** (first time only):
   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

---

## Next Steps

After Git is installed, you can continue with the deployment steps in `HOW_TO_DEPLOY.md`

**Important Note:** If your GitHub repository name has spaces or special characters (like "NfM Servies & Solution-POS"), you need to either:
- Rename the repository on GitHub to remove spaces (e.g., "NfM-Servies-Solution-POS")
- Or use the URL-encoded version when adding the remote
