import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import { errorHandler } from "./error.js";

export const verifyToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization || "";
    const bearerValue = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    // Backward compatible with the existing client format: Bearer refreshToken,accessToken.
    const [firstToken, secondToken] = bearerValue.split(",");
    const refreshToken = secondToken ? firstToken : null;
    const accessToken = secondToken || firstToken || req.cookies?.access_token;

    if (!accessToken && !refreshToken) {
      return next(errorHandler(401, "Authentication required"));
    }

    let decoded;
    try {
      if (!accessToken) throw new jwt.TokenExpiredError("Access token missing", new Date());
      decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN);
    } catch (accessError) {
      if (!refreshToken) {
        return next(errorHandler(401, "Access token is invalid or expired"));
      }

      const refreshDecoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN);
      const refreshUser = await User.findById(refreshDecoded.id);
      if (!refreshUser || refreshUser.refreshToken !== refreshToken) {
        return next(errorHandler(401, "Refresh token is invalid"));
      }

      // Keep the existing refresh token valid for the current client contract.
      const renewedAccessToken = jwt.sign(
        { id: refreshUser._id },
        process.env.ACCESS_TOKEN,
        { expiresIn: "15m" }
      );
      res.setHeader("x-access-token", renewedAccessToken);
      decoded = { id: refreshUser._id };
    }

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) return next(errorHandler(401, "Account no longer exists"));

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
      return next(errorHandler(401, "Authentication token is invalid or expired"));
    }
    return next(error);
  }
};
