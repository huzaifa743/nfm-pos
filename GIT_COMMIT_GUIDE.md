# Complete Git Guide - Step by Step

## Step-by-Step Guide to Commit and Push Multi-Tenant Changes

### Step 1: Check Current Status

Open PowerShell in your project directory and check what files have changed:

```powershell
cd "c:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
git status
```

**What you'll see:**
- Modified files (files you changed)
- Untracked files (new files)
- Deleted files (if any)

---

### Step 2: Review Changes (Optional)

If you want to see what changed in a specific file:

```powershell
git diff server/tenantManager.js
```

Or see all changes:
```powershell
git diff
```

**Note:** This step is optional - you can skip if you're confident about your changes.

---

### Step 3: Stage All Changes

Add all modified, new, and deleted files to staging:

```powershell
git add .
```

**What this does:**
- Stages all changes for commit
- Prepares files to be committed

**Alternative:** If you want to add files one by one:
```powershell
git add server/tenantManager.js
git add server/routes/tenants.js
git add client/src/pages/Tenants.jsx
# ... etc
```

---

### Step 4: Verify Staged Files

Check what's staged for commit:

```powershell
git status
```

**What you'll see:**
- Files listed under "Changes to be committed" (green)
- These are ready to commit

---

### Step 5: Commit Changes

Create a commit with a descriptive message:

```powershell
git commit -m "Implement multi-tenant system with separate databases per restaurant"
```

**Good commit messages:**
- ✅ "Implement multi-tenant system with separate databases per restaurant"
- ✅ "Add tenant management: separate DB per restaurant, tenant_code login"
- ✅ "Multi-tenant: Complete data isolation with tenant-specific databases"

**Bad commit messages:**
- ❌ "changes"
- ❌ "fix"
- ❌ "update"

---

### Step 6: Push to GitHub

Push your commit to GitHub (this triggers Railway auto-deploy):

```powershell
git push origin main
```

**What this does:**
- Uploads your commits to GitHub
- Railway detects the push
- Railway automatically starts building and deploying

---

### Step 7: Verify Push Success

Check if push was successful:

```powershell
git log --oneline -3
```

**What you'll see:**
- Recent commits with their messages
- Your commit should be at the top

---

## Complete Command Sequence (Copy & Paste)

Here's the complete sequence you can copy and paste:

```powershell
# Navigate to project directory
cd "c:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"

# Check status
git status

# Stage all changes
git add .

# Commit with message
git commit -m "Implement multi-tenant system: separate databases per restaurant, tenant management UI, tenant_code authentication"

# Push to GitHub
git push origin main

# Verify
git log --oneline -3
```

---

## Troubleshooting

### If `git add .` shows errors:

**Error:** "fatal: not a git repository"
**Solution:** Make sure you're in the project directory

```powershell
cd "c:\Users\Huzaifa Usman\Desktop\Point of sale for Resturant"
```

---

### If `git push` fails:

**Error:** "Updates were rejected"
**Solution:** Someone else pushed changes. Pull first:

```powershell
git pull origin main
# Resolve any conflicts if needed
git push origin main
```

---

### If you want to undo a commit (before pushing):

```powershell
# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Or undo commit and changes
git reset --hard HEAD~1
```

**⚠️ Warning:** Only use `--hard` if you're sure you want to lose changes!

---

### If you want to see what will be pushed:

```powershell
git log origin/main..HEAD
```

Shows commits that will be pushed.

---

## After Pushing

### Monitor Railway Deployment

1. Go to https://railway.app
2. Open your project
3. Click on your service
4. Go to **"Deployments"** tab
5. Watch the build logs

**What to look for:**
- ✅ "Building..." → "Deploying..." → "Deployed"
- ❌ Red errors → Check logs for issues

---

### Monitor Render Deployment (if using)

1. Go to https://render.com
2. Open your web service
3. Check **"Events"** tab
4. Watch build progress

---

## Quick Reference

| Action | Command |
|--------|---------|
| Check status | `git status` |
| Stage all | `git add .` |
| Commit | `git commit -m "Your message"` |
| Push | `git push origin main` |
| View logs | `git log --oneline -5` |
| Pull latest | `git pull origin main` |
| Undo commit | `git reset --soft HEAD~1` |

---

## Best Practices

1. ✅ **Commit often** - Small, logical commits are better
2. ✅ **Write clear messages** - Describe what changed and why
3. ✅ **Test before pushing** - Make sure code works locally
4. ✅ **Review changes** - Use `git diff` to see what you're committing
5. ✅ **Push regularly** - Don't let commits pile up

---

## Example Workflow

```powershell
# 1. Check what changed
git status

# 2. Stage changes
git add .

# 3. Commit
git commit -m "Add multi-tenant system: separate databases, tenant management"

# 4. Push
git push origin main

# 5. Check Railway dashboard for deployment
# Railway URL: https://railway.app
```

---

## What Happens After Push

1. ✅ **GitHub** receives your code
2. ✅ **Railway** detects the push (if auto-deploy enabled)
3. ✅ **Railway** starts building (~3-5 minutes)
4. ✅ **Railway** deploys your app
5. ✅ **Your app** goes live with new features!

---

## Need Help?

If you encounter errors:
1. Copy the error message
2. Check Railway/Render logs
3. Verify all files are saved
4. Try `git pull` first, then push again

---

**Ready to push? Follow the steps above!** 🚀
