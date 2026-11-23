import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import type { RowDataPacket } from "mysql2/promise";

export interface AuthenticatedUser {
  id: number;
  email: string;
  role: "user" | "admin";
}

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[Security Error] JWT_SECRET environment variable is missing in production!");
    }
    return "hulu_market_jwt_secret_dev_key_change_in_production";
  }
  if (process.env.NODE_ENV === "production" && secret.length < 32) {
    throw new Error("[Security Error] JWT_SECRET must be at least 32 characters in production!");
  }
  return secret;
}

/**
 * Extracts and verifies JWT strictly from Authorization header.
 * Eliminates all untrusted header (x-user-id) and body/query fallbacks.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        userId?: number;
        id?: number;
        email?: string;
        role?: string;
      };

      const userId = decoded.userId || decoded.id;
      if (userId) {
        // Verify user still exists in database and fetch live role
        const [rows] = await pool.query<RowDataPacket[]>(
          "SELECT id, email, role FROM users WHERE id = ? LIMIT 1",
          [userId]
        );

        if (rows.length > 0) {
          req.user = {
            id: Number(rows[0].id),
            email: String(rows[0].email),
            role: rows[0].role === "admin" ? "admin" : "user",
          };
          next();
          return;
        }
      }
    } catch (err: unknown) {
      // Invalid / expired token
      res.status(401).json({
        success: false,
        error: "Session expired or invalid token. Please sign in again.",
      });
      return;
    }
  }

  res.status(401).json({
    success: false,
    error: "Authentication required. Please sign in.",
  });
}

/**
 * Middleware: Requires authenticated user to have 'admin' role.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // First ensure user is authenticated
  if (!req.user) {
    await authenticateToken(req, res, () => {
      if (!req.user || req.user.role !== "admin") {
        res.status(403).json({
          success: false,
          error: "Access denied. Administrator privileges required.",
        });
        return;
      }
      next();
    });
    return;
  }

  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
    });
    return;
  }

  next();
}

/**
 * Optional authentication middleware: sets req.user if valid token provided, but doesn't block guests.
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as {
        userId?: number;
        id?: number;
        email?: string;
        role?: string;
      };
      const userId = decoded.userId || decoded.id;
      if (userId) {
        const [rows] = await pool.query<RowDataPacket[]>(
          "SELECT id, email, role FROM users WHERE id = ? LIMIT 1",
          [userId]
        );
        if (rows.length > 0) {
          req.user = {
            id: Number(rows[0].id),
            email: String(rows[0].email),
            role: rows[0].role === "admin" ? "admin" : "user",
          };
        }
      }
    } catch {}
  }
  next();
}
