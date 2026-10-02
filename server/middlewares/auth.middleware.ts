import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../models/user.model.js";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

// 1. AUTHENTICATE TOKEN: Verifies JWT from Authorization Bearer header
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Missing or invalid Bearer token",
    });
    return;
  }

  const token = authHeader.split(" ")[1];
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    res.status(500).json({
      success: false,
      message: "Server configuration error: Authentication service is unavailable",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        message: "Unauthorized: Token has expired. Please sign in again.",
      });
      return;
    }

    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token signature",
    });
  }
};

// 2. REQUIRE ADMIN: Restricts route to Administrators only
export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    res.status(403).json({
      success: false,
      message: "Forbidden: Access restricted to administrators only",
    });
    return;
  }

  next();
};

// 3. REQUIRE SELF OR ADMIN: IDOR Protection for getUserById
export const requireSelfOrAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: "Unauthorized: Authentication required",
    });
    return;
  }

  const { id } = req.params;
  const isSelf = req.user.id === id;
  const isAdmin = req.user.role === UserRole.ADMIN;

  if (!isSelf && !isAdmin) {
    res.status(403).json({
      success: false,
      message: "Forbidden: You are not authorized to access another user's profile",
    });
    return;
  }

  next();
};
