# Running the app

## Start both frontend and backend (recommended)

From the **project root** (where `package.json` and `server/` are):

```bash
npm run dev
```

This starts:
- **Backend** on `http://localhost:5000`
- **Frontend (Vite)** on `http://localhost:3000`

Open **http://localhost:3000** in your browser. All API and image requests go through the frontend (port 3000); Vite proxies them to the backend. You must have both running.

## If you see `ERR_CONNECTION_REFUSED`

1. **Both servers must be running.** Use `npm run dev` from the project root so both start together.
2. **Do not point the client at port 5000.** If you have a `client/.env` file, remove any line like:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
   Leave `VITE_API_URL` unset (or set to `/api`) so the app uses the proxy and does not call `localhost:5000` from the browser.
3. If only the backend is running, you will still see connection refused for port 3000 (frontend). Start the full app with `npm run dev`.
