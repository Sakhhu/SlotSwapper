# SlotSwapper (Minimal)
This is a minimal implementation of the SlotSwapper full-stack challenge.

## Quick start (local)
1. Copy `.env.example` to `backend/.env` and set `JWT_SECRET`.
2. Run backend:
   - `cd backend && npm install`
   - `npm start`
3. Run frontend:
   - `cd frontend && npm install`
   - `npm run dev`
4. Open frontend at `http://localhost:5173` and backend is at `http://localhost:5000`.

## Features
- Signup / Login (JWT)
- Create / Update / Delete events
- Mark events as SWAPPABLE
- Marketplace: view other users' swappable slots
- Create Swap Requests and Accept/Reject with transactional swap logic (SQLite)

## Notes
This is a compact starter template intended to be extended. For production:
- Add validation, better error messages
- Use HTTPS and secure JWT handling (httpOnly cookies)
- Add tests and CI
