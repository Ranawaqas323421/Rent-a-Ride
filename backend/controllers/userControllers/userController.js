import User from "../../models/userModel.js";
import { errorHandler } from "../../utils/error.js";
import bcryptjs from "bcryptjs";
import { clearAuthCookies } from "../../utils/authTokens.js";

// Update the authenticated user's own account.
export const updateUser = async (req, res, next) => {
  if (String(req.user?._id) !== String(req.params.id)) {
    return next(errorHandler(403, "You can only update your own account"));
  }

  try {
    const updates = {};
    if (typeof req.body?.username === "string") {
      const username = req.body.username.trim();
      if (username.length < 3 || username.length > 50) {
        return next(errorHandler(400, "Username must be between 3 and 50 characters"));
      }
      updates.username = username;
    }

    if (typeof req.body?.email === "string") {
      const email = req.body.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return next(errorHandler(400, "A valid email address is required"));
      }
      updates.email = email;
    }

    if (typeof req.body?.password === "string" && req.body.password.length > 0) {
      if (req.body.password.length < 4 || req.body.password.length > 128) {
        return next(errorHandler(400, "Password must be between 4 and 128 characters"));
      }
      updates.password = await bcryptjs.hash(req.body.password, 10);
      // A password change invalidates the stored refresh session.
      updates.refreshToken = "";
    }

    if (typeof req.body?.profilePicture === "string") {
      updates.profilePicture = req.body.profilePicture;
    }

    if (Object.keys(updates).length === 0) {
      return next(errorHandler(400, "No valid profile fields were provided"));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return next(errorHandler(404, "User not found"));
    }

    if (Object.prototype.hasOwnProperty.call(updates, "password")) {
      clearAuthCookies(res);
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};

// Delete only the authenticated user's own account.
export const deleteUser = async (req, res, next) => {
  if (String(req.user?._id) !== String(req.params.id)) {
    return next(errorHandler(403, "You can only delete your own account"));
  }

  try {
    const userFound = await User.findByIdAndDelete(req.user._id);
    if (!userFound) {
      return next(errorHandler(404, "User not found"));
    }

    clearAuthCookies(res);
    return res.status(200).json({ message: "user deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

// Revoke the current refresh token and clear browser authentication cookies.
export const signOut = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(errorHandler(401, "Authentication required"));
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { refreshToken: "" } }
    );

    clearAuthCookies(res);
    return res.status(200).json({ message: "signedOut successfully" });
  } catch (error) {
    return next(errorHandler(500, "error in signout controller"));
  }
};
