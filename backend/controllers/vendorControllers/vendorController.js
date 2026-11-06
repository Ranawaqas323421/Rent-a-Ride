import { randomBytes } from "node:crypto";
import User from "../../models/userModel.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../../utils/error.js";
import {
  clearAuthCookies,
  createAuthTokens,
  setAuthCookies,
} from "../../utils/authTokens.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const toSafeVendor = (user) => {
  const userObject = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

export const vendorSignup = async (req, res, next) => {
  try {
    const username =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (
      username.length < 3 ||
      username.length > 50 ||
      !emailPattern.test(email) ||
      typeof password !== "string" ||
      password.length < 4 ||
      password.length > 128
    ) {
      return next(errorHandler(400, "Username, valid email, and a 4-128 character password are required"));
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    await User.create({
      username,
      password: hashedPassword,
      email,
      isUser: false,
      isAdmin: false,
      isVendor: true,
    });

    return res.status(200).json({ message: "vendor created successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};

export const vendorSignin = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;

    if (!emailPattern.test(email) || typeof password !== "string" || !password) {
      return next(errorHandler(400, "A valid email and password are required"));
    }

    const validVendor = await User.findOne({ email });
    if (!validVendor || !validVendor.isVendor) {
      return next(errorHandler(401, "Invalid email or password"));
    }

    const validPassword = await bcryptjs.compare(password, validVendor.password);
    if (!validPassword) {
      return next(errorHandler(401, "Invalid email or password"));
    }

    const tokens = await createAuthTokens(validVendor._id);
    setAuthCookies(res, tokens);

    return res.status(200).json({
      ...toSafeVendor(validVendor),
      ...tokens,
    });
  } catch (error) {
    return next(error);
  }
};

export const vendorSignout = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(errorHandler(401, "Authentication required"));
    }

    await User.updateOne(
      { _id: req.user._id },
      { $set: { refreshToken: "" } }
    );
    clearAuthCookies(res);
    return res.status(200).json({ message: "vendor signedout successfully" });
  } catch (error) {
    return next(error);
  }
};

// Google OAuth must be verified server-side with a Firebase ID token before
// this endpoint can be considered safe for production use.
export const vendorGoogle = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!emailPattern.test(email) || !name) {
      return next(errorHandler(400, "A valid Google account email and name are required"));
    }

    let user = await User.findOne({ email });
    if (user && !user.isVendor) {
      return next(errorHandler(409, "Email already in use for another account type"));
    }

    if (!user) {
      const baseUsername = name.replace(/\s+/g, "").toLowerCase().slice(0, 30) || "vendor";
      const generatedPassword = randomBytes(24).toString("hex");
      const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

      user = await User.create({
        profilePicture: typeof req.body.photo === "string" ? req.body.photo : undefined,
        password: hashedPassword,
        username: `${baseUsername}-${randomBytes(6).toString("hex")}`,
        email,
        isUser: false,
        isAdmin: false,
        isVendor: true,
      });
    }

    const tokens = await createAuthTokens(user._id);
    setAuthCookies(res, tokens);
    return res.status(200).json(toSafeVendor(user));
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};
