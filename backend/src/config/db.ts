import "dotenv/config";
import mysql from "mysql2/promise";
import type { Pool, PoolOptions, RowDataPacket, PoolConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";

// Determine if we should connect using the Production Database URL
export const isProduction =
  process.env.NODE_ENV === "production" ||
  Boolean(process.env.DATABASE_URL) ||
  process.env.USE_PRODUCTION_DB === "true";

// Development local MySQL configurations (loaded from environment variables)
const devDbHost = process.env.DB_HOST || "localhost";
const devDbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const devDbUser = process.env.DB_USER || "Hulu-market";
const devDbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : "Hulu-market";
const devDbName = process.env.DB_NAME || "Hulu_market";

/**
 * Configure Pool Options based on environment
 */
let poolConfig: PoolOptions;
export let dbTargetDescription: string;

if (isProduction) {
  // Read production connection URI exclusively from environment variables
  const rawUri =
    process.env.DATABASE_URL ||
    process.env.PRODUCTION_DATABASE_URL ||
    "";

  if (!rawUri) {
    throw new Error(
      "[Database Error] Running in production mode, but neither DATABASE_URL nor PRODUCTION_DATABASE_URL is set."
    );
  }

  // Clean URI query string (e.g. ?ssl-mode=REQUIRED) so mysql2 does not trigger configuration warnings
  const cleanUri = rawUri.replace(/\?.*$/, "");

  poolConfig = {
    uri: cleanUri,
    ssl: { rejectUnauthorized: false },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  dbTargetDescription = `Managed MySQL Cluster (Production)`;
} else {
  poolConfig = {
    host: devDbHost,
    port: devDbPort,
    user: devDbUser,
    password: devDbPassword,
    database: devDbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  };
  dbTargetDescription = `Local MySQL (Development) - ${devDbUser}@${devDbHost}:${devDbPort}/${devDbName}`;
}

export const pool: Pool = mysql.createPool(poolConfig);

/**
 * Helper to check if a column exists in a table via information_schema.
 * 100% compatible across all MySQL versions (5.7, 8.0, Aiven MySQL, MariaDB).
 */
async function checkColumnExists(
  conn: PoolConnection,
  tableName: string,
  columnName: string
): Promise<boolean> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME 
     FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? 
     LIMIT 1`,
    [tableName, columnName]
  );
  return rows.length > 0;
}

/**
 * Safely adds a column to a table if it does not already exist.
 * Avoids unsupported 'ADD COLUMN IF NOT EXISTS' syntax across MySQL variants.
 * Handles each column individually so a failure on one does not block others.
 */
async function safeAddColumn(
  conn: PoolConnection,
  tableName: string,
  columnName: string,
  columnDefinition: string
): Promise<void> {
  try {
    const exists = await checkColumnExists(conn, tableName, columnName);
    if (!exists) {
      await conn.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
      console.log(`[Database Migration] Added column ${tableName}.${columnName}`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    if ((error as any).code === "ER_DUP_FIELDNAME" || error.message?.includes("Duplicate column")) {
      console.debug(`[Database Migration Note] Column ${tableName}.${columnName} already present.`);
    } else {
      console.error(`[Database Migration Error] Failed to add column ${tableName}.${columnName}:`, error.message);
    }
  }
}

/**
 * Safely modifies a column definition if needed (e.g. widening an ENUM to VARCHAR).
 */
async function safeModifyColumn(
  conn: PoolConnection,
  tableName: string,
  columnName: string,
  modifyClause: string,
  conditionFn?: (colInfo: { DATA_TYPE?: string; COLUMN_TYPE?: string; IS_NULLABLE?: string }) => boolean
): Promise<void> {
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT DATA_TYPE, COLUMN_TYPE, IS_NULLABLE 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? 
       LIMIT 1`,
      [tableName, columnName]
    );

    if (rows.length > 0) {
      const colInfo = rows[0] as { DATA_TYPE?: string; COLUMN_TYPE?: string; IS_NULLABLE?: string };
      const shouldModify = conditionFn ? conditionFn(colInfo) : true;
      if (shouldModify) {
        await conn.query(`ALTER TABLE \`${tableName}\` MODIFY COLUMN \`${columnName}\` ${modifyClause}`);
        console.log(`[Database Migration] Modified column ${tableName}.${columnName} (${modifyClause})`);
      }
    }
  } catch (err: unknown) {
    console.error(`[Database Migration Error] Failed to modify column ${tableName}.${columnName}:`, (err as Error).message);
  }
}

/**
 * Safely adds a non-unique index to a table if an index with that name does not already exist.
 * Compatible across MySQL 5.7, 8.0, Aiven MySQL, and MariaDB.
 */
async function safeAddIndex(
  conn: PoolConnection,
  tableName: string,
  indexName: string,
  columnsClause: string
): Promise<void> {
  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
       LIMIT 1`,
      [tableName, indexName]
    );
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE \`${tableName}\` ADD INDEX \`${indexName}\` (${columnsClause})`);
      console.log(`[Database Migration] Added index ${indexName} on ${tableName} (${columnsClause})`);
    }
  } catch (err: unknown) {
    const error = err as Error;
    if ((error as any).code === "ER_DUP_KEYNAME" || error.message?.includes("Duplicate key name")) {
      console.debug(`[Database Migration Note] Index ${indexName} on ${tableName} already present.`);
    } else {
      console.error(`[Database Migration Error] Failed to add index ${indexName} on ${tableName}:`, error.message);
    }
  }
}

/**
 * Initializes the MySQL database and ensures all core tables exist.
 */
export async function initDatabase(): Promise<boolean> {
  try {
    // Only attempt CREATE DATABASE IF NOT EXISTS for local development server
    if (!isProduction) {
      try {
        const rootConn = await mysql.createConnection({
          host: devDbHost,
          port: devDbPort,
          user: devDbUser,
          password: devDbPassword,
        });
        await rootConn.query(
          `CREATE DATABASE IF NOT EXISTS \`${devDbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
        );
        await rootConn.end();
      } catch (err: unknown) {
        console.debug(
          "Note: Automatic CREATE DATABASE skipped (permissions or managed database):",
          (err as Error).message
        );
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

    // 2. Channel Listings table (Supports Social Media & Digital Products)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seller_id INT,
        name VARCHAR(255) NOT NULL,
        platform VARCHAR(100) NULL DEFAULT NULL,
        category VARCHAR(100) NOT NULL,
        listing_type VARCHAR(50) NOT NULL DEFAULT 'social-media',
        subcategory VARCHAR(100) NULL DEFAULT NULL,
        file_format VARCHAR(50) NULL DEFAULT NULL,
        page_count INT NULL DEFAULT NULL,
        language VARCHAR(50) NULL DEFAULT NULL,
        digital_metadata TEXT NULL DEFAULT NULL,
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
        reviewed_by INT NULL DEFAULT NULL,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        agreed_declaration BOOLEAN NOT NULL DEFAULT FALSE,
        declared_at TIMESTAMP NULL DEFAULT NULL,
        status ENUM('active', 'pending', 'sold', 'rejected') NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_channels_platform (platform),
        INDEX idx_channels_status (status),
        INDEX idx_channels_listing_type (listing_type),
        INDEX idx_channels_subcategory (subcategory)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate channels columns if table already existed (safe, repeatable & compatible)
    await safeAddColumn(conn, "channels", "screenshot_url", "VARCHAR(500) NULL");
    await safeAddColumn(conn, "channels", "supporting_screenshots", "TEXT NULL");
    await safeAddColumn(conn, "channels", "description", "TEXT NULL");
    await safeAddColumn(conn, "channels", "seller_username", "VARCHAR(150) NULL");
    await safeAddColumn(conn, "channels", "seller_phone", "VARCHAR(50) NULL");
    await safeAddColumn(conn, "channels", "rejection_reason", "TEXT NULL");
    
    // Foundational digital product columns
    await safeModifyColumn(
      conn,
      "channels",
      "platform",
      "VARCHAR(100) NULL DEFAULT NULL",
      (col) => col.DATA_TYPE?.toLowerCase() === "enum" || col.IS_NULLABLE === "NO"
    );
    await safeAddColumn(conn, "channels", "listing_type", "VARCHAR(50) NOT NULL DEFAULT 'social-media'");
    await safeAddColumn(conn, "channels", "subcategory", "VARCHAR(100) NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "file_format", "VARCHAR(50) NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "page_count", "INT NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "language", "VARCHAR(50) NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "digital_metadata", "TEXT NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "reviewed_by", "INT NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "reviewed_at", "TIMESTAMP NULL DEFAULT NULL");
    await safeAddColumn(conn, "channels", "agreed_declaration", "BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn(conn, "channels", "declared_at", "TIMESTAMP NULL DEFAULT NULL");

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
    await safeAddColumn(conn, "transactions", "screenshot_url", "VARCHAR(500) NULL");

    // 4. Escrow P2P Orders table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS escrow_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        channel_id INT,
        channel_name VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        listing_type VARCHAR(50) NOT NULL DEFAULT 'social-media',
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
        INDEX idx_escrow_status (status),
        INDEX idx_escrow_channel_buyer_status (channel_id, buyer_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate: add new columns if table already existed
    await safeAddColumn(conn, "escrow_orders", "listing_type", "VARCHAR(50) NOT NULL DEFAULT 'social-media'");
    await safeAddColumn(conn, "escrow_orders", "buyer_confirmed", "BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn(conn, "escrow_orders", "seller_confirmed", "BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn(conn, "escrow_orders", "buyer_confirmation_requested", "BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn(conn, "escrow_orders", "is_closed", "BOOLEAN NOT NULL DEFAULT FALSE");
    await safeAddColumn(conn, "escrow_orders", "closed_at", "TIMESTAMP NULL");
    await safeAddIndex(conn, "escrow_orders", "idx_escrow_channel_buyer_status", "`channel_id`, `buyer_id`, `status`");

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
    await safeAddColumn(conn, "escrow_messages", "message_type", "ENUM('text','voice','image') NOT NULL DEFAULT 'text'");
    await safeAddColumn(conn, "escrow_messages", "attachment_url", "VARCHAR(500) NULL");

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

    // 7. User Favorites table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_fav (user_id, channel_id),
        INDEX idx_fav_user (user_id),
        INDEX idx_fav_channel (channel_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 8. Escrow message reads — tracks last-read timestamp per user per order (for unread badge)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS escrow_order_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        user_id INT NOT NULL,
        last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_order_user_read (order_id, user_id),
        INDEX idx_reads_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 9. Digital Product Original Files (Secure Private Storage Metadata)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_product_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        seller_id INT NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_format VARCHAR(20) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        checksum_sha256 VARCHAR(64) NOT NULL,
        status ENUM('pending', 'uploaded', 'failed') NOT NULL DEFAULT 'uploaded',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_dpf_listing (listing_id),
        INDEX idx_dpf_listing (listing_id),
        INDEX idx_dpf_seller (seller_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migration: Safe addition of UNIQUE KEY uq_dpf_listing on digital_product_files if missing
    try {
      const [indexes]: [RowDataPacket[], unknown] = await conn.query(
        "SHOW INDEX FROM digital_product_files WHERE Key_name = 'uq_dpf_listing'"
      );
      if (indexes.length === 0) {
        const [dups]: [RowDataPacket[], unknown] = await conn.query(
          "SELECT listing_id, COUNT(*) as cnt FROM digital_product_files GROUP BY listing_id HAVING cnt > 1"
        );
        if (dups.length > 0) {
          const dupIds = dups.map((d: any) => d.listing_id);
          console.error(
            `[DB Migration Warning] Found ${dups.length} duplicate listing_id(s) in digital_product_files: ${dupIds.join(
              ", "
            )}. Unique constraint uq_dpf_listing deferred until duplicates are resolved manually.`
          );
        } else {
          await conn.query("ALTER TABLE digital_product_files ADD UNIQUE KEY uq_dpf_listing (listing_id)");
          console.log("[DB Migration] Successfully added UNIQUE KEY uq_dpf_listing on digital_product_files.");
        }
      }
    } catch (migErr: any) {
      console.warn("[DB Migration] Note on uq_dpf_listing:", migErr.message);
    }

    // 10. Failed Storage Cleanups (Reconciliation queue for deleted listings / orphaned files)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS failed_storage_cleanups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        storage_key VARCHAR(255) NOT NULL,
        listing_id INT NULL,
        reason VARCHAR(255) NULL,
        status ENUM('pending', 'resolved', 'failed') NOT NULL DEFAULT 'pending',
        retry_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_fsc_status (status),
        INDEX idx_fsc_key (storage_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 11. Digital Order Deliveries (Feature 8: Seller file delivery per escrow order)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_order_deliveries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        listing_id INT NOT NULL,
        seller_id INT NOT NULL,
        buyer_id INT NOT NULL,
        file_count INT NOT NULL DEFAULT 0,
        delivery_note TEXT NULL,
        status ENUM('delivered', 'revoked') NOT NULL DEFAULT 'delivered',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dod_order (order_id),
        INDEX idx_dod_seller (seller_id),
        INDEX idx_dod_buyer (buyer_id),
        INDEX idx_dod_listing (listing_id),
        CONSTRAINT fk_dod_order FOREIGN KEY (order_id) REFERENCES escrow_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 12. Digital Order Delivery Files (Private storage metadata for delivered files)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_order_delivery_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        delivery_id INT NOT NULL,
        order_id INT NOT NULL,
        listing_id INT NOT NULL,
        seller_id INT NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_format VARCHAR(32) NOT NULL,
        mime_type VARCHAR(128) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        storage_key VARCHAR(255) NOT NULL,
        checksum_sha256 VARCHAR(64) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_dodf_storage_key (storage_key),
        INDEX idx_dodf_delivery (delivery_id),
        INDEX idx_dodf_order (order_id),
        INDEX idx_dodf_seller (seller_id),
        CONSTRAINT fk_dodf_delivery FOREIGN KEY (delivery_id) REFERENCES digital_order_deliveries(id) ON DELETE CASCADE,
        CONSTRAINT fk_dodf_order FOREIGN KEY (order_id) REFERENCES escrow_orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 13. Digital Order File Downloads (Feature 9: Download audit & access tracking)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS digital_order_file_downloads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        delivery_id INT NOT NULL,
        file_id INT NOT NULL,
        buyer_id INT NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent VARCHAR(255) NULL,
        status ENUM('success', 'failed') NOT NULL DEFAULT 'success',
        downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_dofd_order (order_id),
        INDEX idx_dofd_file (file_id),
        INDEX idx_dofd_buyer (buyer_id),
        CONSTRAINT fk_dofd_order FOREIGN KEY (order_id) REFERENCES escrow_orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_dofd_file FOREIGN KEY (file_id) REFERENCES digital_order_delivery_files(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Migrate: add last_seen to users for online/offline indicator
    await safeAddColumn(conn, "users", "last_seen", "TIMESTAMP NULL DEFAULT NULL");

    // Seed default admin account if not already present
    const [existingAdmins]: [any[], any] = await conn.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (existingAdmins.length === 0) {
      const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD || "Admin@Hulu2026!";
      const adminPass = await bcrypt.hash(initialAdminPassword, 10);
      await conn.query(
        `
        INSERT INTO users (first_name, last_name, email, phone, password_hash, balance, role)
        VALUES ('System', 'Admin', 'admin@hulumarket.com', '+251900000000', ?, 0.00, 'admin')
        ON DUPLICATE KEY UPDATE role = 'admin'
      `,
        [adminPass]
      );
      console.log(`[Database] Initial admin user initialized: admin@hulumarket.com`);
    }

    conn.release();
    console.log(`[Database] MySQL connected & all tables ready on ${dbTargetDescription}`);
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[Database Warning] Could not connect to MySQL (${error.message}). Target: ${dbTargetDescription}`);
    return false;
  }
}
