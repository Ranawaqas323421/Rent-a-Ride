#!/usr/bin/env bash
set -uo pipefail

# Rent-a-Ride health check
# Run from the repository root: bash scripts/health-check.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PASS=0
FAIL=0
WARN=0

pass() { printf "\033[32m[PASS]\033[0m %s\n" "$1"; PASS=$((PASS + 1)); }
fail() { printf "\033[31m[FAIL]\033[0m %s\n" "$1"; FAIL=$((FAIL + 1)); }
warn() { printf "\033[33m[WARN]\033[0m %s\n" "$1"; WARN=$((WARN + 1)); }
info() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }

info "Rent-a-Ride health check"

# Required tools and dependencies
info "Prerequisites"
if command -v node >/dev/null 2>&1; then
  pass "Node.js found ($(node --version))"
else
  fail "Node.js is not installed"
fi

if command -v npm >/dev/null 2>&1; then
  pass "npm found ($(npm --version))"
else
  fail "npm is not installed"
fi

if command -v curl >/dev/null 2>&1; then
  pass "curl is installed"
else
  fail "curl is required for backend health check"
fi

if [[ -d "$ROOT_DIR/node_modules" ]]; then
  pass "Root node_modules exists"
else
  fail "Root dependencies missing. Run: npm install"
fi

if [[ -d "$ROOT_DIR/client/node_modules" ]]; then
  pass "Frontend node_modules exists"
else
  fail "Frontend dependencies missing. Run: cd client && npm install"
fi

# Load environment without displaying secrets
info "MongoDB connection"
if [[ -f "$ROOT_DIR/.env" ]]; then
  if [[ -x "$(command -v node 2>/dev/null || true)" ]] && [[ -d "$ROOT_DIR/node_modules" ]]; then
    if node --input-type=module <<'NODE'
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env", quiet: true });

const uri = process.env.mongo_uri;
if (!uri) {
  console.error("mongo_uri is missing in the root .env file.");
  process.exit(2);
}

try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  await mongoose.connection.db.admin().ping();
  console.log("MongoDB connection and ping successful.");
  await mongoose.disconnect();
} catch (error) {
  console.error("MongoDB connection failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
NODE
    then
      pass "MongoDB is reachable and responds to ping"
    else
      fail "MongoDB connection failed; check mongo_uri, network access and credentials in .env"
    fi
  else
    fail "Cannot test MongoDB because root dependencies are missing; run npm install"
  fi
else
  fail "Root .env file not found. Create it from .env.example and set mongo_uri"
fi

# Backend endpoint: server.js /health also checks MongoDB readiness
info "Backend API"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL:-http://localhost:3000/health}"
if command -v curl >/dev/null 2>&1; then
  HTTP_CODE="$(curl -sS -o /tmp/rent-a-ride-health-response.$$ -w '%{http_code}' --max-time 8 "$BACKEND_HEALTH_URL" 2>/dev/null || true)"
  RESPONSE="$(cat /tmp/rent-a-ride-health-response.$$ 2>/dev/null || true)"
  rm -f /tmp/rent-a-ride-health-response.$$

  if [[ "$HTTP_CODE" == "200" ]] && printf '%s' "$RESPONSE" | grep -q '"success"[[:space:]]*:[[:space:]]*true'; then
    pass "Backend is responding and its /health endpoint reports database ready"
  elif [[ -n "$HTTP_CODE" && "$HTTP_CODE" != "000" ]]; then
    fail "Backend health endpoint returned HTTP $HTTP_CODE (URL: $BACKEND_HEALTH_URL)"
    [[ -n "$RESPONSE" ]] && printf '       Response: %s\n' "$RESPONSE"
  else
    fail "Backend is not reachable at $BACKEND_HEALTH_URL. Start it with: npm run dev"
  fi
else
  warn "Skipped backend HTTP check because curl is unavailable"
fi

# Frontend production compilation check
info "Frontend build"
if [[ -f "$ROOT_DIR/client/package.json" ]]; then
  if [[ -d "$ROOT_DIR/client/node_modules" ]]; then
    if npm --prefix "$ROOT_DIR/client" run build; then
      pass "Frontend production build completed successfully"
    else
      fail "Frontend build failed; review the build errors above"
    fi
  else
    fail "Frontend dependencies missing; run: cd client && npm install"
  fi
else
  fail "client/package.json not found"
fi

# Optional browser-facing frontend URL check
if [[ -n "${FRONTEND_URL:-}" ]]; then
  info "Frontend HTTP availability"
  FRONTEND_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 8 "$FRONTEND_URL" 2>/dev/null || true)"
  if [[ "$FRONTEND_CODE" =~ ^2[0-9][0-9]$ ]]; then
    pass "Frontend URL is responding (HTTP $FRONTEND_CODE)"
  else
    fail "Frontend URL did not return a 2xx response: $FRONTEND_URL (HTTP ${FRONTEND_CODE:-000})"
  fi
else
  warn "Frontend HTTP check skipped. Set FRONTEND_URL if a Vite/frontend server is already running."
fi

info "Final summary"
printf "Passed: %s | Failed: %s | Warnings: %s\n" "$PASS" "$FAIL" "$WARN"

if (( FAIL > 0 )); then
  printf "\033[31mHealth check failed. Fix the FAIL items before starting Docker work.\033[0m\n"
  exit 1
fi

printf "\033[32mAll required checks passed. This is a local health/build check, not a full booking/payment end-to-end test.\033[0m\n"
