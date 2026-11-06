import { randomBytes } from "node:crypto";
import User from "../models/userModel.js";
import bcryptjs from "bcryptjs";
import { errorHandler } from "../utils/error.js";
import Jwt from "jsonwebtoken";
import { createAuthTokens, setAuthCookies } from "../utils/authTokens.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const toSafeUser = (user) => {
  const userObject = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete userObject.password;
  delete userObject.refreshToken;
  return userObject;
};

const authenticateWithPassword = async (req) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!emailPattern.test(email) || typeof password !== "string" || !password) {
    throw errorHandler(400, "A valid email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw errorHandler(401, "Invalid email or password");
  }

  const validPassword = await bcryptjs.compare(password, user.password);
  if (!validPassword) {
    throw errorHandler(401, "Invalid email or password");
  }

  return user;
};

const issueLoginResponse = async (user, res) => {
  const tokens = await createAuthTokens(user._id);
  setAuthCookies(res, tokens);
  return { ...toSafeUser(user), ...tokens };
};

export const signUp = async (req, res, next) => {
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
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      isUser: true,
      isAdmin: false,
      isVendor: false,
    });

    await newUser.save();
    return res.status(200).json({ message: "newUser added successfully" });
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};

// Refresh tokens are rotated atomically so a concurrently reused token cannot
// overwrite a newer session token.
export const refreshToken = async (req, res, next) => {
  try {
    if (!process.env.ACCESS_TOKEN || !process.env.REFRESH_TOKEN) {
      return next(errorHandler(500, "Authentication is not configured"));
    }

    let token = req.cookies?.refresh_token || "";
    const authorization = req.headers.authorization || "";
    if (authorization.startsWith("Bearer ")) {
      const tokenParts = authorization.slice(7).trim().split(",");
      token = (tokenParts.length === 2 ? tokenParts[0] : tokenParts[0] || "").trim();
    }

    if (!token) {
      return next(errorHandler(401, "Refresh token is required"));
    }

    let decoded;
    try {
      decoded = Jwt.verify(token, process.env.REFRESH_TOKEN);
    } catch (_error) {
      return next(errorHandler(401, "Refresh token is invalid or expired"));
    }

    if (!decoded?.id) {
      return next(errorHandler(401, "Refresh token is invalid"));
    }

    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) {
      return next(errorHandler(401, "Refresh token is invalid"));
    }

    const accessToken = Jwt.sign(
      { id: user._id },
      process.env.ACCESS_TOKEN,
      { expiresIn: "15m" }
    );
    const refreshToken = Jwt.sign(
      { id: user._id },
      process.env.REFRESH_TOKEN,
      { expiresIn: "7d" }
    );

    const rotation = await User.updateOne(
      { _id: user._id, refreshToken: token },
      { $set: { refreshToken } }
    );

    if (rotation.modifiedCount !== 1) {
      return next(errorHandler(401, "Refresh token has already been used"));
    }

    setAuthCookies(res, { accessToken, refreshToken });
    return res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    return next(error);
  }
};

export const signIn = async (req, res, next) => {
  try {
    const user = await authenticateWithPassword(req);
    if (!user.isUser && !user.isAdmin) {
      return next(errorHandler(403, "Please use the vendor sign-in page"));
    }

    const responsePayload = await issueLoginResponse(user, res);
    return res.status(200).json(responsePayload);
  } catch (error) {
    return next(error);
  }
};

export const adminSignIn = async (req, res, next) => {
  try {
    const user = await authenticateWithPassword(req);
    if (!user.isAdmin) {
      return next(errorHandler(403, "Admin access only"));
    }

    const responsePayload = await issueLoginResponse(user, res);
    return res.status(200).json(responsePayload);
  } catch (error) {
    return next(error);
  }
};

export const google = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";

    if (!emailPattern.test(email) || !name) {
      return next(errorHandler(400, "A valid Google account email and name are required"));
    }

    let user = await User.findOne({ email });
    if (user && !user.isUser) {
      return next(errorHandler(409, "Email already in use for another account type"));
    }

    if (!user) {
      const baseUsername = name.replace(/\s+/g, "").toLowerCase().slice(0, 30) || "user";
      const generatedPassword = randomBytes(24).toString("hex");
      const hashedPassword = await bcryptjs.hash(generatedPassword, 10);

      user = await User.create({
        profilePicture: typeof req.body.photo === "string" ? req.body.photo : undefined,
        password: hashedPassword,
        username: `${baseUsername}-${randomBytes(6).toString("hex")}`,
        email,
        isUser: true,
        isAdmin: false,
        isVendor: false,
      });
    }

    const tokens = await createAuthTokens(user._id);
    setAuthCookies(res, tokens);
    return res.status(200).json(toSafeUser(user));
  } catch (error) {
    if (error.code === 11000) {
      return next(errorHandler(409, "Email or username is already in use"));
    }
    return next(error);
  }
};
