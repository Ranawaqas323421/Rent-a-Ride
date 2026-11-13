import { errorHandler } from "./error.js";

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(errorHandler(401, "Authentication required"));
  }

  const hasRequiredRole = roles.some((role) => req.user[role] === true);
  if (!hasRequiredRole) {
    return next(errorHandler(403, "You do not have permission to access this resource"));
  }

  return next();
};

export const requireUser = requireRole("isUser");
export const requireVendor = requireRole("isVendor");
export const requireAdmin = requireRole("isAdmin");
