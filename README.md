# Luna

```
frontend/  React + Vite   (UI + Firebase sign-in for admin only; holds no secrets)
backend/   FastAPI        (Groq chat proxy + poems API + admin auth check)
```

## One-time setup
1. **Groq:** create a key at console.groq.com.
2. **Firebase:** create a project → enable Firestore, enable Authentication → Email/Password,
   add your admin user manually. Register a Web app and copy the 3 config values.
3. **Service account:** Project settings → Service accounts → Generate new private key.
   Save it as `backend/service-account.json` (git-ignored).
4. **Firestore rules:** paste `firestore.rules` (locks the DB; only the backend can touch it).
5. `backend/.env` ← copy `backend/.env.example` (Groq key, admin email, DEBUG=true locally).
   `frontend/.env` ← copy `frontend/.env.example` (3 Firebase values).

## Run locally (two terminals)
```
# backend (Windows)
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd frontend
npm install
npm run dev
```
Check the backend first: open http://localhost:8000/health/groq - it says exactly what is wrong with the Groq key.
API docs: http://localhost:8000/docs

## Docker
Copy root `.env.example` to `.env`, then `docker compose up --build` → app at http://localhost:8080.

## Tests / CI
`cd backend && pytest`. GitHub Actions runs backend tests + frontend build on every push.

## Deploy
- Backend → Render/Railway/Fly (Docker). Set the env vars from `backend/.env.example` with `DEBUG=false`,
  `ALLOWED_ORIGINS=https://your-frontend-domain`; supply the service-account JSON as the
  `FIREBASE_SERVICE_ACCOUNT_JSON` env var (whole JSON on one line).
- Frontend → Vercel/Netlify. Set the 3 Firebase vars plus `VITE_API_URL=https://your-backend-domain`.
