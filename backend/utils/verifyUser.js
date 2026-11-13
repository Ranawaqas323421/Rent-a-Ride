import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { errorHandler } from "./error.js";
import { setAccessCookie } from "./authTokens.js";

export const verifyToken = async (req, res, next) => {
  try {
    if (!process.env.ACCESS_TOKEN || !process.env.REFRESH_TOKEN) {
      return next(errorHandler(500, "Authentication is not configured"));
    }

    let accessToken = req.cookies?.access_token || "";
    let refreshToken = req.cookies?.refresh_token || "";

    const authorization = req.headers.authorization || "";
    if (authorization.startsWith("Bearer ")) {
      const bearerValue = authorization.slice(7).trim();
      const tokenParts = bearerValue.split(",");

      if (tokenParts.length === 2) {
        // Backward compatible with the existing client format:
        // Bearer <refreshToken>,<accessToken>
        refreshToken = tokenParts[0].trim();
        accessToken = tokenParts[1].trim();
      } else if (tokenParts[0]) {
        accessToken = tokenParts[0].trim();
      }
    }

    if (!accessToken && !refreshToken) {
      return next(errorHandler(401, "Authentication required"));
    }

    let decoded;
    try {
      if (!accessToken) {
        throw new jwt.TokenExpiredError("Access token missing", new Date());
      }
      decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN);
    } catch (accessError) {
      if (!refreshToken) {
        return next(errorHandler(401, "Access token is invalid or expired"));
      }

      let refreshDecoded;
      try {
        refreshDecoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
      } catch (_refreshError) {
        return next(errorHandler(401, "Refresh token is invalid or expired"));
      }

      if (!refreshDecoded?.id) {
        return next(errorHandler(401, "Refresh token is invalid"));
      }

      const refreshUser = await User.findById(refreshDecoded.id);
      if (!refreshUser || refreshUser.refreshToken !== refreshToken) {
        return next(errorHandler(401, "Refresh token is invalid"));
      }

      const renewedAccessToken = jwt.sign(
        { id: refreshUser._id },
        process.env.ACCESS_TOKEN,
        { expiresIn: "15m" }
      );

      setAccessCookie(res, renewedAccessToken);
      res.setHeader("x-access-token", renewedAccessToken);
      decoded = { id: refreshUser._id };
    }

    if (!decoded?.id) {
      return next(errorHandler(401, "Authentication token is invalid"));
    }

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) {
      return next(errorHandler(401, "Account no longer exists"));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return next(errorHandler(401, "Authentication token is invalid or expired"));
    }
    return next(error);
  }
};
