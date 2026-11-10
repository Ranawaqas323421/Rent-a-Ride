# Rent-a-Ride Branch Audit

**Branch:** `feature/waqas`  
**Audit scope:** Repository configuration, signup flow, Docker Compose networking, environment templates, and security-review findings.

## Fixes committed to this branch

1. **Vite API proxy:** Removed the stale EC2 IP fallback. Local development now defaults to `http://localhost:3000`; Docker Compose supplies `http://backend:3000`, which resolves through the Compose network.
2. **Frontend binding:** The frontend Vite server binds to `0.0.0.0` so it is reachable outside its container.
3. **Signup response handling:** The signup form now checks HTTP status and the backend's `success: false` error shape. It displays the server's error message instead of navigating after failed signup.
4. **Signup loading state:** The form now has a 20-second request timeout and always clears its loading state.
5. **Signup validation:** Frontend username and password limits now match backend limits (username 3–50 characters; password 8–128 characters).
6. **Compose networking:** The frontend proxy target is configured as `http://backend:3000` through the Compose environment.
7. **Environment template:** The sample MongoDB URI now uses `mongodb://mongodb:27017/rent-a-ride` for the Compose database service. Replace it with an Atlas URI when using Atlas.
8. **Git ignore cleanup:** Removed repeated ignore rules while retaining protection for real environment files and allowing example templates.

## Manual deployment steps still required

- Update the EC2 root `.env` value `CLIENT_URL` to include the exact current browser origin, for example `http://13.223.175.63:5173`. Do not commit this file.
- Rebuild and recreate the frontend and backend containers after pulling this branch.
- Confirm the Atlas Network Access list contains the EC2 public IP if the root `.env` uses MongoDB Atlas.
- Keep the MongoDB URI, JWT secrets, Cloudinary, Razorpay, and email credentials out of Git.

## Security and production risks not silently changed

- Google and vendor Google login currently trust profile fields supplied by the browser. The frontend must send a Firebase ID token and the backend must verify it with Firebase Admin SDK before these endpoints are safe for production. This requires Firebase Admin configuration.
- Rental price calculation remains client-controlled when creating payment orders; authoritative pricing must be calculated on the backend before real payments.
- The frontend retains localStorage token compatibility. HttpOnly-cookie-only authentication and CSRF protections require a coordinated migration.
- The current frontend Dockerfile intentionally runs the Vite development server, matching the requested setup. It is not a production frontend server.
- Existing vehicle/booking schema migration concerns documented in `SECURITY_REVIEW.md` remain open.

## Verification status

The changes above were reviewed against the current source files and saved on `feature/waqas`. A live build, automated test run, browser signup/login test, and EC2 redeployment have **not** been executed by this repository edit. Run those checks after pulling the branch; do not treat the audit as a claim that all application flows are verified.
