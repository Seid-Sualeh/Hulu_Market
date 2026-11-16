import mysql from "mysql2/promise";
import type { Pool, PoolOptions } from "mysql2/promise";

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const dbUser = process.env.DB_USER || "root";
const dbPassword = process.env.DB_PASSWORD || "";
const dbName = process.env.DB_NAME || "hulu_market";

const poolConfig: PoolOptions = process.env.DATABASE_URL
  ? {
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    }
  : {
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

export const pool: Pool = mysql.createPool(poolConfig);

/**
 * Initializes the MySQL database and ensures the `users` table exists.
 */
export async function initDatabase(): Promise<boolean> {
  try {
    // If not using full URI, check/create database first using root connection
    if (!process.env.DATABASE_URL) {
      try {
        const rootConn = await mysql.createConnection({
          host: dbHost,
          port: dbPort,
          user: dbUser,
          password: dbPassword,
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
      } catch (err: unknown) {
        console.debug("Note: Automatic CREATE DATABASE skipped (permissions or managed database):", (err as Error).message);
      }
    }

    // Verify connection to the target database
    const conn = await pool.getConnection();

    // Create users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        locked_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
        role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    conn.release();
    console.log(`[Database] MySQL connected & 'users' table ready on ${dbHost}:${dbPort}/${dbName}`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[Database Warning] Could not connect to MySQL (${error.message}).`);
    console.warn(`[Database Warning] Please ensure your MySQL server is running and check DB credentials in backend/.env`);
    return false;
  }
}
