import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "../config/db.js";
import { getJwtSecret } from "../middleware/auth.js";

export const authRouter = Router();

const signupSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().min(8, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().optional(),
});

interface UserRow extends RowDataPacket {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password_hash: string;
  balance: number;
  locked_balance: number;
  role: string;
  created_at: string;
}

/**
 * POST /signup (and /api/auth/signup)
 * Registers a new user in the MySQL database.
 */
authRouter.post("/signup", async (req: Request, res: Response): Promise<void> => {
  try {
    // 1. Validate payload
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid input data";
      res.status(400).json({ success: false, error: errorMessage });
      return;
    }

    const { firstName, lastName, email, phone, password, confirmPassword } = parsed.data;

    if (confirmPassword && password !== confirmPassword) {
      res.status(400).json({ success: false, error: "Passwords do not match" });
      return;
    }

    // 2. Check if user already exists
    const [existingUsers] = await pool.query<UserRow[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()]
    );

    if (existingUsers.length > 0) {
      res.status(409).json({
        success: false,
        error: "An account with this email already exists. Please log in.",
      });
      return;
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Insert into database
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (first_name, last_name, email, phone, password_hash, balance, locked_balance, role)
       VALUES (?, ?, ?, ?, ?, 0.00, 0.00, 'user')`,
      [firstName, lastName, email.toLowerCase(), phone, passwordHash]
    );

    const newUserId = result.insertId;

    // 5. Generate JWT token
    const token = jwt.sign(
      {
        userId: newUserId,
        email: email.toLowerCase(),
        role: "user",
      },
      getJwtSecret(),
      { expiresIn: "30d" }
    );

    // 6. Return response
    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: newUserId,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`.trim(),
        email: email.toLowerCase(),
        phone,
        balance: 0,
        lockedBalance: 0,
        role: "user",
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Auth Signup Error]:", err);
    res.status(500).json({
      success: false,
      error: "Failed to create account. Please ensure MySQL database is running or try again later.",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

const signinSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /signin (and /api/auth/signin)
 * Authenticates user credentials against the MySQL database.
 */
authRouter.post("/signin", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = signinSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message || "Invalid credentials" });
      return;
    }

    const { email, password } = parsed.data;

    const [rows] = await pool.query<UserRow[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.toLowerCase()]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Signed in successfully",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`.trim(),
        email: user.email,
        phone: user.phone,
        balance: Number(user.balance) || 0,
        lockedBalance: Number(user.locked_balance) || 0,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[Auth Signin Error]:", err);
    res.status(500).json({
      success: false,
      error: "Authentication service error. Please try again later.",
    });
  }
});
