# Rent a Ride

A full-stack car rental application with separate user, admin, and vendor experiences.

## Project structure

- `backend/` — Express API, MongoDB models, authentication, bookings, vehicle and vendor management.
- `client/` — React + Vite frontend.
- `package.json` — backend dependencies and scripts.

## Requirements

- Node.js 18 or later
- npm
- MongoDB database (local MongoDB or MongoDB Atlas)
- Cloudinary account for vehicle media uploads
- Razorpay account for payment processing
- Gmail app password (only if booking emails are enabled)

## Backend setup

From the repository root:

```bash
npm install
cp .env.example .env
```

Fill in the values in `.env`. Do not commit this file or share its secrets.

Start the API in development mode:

```bash
npm run dev
```

The API listens on port `3000` by default. Set `PORT` to change it. Check the API and MongoDB connection with:

```bash
curl http://localhost:3000/health
```

## Frontend setup

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The Vite development server uses `http://localhost:5173` by default and proxies `/api` requests to the backend. Set `VITE_PRODUCTION_BACKEND_URL` in `client/.env` only when the API is hosted somewhere other than `http://localhost:3000`. The deployed Vercel frontend uses the `/api` rewrite in `client/vercel.json`; update its destination if your backend host changes.

Build the frontend:

```bash
npm run build
```

## Environment variables

### Backend (`.env` in the repository root)

| Variable | Purpose |
| --- | --- |
| `mongo_uri` | MongoDB connection string |
| `ACCESS_TOKEN` | Long, random JWT access-token secret |
| `REFRESH_TOKEN` | Different long, random JWT refresh-token secret |
| `CLOUD_NAME` | Cloudinary cloud name |
| `API_KEY` | Cloudinary API key |
| `API_SECRET` | Cloudinary API secret |
| `RAZORPAY_KEY_ID` | Razorpay server key ID |
| `RAZORPAY_SECRET` | Razorpay server secret |
| `EMAIL_HOST` | Sender email address |
| `EMAIL_PASSWORD` | Email provider app password |
| `PORT` | Optional API port (default: `3000`) |
| `CLIENT_URL` | Comma-separated allowed frontend origins |

### Frontend (`client/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_PRODUCTION_BACKEND_URL` | Optional backend URL used by the Vite development proxy |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay key ID used by the checkout UI |
| `VITE_FIREBASE_API_KEY` | Firebase Web API key used by Google sign-in |

Only public values should use the `VITE_` prefix. Never put database credentials, JWT secrets, Cloudinary API secrets, or the Razorpay secret in frontend variables.

## Run the project health check

Open two terminals from the repository root:

1. Start the backend in the first terminal:

   ```bash
   npm install
   npm run dev
   ```

2. Run the health-check script in the second terminal:

   ```bash
   bash scripts/health-check.sh
   ```

The script checks the MongoDB connection using the root `.env` value `mongo_uri`, checks the backend `/health` endpoint (default `http://localhost:3000/health`), and runs the frontend production build. It prints PASS/FAIL results and exits with a non-zero status if a required check fails.

Optional: to also check whether a frontend server is responding, start it in another terminal and set its URL when running the script:

```bash
cd client && npm install && npm run dev
# In another terminal, from the repository root:
FRONTEND_URL=http://localhost:5173 bash scripts/health-check.sh
```

If your backend uses a different port, set `BACKEND_HEALTH_URL`, for example:

```bash
BACKEND_HEALTH_URL=http://localhost:4000/health bash scripts/health-check.sh
```

This script checks connectivity and frontend compilation; it does not perform full login, booking, or Razorpay end-to-end tests.

## Available scripts

Run these from the repository root:

- `npm run dev` — start the backend with nodemon.
- `npm start` — start the backend.

Run these from `client/`:

- `npm run dev` — start Vite.
- `npm run build` — create a production frontend build.
- `npm run lint` — run ESLint.
- `npm run preview` — preview the production build locally.

## Deployment notes

Configure backend environment variables in the hosting provider's secret/environment settings. Configure the frontend environment variables in the frontend hosting provider, including `VITE_RAZORPAY_KEY_ID` and `VITE_FIREBASE_API_KEY` when those sign-in/payment methods are enabled. Update `CLIENT_URL` to include the exact deployed frontend origin(s). For local development, copy `.env.example` to `.env` at the repository root and copy `client/.env.example` to `client/.env`; fill in your own values.

## Important security review items

Razorpay checkout signatures and captured payment status are now checked by the booking API before a booking is saved. Before using this application with real customers, still review and test server-side authorization for user, admin, and vendor routes; derive booking ownership from the authenticated user rather than request-body IDs; validate all request data; and restrict email sending to authenticated booking owners. Frontend route guards alone do not secure API endpoints.

## Tech stack

React, Vite, Redux Toolkit, Tailwind CSS, Material UI, Node.js, Express, MongoDB/Mongoose, JWT, Cloudinary, Nodemailer, Multer, and Razorpay.
