# SW-DEV-Project-1-Hotel-Booking

A full-stack hotel booking and reservation web application.

**Tech stack**
- Frontend: React (Vite), Redux Toolkit
- Backend: Node.js, Express.js
- Database: MongoDB (Mongoose) on MongoDB Atlas
- Integrations: Nodemailer (email), `qrcode`, Google Gemini API (chatbot)
- Testing: Postman / Newman, `node:test`

**Authors**
- Noppawat Loryingyongphaisal: security, authentication, authorization, booking logic
- Phitsinee Kloenthanom: frontend, payment + QR + email, AI chatbot, API tests, diagrams

📌 Computer Engineering students, Chulalongkorn University

---

## Requirements covered

| # | Requirement | Where |
|---|---|---|
| 1 | Register with name, telephone, email, password | `POST /api/v1/auth/register` · Register page |
| 2 | Log in with email + password, log out | `POST /auth/login`, `POST /auth/logout` |
| 3 | Book up to 3 nights at a listed hotel (name, address, tel) | `GET /hotels`, `POST /hotels/:hotelId/bookings` · Hotels + Book pages |
| 4–6 | User views / edits / deletes **own** bookings | `GET/PUT/DELETE /bookings[/:id]` · My bookings |
| 7–9 | Admin views / edits / deletes **any** booking | same endpoints as admin · All bookings |
| Extra 1 | Max 5 booking attempts per minute per user | `middleware/rateLimit.js`: exact sliding window kept in memory (429 + `Retry-After`) |
| Extra 2 | Confirmation email with QR code + receipt after payment | `POST /bookings/:id/pay`, `utils/receipt.js`; the QR holds a signed check-in code verified by `POST /bookings/checkin` |
| Extra 3 | Real-time AI support chatbot (no page refresh) | `POST /api/v1/chat` (Server-Sent Events) · chat widget |

## Getting started

Requirements: Node.js 20+ and a MongoDB **replica set**. MongoDB Atlas (free tier) works; booking uses transactions to prevent overbooking, and transactions need a replica set.

```bash
# 1. backend dependencies
npm install

# 2. configuration: copy the template and fill in your own values
cp config/config.env.example config/config.env
#    MONGO_URI, JWT_SECRET, SEED_* test accounts, CHAT_API_KEY (Gemini) ...

# 3. sample hotels + test accounts (admin and user from SEED_* in config.env)
npm run seed

# 4. start the API on http://localhost:5001
npm run dev

# 5. frontend, in a second terminal: http://localhost:5173
cd vacqfrontend
npm install
npm run dev
```

`config/config.env` holds secrets and is git-ignored. Only `config.env.example` is committed.

Without `SMTP_HOST`, emails go to a free [Ethereal](https://ethereal.email) test inbox, and the API returns a preview link. Without `CHAT_API_KEY`, the chatbot returns 503 and everything else still works.

If `npm run seed` fails with `querySrv ECONNREFUSED`, set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `config.env`.

## Demo and tests

The presentation runs the API through Newman (Postman CLI). The API must be running (`npm run dev`), and `npm run seed` must have been run once.

| Command | What it shows |
|---|---|
| `npm run demo` | Presentation steps 1–12 (register + validation, login, hotels, booking + rule checks, own/admin view-edit-delete, logout). Writes an HTML report to `postman/report.html` |
| `npm run demo:payment` | Extra 2: mock payment (declined + accepted card), QR + receipt email, receipt page |
| `npm run demo:chat` | Extra 3: streamed chatbot answers, prompt-injection refusal |
| `npm run demo:ratelimit` | Extra 1: the 6th booking attempt within a minute gets 429 + `Retry-After` (uses its own new user, so it can run any time) |
| `npm run demo:checkin` | Signed QR check-in code: forged/altered codes rejected, genuine code checks the guest in once |
| `npm run demo:admin` | Admin marks a booking as paid at the hotel / undoes a payment |
| `npm run demo:security` | Login brute-force lockout, forgot password, admin-created users, delete account |
| `npm test` | Unit tests (stay rules, pricing, receipt, chat input/prompt, SSE parser) |

All demos can run back to back and repeatedly: login limits only count wrong passwords and registration limits only count created accounts, so normal use never runs into them.

To change the tests, edit `postman/generate.js` and run `npm run postman:generate`. The collection can also be imported into the Postman app together with `postman/local.postman_environment.json`. Type the test-account credentials into the *Current value* column there.

## API overview (`/api/v1`)

| Method | Path | Access |
|---|---|---|
| POST | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | public |
| GET | `/auth/me` | logged in |
| POST / PUT | `/auth/forgotpassword`, `/auth/resetpassword/:token` | public |
| DELETE | `/auth/delete-me` | logged in |
| POST | `/auth/create-user` | admin |
| GET | `/hotels`, `/hotels/:id` | public |
| POST / PUT / DELETE | `/hotels`, `/hotels/:id` | admin |
| POST | `/hotels/:hotelId/bookings` | user, admin |
| GET | `/bookings`, `/bookings/:id` | own bookings (admin: all) |
| PUT / DELETE | `/bookings/:id` | own bookings (admin: all) |
| POST | `/bookings/:id/pay` | owner |
| GET | `/bookings/:id/receipt` | owner, admin |
| PATCH | `/bookings/:id/status` | admin |
| POST | `/bookings/checkin` | admin (hotel staff) |
| POST | `/chat` | logged in |

## Security notes

- Passwords are hashed with bcrypt. The 15-minute access token and the rotating refresh token live in HttpOnly, `SameSite=Strict` cookies; reusing a refresh token revokes all sessions.
- Ownership is checked in every booking query. Another user's booking ID returns 404 (no IDOR).
- Overbooking: create/update run in a MongoDB transaction that locks the hotel document. Each hotel has `totalRooms`.
- Rate limits use an exact sliding window kept in the server's memory (per process, reset on restart): 5 booking attempts/min per user, 10 chat messages/min per user, 10 wrong passwords per account+IP and 50 per IP per 15 min, 20 new accounts per IP per hour, 1000 requests per IP per 10 min. Set `TRUST_PROXY` behind a reverse proxy so `X-Forwarded-For` can't be spoofed.
- Check-in QR codes carry an HMAC-SHA256-signed token (`CHECKIN_TOKEN_SECRET`): codes can't be forged or altered, stop working when the payment is undone, and check a guest in only once.
- Payment amounts are computed on the server; card numbers are never stored; a booking can only go from pending to paid once.
- The chatbot only receives hotel data plus the requesting user's own bookings, rejects injected `system` messages, and the API key never leaves the server.
- Forgot password returns the same answer for every email and delivers the token only by email.
- In production (`NODE_ENV=production`) the server refuses to start without a strong `JWT_SECRET` and `CHECKIN_TOKEN_SECRET`, `CLIENT_ORIGIN` and SMTP settings, and the seed script creates no test accounts.

## Deploying (Render API + Vercel frontend)

1. **API on Render:** New → Blueprint → pick this repo (`render.yaml`). Fill the secrets it asks for. Atlas → Network Access must allow Render's IPs (or `0.0.0.0/0`).
2. **Frontend on Vercel:** import the repo, set *Root Directory* to `vacqfrontend`. Add the environment variable `VITE_API_URL=/api/v1` (`.env*` files are git-ignored). `vercel.json` proxies `/api/*` to the Render service, so the browser only talks to the Vercel domain and the `SameSite=Strict` cookies work.
3. If Render gives the service another name than `hotel-booking-api`, edit the destination in `vacqfrontend/vercel.json`. Set `CLIENT_ORIGIN` on Render to the Vercel URL.
4. Check `TRUST_PROXY`: log in wrongly 11 times from your phone, then from a laptop. If the laptop is also locked out, every user shares one IP: raise `TRUST_PROXY` to 2.
5. The Render free plan sleeps after ~15 min idle (first request ~50 s). Use a paid plan or a ping before a demo.

## Project documents

Use case, class and sequence diagrams are in [`docs/diagrams/`](docs/diagrams/), as PNGs for slides with editable sources.

```
config/       env template, DB connection, startup checks
controllers/  auth, hotels, bookings (incl. payment), chat
middleware/   auth (protect/authorize), validation, rate limits
models/       User, Hotel, Booking, RefreshToken, AuditLog
routes/       Express routers
utils/        booking rules, sliding-window limiter, check-in token, mailer, receipt + QR, LLM provider, audit log
postman/      Newman collection, generator and runner
test/         unit tests
vacqfrontend/ React frontend
docs/         diagrams
```
