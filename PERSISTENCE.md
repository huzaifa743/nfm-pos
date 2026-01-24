# Keep Tenants Across Redeploys (Railway & Others)

**Without persistent storage, every redeploy wipes all tenants.** Only the DEMO tenant and super admin are recreated. Your created tenants disappear.

## Fix: Use Persistent Storage

### Option A: Railway (recommended)

**→ For a full walkthrough with your Railway UI, see [RAILWAY_VOLUME_GUIDE.md](./RAILWAY_VOLUME_GUIDE.md).**

1. **Open your Railway project** → select your **backend/service** (the one that runs the Node server).

2. **Create a volume**
   - Go to your service → **Variables** tab (or **Settings**).
   - Or use **"+ New"** → **Volume** in the project.
   - Create a new **Volume** and note the **mount path** you choose (e.g. `/data`).

3. **Attach the volume to your service**
   - In the service, open **Settings** → **Volumes** (or **Storage**). Click **Add Volume** → select the volume.
   - Set **Mount Path** to `/data` (or e.g. `/app/data` if you use a different layout).
   - Save.

4. **Set `DATA_DIR`** (if not using Railway’s auto path)
   - **Variables** → **+ New Variable**.
   - Name: `DATA_DIR`
   - Value: `/data` (must match the volume **Mount Path** exactly).
   - Save.

   **OR** skip this: the app uses `RAILWAY_VOLUME_MOUNT_PATH` automatically when a volume is attached. In that case, the mount path **is** your data directory – just ensure the volume is attached and the mount path is set (e.g. `/data`).

5. **Redeploy**
   - Trigger a **Redeploy** from the **Deployments** tab.
   - After deploy, check **Logs**. You should see:
     - `✅ Persistent storage: /data (Railway volume)` or `(DATA_DIR)`.

6. **Verify**
   - Create a tenant as super admin, redeploy again. The tenant should still be there.

### Option B: Manual `DATA_DIR` (any platform)

1. Create a **persistent disk/volume** and mount it at a path (e.g. `/data`).
2. Set environment variable: **`DATA_DIR=/data`** (use your actual mount path).
3. Restart/redeploy the app.

The app stores `master.db` and the `tenants/` folder under `DATA_DIR`. As long as that directory is persistent, tenants survive redeploys.

---

## Logs

- **`✅ Persistent storage: /data (Railway volume)`** → Using Railway volume; tenants will persist.
- **`✅ Persistent storage: /data (DATA_DIR)`** → Using `DATA_DIR`; tenants will persist.
- **`⚠️ TENANTS WILL BE LOST ON REDEPLOY`** → No persistent storage; add a volume + `DATA_DIR` (or attach a Railway volume) and redeploy.

---

## Summary

| Setup | Result |
|-------|--------|
| No volume, no `DATA_DIR` | Tenants lost on every redeploy |
| Railway volume attached (mount path e.g. `/data`) | Uses `RAILWAY_VOLUME_MOUNT_PATH` → tenants persist |
| `DATA_DIR=/data` (or your volume path) | Tenants persist |

**Tenants are only deleted when a super admin explicitly deletes them** in the Tenants UI. Startup never removes existing tenants.
