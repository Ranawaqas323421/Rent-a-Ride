import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { errorHandler } from "./error.js";

const accessTokenLifetimeMs = 15 * 60 * 1000;
const refreshTokenLifetimeMs = 7 * 24 * 60 * 60 * 1000;

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
});

export const createAuthTokens = async (userId) => {
  if (!process.env.ACCESS_TOKEN || !process.env.REFRESH_TOKEN) {
    throw errorHandler(500, "Authentication is not configured");
  }

  const accessToken = jwt.sign(
    { id: String(userId) },
    process.env.ACCESS_TOKEN,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: String(userId) },
    process.env.REFRESH_TOKEN,
    { expiresIn: "7d" }
  );

  const result = await User.updateOne(
    { _id: userId },
    { $set: { refreshToken } }
  );

  if (result.matchedCount !== 1) {
    throw errorHandler(404, "Account no longer exists");
  }

  return { accessToken, refreshToken };
};

export const setAuthCookies = (res, { accessToken, refreshToken }) => {
  const options = baseCookieOptions();

  res.cookie("access_token", accessToken, {
    ...options,
    maxAge: accessTokenLifetimeMs,
  });
  res.cookie("refresh_token", refreshToken, {
    ...options,
    maxAge: refreshTokenLifetimeMs,
  });

  return res;
};

export const setAccessCookie = (res, accessToken) => {
  res.cookie("access_token", accessToken, {
    ...baseCookieOptions(),
    maxAge: accessTokenLifetimeMs,
  });
  return res;
};

export const clearAuthCookies = (res) => {
  const options = baseCookieOptions();
  res.clearCookie("access_token", options);
  res.clearCookie("refresh_token", options);
  return res;
};
