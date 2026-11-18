import mysql from "mysql2/promise";
import type { Pool, PoolOptions } from "mysql2/promise";
import bcrypt from "bcryptjs";

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
 * Initializes the MySQL database and ensures all core tables exist.
 */
export async function initDatabase(): Promise<boolean> {
  try {
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

    const conn = await pool.getConnection();

    // 1. Users table
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

    // 2. Channel Listings table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT,
        name VARCHAR(255) NOT NULL,
        platform ENUM('YouTube', 'Instagram', 'TikTok', 'Telegram', 'Facebook') NOT NULL,
        category VARCHAR(100) NOT NULL,
        subscribers VARCHAR(50) NOT NULL DEFAULT '0',
        views_or_likes VARCHAR(50) NOT NULL DEFAULT '0',
        price DECIMAL(15, 2) NOT NULL,
        link_url VARCHAR(500),
        screenshot_url VARCHAR(500) NULL,
        supporting_screenshots TEXT NULL,
        description TEXT NULL,
        seller_username VARCHAR(150) NULL,
        seller_phone VARCHAR(50) NULL,
        rejection_reason TEXT NULL,
        status ENUM('active', 'pending', 'sold', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_channels_platform (platform),
        INDEX idx_channels_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate channels columns if table already existed
    try {
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS screenshot_url VARCHAR(500) NULL`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS supporting_screenshots TEXT NULL`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS description TEXT NULL`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS seller_username VARCHAR(150) NULL`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS seller_phone VARCHAR(50) NULL`);
      await conn.query(`ALTER TABLE channels ADD COLUMN IF NOT EXISTS rejection_reason TEXT NULL`);
    } catch { /* columns already exist */ }

    // 3. Transactions & Escrow table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type ENUM('deposit', 'withdrawal', 'escrow_hold', 'escrow_release', 'purchase') NOT NULL,
        amount DECIMAL(15, 2) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        account_number VARCHAR(100),
        account_name VARCHAR(150),
        reference_code VARCHAR(100),
        screenshot_url VARCHAR(500) NULL,
        status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_tx_user (user_id),
        INDEX idx_tx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // Migrate: add screenshot_url if table already existed without it
    try {
      await conn.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS screenshot_url VARCHAR(500) NULL`);
    } catch { /* column already exists */ }

    // 4. Escrow P2P Orders table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS escrow_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel_id INT,
        channel_name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        buyer_id INT NOT NULL,
        buyer_name VARCHAR(150),
        seller_id INT,
        seller_name VARCHAR(150),
        amount DECIMAL(15, 2) NOT NULL,
        status ENUM('processing', 'success', 'cancelled') NOT NULL DEFAULT 'processing',
        buyer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        seller_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
        buyer_confirmation_requested BOOLEAN NOT NULL DEFAULT FALSE,
        is_closed BOOLEAN NOT NULL DEFAULT FALSE,
        closed_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_escrow_buyer (buyer_id),
        INDEX idx_escrow_seller (seller_id),
        INDEX idx_escrow_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // Migrate: add new columns if table already existed
    try {
      await conn.query(`ALTER TABLE escrow_orders ADD COLUMN IF NOT EXISTS buyer_confirmed BOOLEAN NOT NULL DEFAULT FALSE`);
      await conn.query(`ALTER TABLE escrow_orders ADD COLUMN IF NOT EXISTS seller_confirmed BOOLEAN NOT NULL DEFAULT FALSE`);
      await conn.query(`ALTER TABLE escrow_orders ADD COLUMN IF NOT EXISTS buyer_confirmation_requested BOOLEAN NOT NULL DEFAULT FALSE`);
      await conn.query(`ALTER TABLE escrow_orders ADD COLUMN IF NOT EXISTS is_closed BOOLEAN NOT NULL DEFAULT FALSE`);
      await conn.query(`ALTER TABLE escrow_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP NULL`);
    } catch { /* columns already exist */ }

    // 5. Escrow Chat Messages (Supervised by Admin, Seller, and Buyer)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS escrow_messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        sender_id INT NOT NULL,
        sender_name VARCHAR(150) NOT NULL,
        sender_role ENUM('buyer', 'seller', 'admin') NOT NULL,
        message TEXT NOT NULL,
        message_type ENUM('text', 'voice', 'image') NOT NULL DEFAULT 'text',
        attachment_url VARCHAR(500) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_msg_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    // Migrate: add new columns if table already existed
    try {
      await conn.query(`ALTER TABLE escrow_messages ADD COLUMN IF NOT EXISTS message_type ENUM('text','voice','image') NOT NULL DEFAULT 'text'`);
      await conn.query(`ALTER TABLE escrow_messages ADD COLUMN IF NOT EXISTS attachment_url VARCHAR(500) NULL`);
    } catch { /* columns already exist */ }

    // 6. User Notifications table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        action_url VARCHAR(255) NULL,
        action_label VARCHAR(100) NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_notif_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Seed default admin account if not already present
    const [existingAdmins]: [any[], any] = await conn.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (existingAdmins.length === 0) {
      const adminPass = await bcrypt.hash("admin123", 10);
      await conn.query(`
        INSERT INTO users (first_name, last_name, email, phone, password_hash, balance, role)
        VALUES ('System', 'Admin', 'admin@hulumarket.com', '+251900000000', ?, 10000.00, 'admin')
        ON DUPLICATE KEY UPDATE role = 'admin'
      `, [adminPass]);
      console.log("[Database] Initial admin user initialized: admin@hulumarket.com / admin123");
    }

    conn.release();
    console.log(`[Database] MySQL connected & all tables ready on ${dbHost}:${dbPort}/${dbName}`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[Database Warning] Could not connect to MySQL (${error.message}).`);
    return false;
  }
}
