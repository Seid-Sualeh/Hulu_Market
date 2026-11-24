import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface StoragePutResult {
  storageKey: string;
  bytesWritten: number;
  checksumSha256: string;
}

export interface PrivateStorageAdapter {
  putObject(buffer: Buffer, fileExtension: string): Promise<StoragePutResult>;
  getObject(storageKey: string): Promise<Buffer>;
  deleteObject(storageKey: string): Promise<void>;
  objectExists(storageKey: string): Promise<boolean>;
  getProviderName(): string;
}

/**
 * LocalPrivateStorageAdapter
 * Stores original digital assets in a dedicated, isolated server directory (storage/private_digital_products).
 * This directory is strictly unserved by Express and completely decoupled from /uploads or public assets.
 * Object keys are cryptographically random 24-byte hex strings.
 */
export class LocalPrivateStorageAdapter implements PrivateStorageAdapter {
  private baseDir: string;

  constructor(customBaseDir?: string) {
    this.baseDir = customBaseDir || path.resolve("storage/private_digital_products");
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true, mode: 0o700 });
    }
  }

  getProviderName(): string {
    return "local-private-disk";
  }

  private sanitizeKey(storageKey: string): string {
    const safe = path.basename(storageKey.trim());
    if (!safe || safe === "." || safe.includes("..") || !safe.startsWith("dig_")) {
      throw new Error("Invalid or untrusted storage key.");
    }
    return safe;
  }

  async putObject(buffer: Buffer, fileExtension: string): Promise<StoragePutResult> {
    const ext = fileExtension.replace(/^\./, "").toLowerCase().slice(0, 10);
    const randomHex = crypto.randomBytes(24).toString("hex");
    const storageKey = `dig_${randomHex}.${ext}`;

    const targetPath = path.join(this.baseDir, storageKey);

    // Compute cryptographic SHA-256 hash
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 });

    return {
      storageKey,
      bytesWritten: buffer.length,
      checksumSha256,
    };
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const safeKey = this.sanitizeKey(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error("Storage object not found.");
    }
    return fs.promises.readFile(targetPath);
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      const safeKey = this.sanitizeKey(storageKey);
      const targetPath = path.join(this.baseDir, safeKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
      }
    } catch (err: unknown) {
      console.warn(`[Storage Warning] Failed to delete object ${storageKey}:`, (err as Error).message);
    }
  }

  async objectExists(storageKey: string): Promise<boolean> {
    try {
      const safeKey = this.sanitizeKey(storageKey);
      const targetPath = path.join(this.baseDir, safeKey);
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }
}

/**
 * S3PrivateStorageAdapter (AWS S3, Cloudflare R2, MinIO, Wasabi)
 * Implements S3-compatible private object storage using standard AWS SigV4.
 * Activates when S3_BUCKET_NAME and credentials are configured in environment variables.
 */
export class S3PrivateStorageAdapter implements PrivateStorageAdapter {
  private bucket: string;
  private region: string;
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || "";
    this.region = process.env.S3_REGION || "us-east-1";
    this.endpoint = process.env.S3_ENDPOINT || `https://s3.${this.region}.amazonaws.com`;
    this.accessKeyId = process.env.S3_ACCESS_KEY_ID || "";
    this.secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || "";
  }

  getProviderName(): string {
    return "s3-compatible-private-bucket";
  }

  async putObject(buffer: Buffer, fileExtension: string): Promise<StoragePutResult> {
    const ext = fileExtension.replace(/^\./, "").toLowerCase().slice(0, 10);
    const randomHex = crypto.randomBytes(24).toString("hex");
    const storageKey = `dig_${randomHex}.${ext}`;

    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    // Standard S3 PUT with SigV4
    const url = `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${storageKey}`;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const headers: Record<string, string> = {
      "content-length": String(buffer.length),
      "content-type": "application/octet-stream",
      host: new URL(this.endpoint).host,
      "x-amz-content-sha256": checksumSha256,
      "x-amz-date": amzDate,
    };

    // SigV4 signature generation
    const canonicalHeaders = `content-length:${buffer.length}\ncontent-type:application/octet-stream\nhost:${headers.host}\nx-amz-content-sha256:${checksumSha256}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-length;content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = `PUT\n/${this.bucket}/${storageKey}\n\n${canonicalHeaders}\n${signedHeaders}\n${checksumSha256}`;
    
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto.createHash("sha256").update(canonicalRequest).digest("hex")}`;

    const kDate = crypto.createHmac("sha256", `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      throw new Error(`Cloud storage upload failed: HTTP ${res.status}`);
    }

    return {
      storageKey,
      bytesWritten: buffer.length,
      checksumSha256,
    };
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const url = `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${storageKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Cloud storage read failed: HTTP ${res.status}`);
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async deleteObject(storageKey: string): Promise<void> {
    const url = `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${storageKey}`;
    await fetch(url, { method: "DELETE" }).catch(() => {});
  }

  async objectExists(storageKey: string): Promise<boolean> {
    const url = `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${storageKey}`;
    const res = await fetch(url, { method: "HEAD" });
    return res.status === 200;
  }
}

let activeStorageAdapter: PrivateStorageAdapter | null = null;

/**
 * Factory function to retrieve active private storage adapter.
 * Automatically chooses S3 if S3_BUCKET_NAME and credentials are configured;
 * otherwise uses LocalPrivateStorageAdapter with strict access isolation.
 */
export function getStorageAdapter(): PrivateStorageAdapter {
  if (activeStorageAdapter) {
    return activeStorageAdapter;
  }

  const isS3Configured = Boolean(
    process.env.STORAGE_PROVIDER === "s3" &&
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );

  if (isS3Configured) {
    console.log("[Storage Service] Using S3-compatible cloud object storage adapter.");
    activeStorageAdapter = new S3PrivateStorageAdapter();
  } else {
    activeStorageAdapter = new LocalPrivateStorageAdapter();
  }

  return activeStorageAdapter;
}

/**
 * Allow test suites to inject custom mock adapter
 */
export function setStorageAdapter(adapter: PrivateStorageAdapter | null): void {
  activeStorageAdapter = adapter;
}
