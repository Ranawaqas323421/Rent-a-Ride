import User from "../../models/userModel.js";
import { errorHandler } from "../../utils/error.js";

// Update only the profile fields exposed by the current frontend form.
export const editUserProfile = async (req, res, next) => {
  try {
    const userId = req.params.id;
    if (!req.user || String(req.user._id) !== String(userId)) {
      return next(errorHandler(403, "You can only update your own profile"));
    }

    const formData = req.body?.formData;
    if (!formData || typeof formData !== "object" || Array.isArray(formData)) {
      return next(errorHandler(400, "Profile form data is required"));
    }

    const updates = {};
    if (typeof formData.username === "string") {
      const username = formData.username.trim();
      if (username.length < 3 || username.length > 50) {
        return next(errorHandler(400, "Username must be between 3 and 50 characters"));
      }
      updates.username = username;
    }

    if (typeof formData.email === "string") {
      const email = formData.email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return next(errorHandler(400, "A valid email address is required"));
      }
      updates.email = email;
    }

    if (typeof formData.phoneNumber === "string") {
      const phoneNumber = formData.phoneNumber.trim();
      if (phoneNumber.length > 20) {
        return next(errorHandler(400, "Phone number is too long"));
      }
      updates.phoneNumber = phoneNumber;
    }

    if (typeof formData.adress === "string") {
      const adress = formData.adress.trim();
      if (adress.length > 300) {
        return next(errorHandler(400, "Address is too long"));
      }
      updates.adress = adress;
    }

    if (Object.keys(updates).length === 0) {
      return next(errorHandler(400, "No valid profile fields were provided"));
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -refreshToken");

    if (!updatedUser) {
      return next(errorHandler(404, "User not found"));
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};
