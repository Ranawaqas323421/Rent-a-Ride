import { errorHandler } from "../../utils/error.js";

export const adminAuth = async (req, res, next) => {
  if (!req.user?.isAdmin) {
    return next(errorHandler(403, "Admin access only"));
  }
  return res.status(200).json({ message: "admin logged in successfully" });
};

export const adminProfiile = async (req, res, next) => {
  try {
    if (!req.user?.isAdmin) {
      return next(errorHandler(403, "Admin access only"));
    }

    const admin = typeof req.user.toObject === "function"
      ? req.user.toObject()
      : { ...req.user };
    delete admin.password;
    delete admin.refreshToken;

    return res.status(200).json(admin);
  } catch (error) {
    return next(error);
  }
};
