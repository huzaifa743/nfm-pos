# Railway Volume – Step-by-Step Guide

Use this guide to add a **Volume** to your **POS** service so tenants (and the database) **persist across redeploys**.

---

## What You’ll Do

1. Create a **Volume** in your Railway project.
2. **Attach** it to your **POS** service with mount path `/data`.
3. **Redeploy** the POS service.
4. Confirm in **Logs** that persistent storage is active.

---

## Step 1: Open Your Project

- Go to [railway.app](https://railway.app) and open your project (e.g. **accomplished-laughter**).
- You should see the **Architecture** view with your **POS** service card.

---

## Step 2: Create a New Volume

**Option A – From the project canvas**

1. Find the **"+ New"** button (usually top-right of the project view).
2. Click **"+ New"**.
3. Choose **"Volume"** from the menu.
4. If prompted to **select a service**, choose **POS**.
5. A new **Volume** resource will appear, often linked to your POS service.

**Option B – Command palette**

1. Press **`Ctrl+K`** (Windows) or **`Cmd+K`** (Mac).
2. Type **"volume"** or **"add volume"**.
3. Select the option to create a **Volume**.
4. When asked which service to attach it to, select **POS**.

---

## Step 3: Attach the Volume to POS and Set Mount Path

1. Click your **POS** service card to open its details (right panel).
2. Go to the **"Settings"** tab (next to Deployments, Variables, Metrics).
3. Scroll to the **"Volumes"** or **"Storage"** section.
4. Click **"Add Volume"** or **"Connect Volume"** (or similar).
5. Select the **Volume** you created in Step 2.
6. Set the **Mount Path** to:
   ```text
   /data
   ```
   (Use exactly `/data` – no trailing slash.)
7. Save / Apply the changes.

If the Volume was created already linked to POS, you may only need to **edit** it and set the Mount Path to `/data`.

---

## Step 4: (Optional) Set `DATA_DIR`

- The app can use **`RAILWAY_VOLUME_MOUNT_PATH`** automatically when a volume is attached, so you **don’t have to** set `DATA_DIR` if the mount path is `/data`.
- If you prefer to set it explicitly:
  1. Open your **POS** service.
  2. Go to the **"Variables"** tab.
  3. Click **"+ New Variable"** or **"Add Variable"**.
  4. **Name:** `DATA_DIR`
  5. **Value:** `/data`
  6. Save.

---

## Step 5: Redeploy

1. Stay in your **POS** service.
2. Go to the **"Deployments"** tab.
3. Click **"Redeploy"** on the latest deployment (or use the three-dot menu → **Redeploy**).
4. Wait until the deployment shows **“Deployment successful”** (green).

---

## Step 6: Check Logs

1. Go to **Logs** (project-level or service-level).
2. Select your **POS** service.
3. Look for one of these lines:
   - **`✅ Persistent storage: /data (Railway volume)`** – volume is used; tenants will persist.
   - **`✅ Persistent storage: /data (DATA_DIR)`** – `DATA_DIR` is used; tenants will persist.
   - **`⚠️ TENANTS WILL BE LOST ON REDEPLOY`** – no persistent storage; repeat Steps 2–5 and ensure the volume is attached with mount path `/data`.

---

## Step 7: Verify

1. Log in as **super admin** (tenant code empty, then your super admin credentials).
2. Create a **new tenant** (e.g. test business + owner).
3. Note the tenant in the list.
4. Go back to **Deployments** and **Redeploy** the POS service again.
5. After deploy, log in as super admin and open **Tenants**.
6. The tenant you created should **still be there**. If yes, persistence is working.

---

## Quick Reference

| Step | Action |
|------|--------|
| 1 | Open project → Architecture view |
| 2 | **+ New** → **Volume** → attach/link to **POS** |
| 3 | **POS** → **Settings** → **Volumes** → add volume, **Mount Path** = `/data` |
| 4 | (Optional) **Variables** → `DATA_DIR` = `/data` |
| 5 | **Deployments** → **Redeploy** |
| 6 | **Logs** → confirm `✅ Persistent storage: /data` |
| 7 | Create tenant → redeploy again → tenant still exists |

---

## If You Don’t See “Volume” or “Volumes”

- **Plan:** Volumes are available on **Hobby** and **Pro** plans. On a **free/trial** plan, you may need to upgrade.
- **UI changes:** Railway sometimes moves options. Check:
  - **+ New** (project level)
  - **Settings** → **Volumes** / **Storage** (service level)
  - **Command palette** (**Ctrl+K** / **Cmd+K**) → search “volume”

---

## Troubleshooting

- **Tenants still disappear after redeploy**
  - Confirm in **Logs** you see `✅ Persistent storage: /data`.
  - Ensure the volume is attached to **POS** (not another service) and Mount Path is exactly `/data`.
  - Redeploy **after** attaching the volume and setting the mount path.

- **“Permission denied” or similar errors**
  - Try adding variable **`RAILWAY_RUN_UID=0`** for the POS service, then redeploy.  
  (See [Railway Volumes](https://docs.railway.app/reference/volumes) for details.)

---

**Result:** With the volume attached and mount path `/data`, your **master database** and **tenant databases** are stored on persistent disk. Tenants survive redeploys and restarts.
