# API Security Review

**Reviewed branch:** `feature/waqas`  
**Review date:** 2026-11-06  
**Scope:** JWT/session handling, role authorization, booking ownership, vendor data isolation, email delivery, request validation, payment-order binding, and vehicle/booking schemas.

## Changes made on this branch

- Added short-lived access tokens (15 minutes), refresh tokens (7 days), host-only HttpOnly cookies, atomic refresh-token rotation, and refresh-token revocation on sign-out and password change. The existing Bearer `refreshToken,accessToken` format and JSON token response remain supported for compatibility.
- Added reusable user, vendor, and admin role middleware. Admin data/mutation routes now require admin role; vendor routes require vendor role; private user/booking routes require user role.
- Vendor vehicle creation now derives `addedBy` from the authenticated vendor. Vendor vehicle listing, edit, delete, and booking history are scoped to that vendor.
- Booking ownership now comes from `req.user`; the legacy `user_id` body field is only checked for mismatch and is not used as the owner.
- Booking/email endpoints validate inputs. Booking emails are generated from the authenticated user's persisted booking and account email, not client-supplied recipient or HTML data.
- Razorpay orders now carry server-generated user, vehicle, date, and pickup/drop-off metadata. Booking creation verifies those notes and the captured payment, checks vehicle availability, and rejects reuse of an order/payment.
- Added booking owner and pickup-district schema fields, profile/vehicle filter validation, booking status validation, an eight-character minimum for new/changed passwords, and a built-in Node test command.

## Remaining blockers and risks

1. **Google OAuth identity is not verified server-side.** The current user and vendor Google endpoints receive email/name/photo fields from the browser. A caller can forge those fields. The frontend must send a Firebase ID token and the backend must verify it with Firebase Admin SDK before creating or authenticating an account. This was not guessed or changed because the current flow sends no ID token and server-side Firebase Admin credentials/configuration are not present in the repository.

2. **Rental price is still client-controlled.** The server validates that the amount is positive and safe to convert to paise, and verifies that Razorpay captured that same amount. It does not calculate the authoritative rental amount from vehicle price, rental duration, fees, discounts, or coupon rules. A modified client can therefore request a lower-value order. Define the pricing/coupon rules and calculate the amount on the server before production use.

3. **Availability is not an atomic reservation.** Availability is checked when creating the payment order and again after payment, but two concurrent requests can still pass before either booking is saved. A vehicle may also become unavailable after payment capture, leaving a captured payment without a booking. Add an atomic reservation/transaction or locking design and a tested refund path before production use.

4. **Tokens remain in JSON/localStorage for backward compatibility.** HttpOnly cookies are now set, but the current frontend still stores and sends tokens from localStorage. XSS can still steal those tokens. Migrate all frontend calls to cookie-only authentication, stop returning tokens in JSON, and add an explicit CSRF strategy before removing the compatibility path.

5. **Legacy vehicle schema needs a data migration.** `isDeleted` is a String although some controller updates pass booleans; `rating` has a malformed type declaration and a misspelled `requrired` option; the fuel enum retains the legacy value `electirc` because the current UI submits that value. These types/values were not silently changed because existing MongoDB documents and frontend filters need a migration plan. `addedBy` remains a String and ownership checks compare it to the authenticated user's string ID; audit existing vendor vehicle records before rollout. Public catalogue/availability queries now require `isAdminApproved: true`, so legacy vehicles missing that flag will be hidden until an administrator verifies and backfills them.

6. **Legacy booking records may not have `userId`.** New bookings now require an owner, but old documents without `userId` remain unowned and will not appear in user booking history or pass the new email ownership check. Backfill them only where ownership can be proven.

7. **Access tokens are not immediately revocable.** Sign-out/password change clears the refresh token, but an already-issued access token can remain valid until its 15-minute expiry. Immediate revocation would require a token-version/denylist design.

8. **Refresh tokens are stored in plaintext in MongoDB.** A database read compromise could expose active refresh tokens. Hash refresh tokens at rest and compare hashes; this requires a migration because existing records contain raw tokens.

9. **Authentication endpoints are not rate-limited.** Add per-IP/account throttling and monitoring for signup/sign-in/refresh endpoints before public production exposure.

## Verification limits

The repository has no pre-existing backend test suite or lint script. The added authorization tests use Node's built-in test runner. Full integration tests against MongoDB, Razorpay, Gmail, Cloudinary, Firebase, browser flows, frontend lint/build, and production deployment were not run in this review.
