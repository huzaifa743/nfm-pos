# Database persistence across redeploys

Tenants and the master database are stored in SQLite files. By default they live in `server/` (ephemeral on platforms like Railway), so **redeploys wipe all data** except what's recreated by auto-setup (super admin, DEMO tenant).

To **persist tenants across redeploys**:

1. Use a **persistent volume** (e.g. Railway Volumes) and mount it at a path like `/data`.
2. Set the **`DATA_DIR`** environment variable to that path (e.g. `DATA_DIR=/data`).
3. The app will store `master.db` and the `tenants/` folder under `DATA_DIR`.

**Tenants are never deleted** except when a super admin explicitly deletes one via the Tenants UI. Startup only creates missing super admin and DEMO tenant; it does not remove or overwrite other tenants.

**Railway example:** Create a volume, mount at `/data`, and set `DATA_DIR=/data` in your service environment variables.
