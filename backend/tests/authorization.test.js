import test from "node:test";
import assert from "node:assert/strict";
import { requireAdmin, requireUser, requireVendor } from "../utils/authorization.js";

const runMiddleware = (middleware, user) => {
  let forwardedError;
  let nextCalled = false;

  middleware({ user }, {}, (error) => {
    nextCalled = true;
    forwardedError = error;
  });

  return { nextCalled, forwardedError };
};

test("role middleware allows the matching role", () => {
  assert.deepEqual(runMiddleware(requireAdmin, { isAdmin: true }), {
    nextCalled: true,
    forwardedError: undefined,
  });
  assert.deepEqual(runMiddleware(requireVendor, { isVendor: true }), {
    nextCalled: true,
    forwardedError: undefined,
  });
  assert.deepEqual(runMiddleware(requireUser, { isUser: true }), {
    nextCalled: true,
    forwardedError: undefined,
  });
});

test("role middleware rejects missing authentication", () => {
  const { forwardedError } = runMiddleware(requireUser, null);
  assert.equal(forwardedError?.statusCode, 401);
});

test("role middleware rejects a different role", () => {
  const { forwardedError } = runMiddleware(requireAdmin, { isVendor: true });
  assert.equal(forwardedError?.statusCode, 403);
});
