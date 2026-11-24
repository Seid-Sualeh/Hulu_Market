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
    const safeKey = this.sanitizeKey(storageKey);
    const targetPath = path.join(this.baseDir, safeKey);
    if (fs.existsSync(targetPath)) {
      await fs.promises.unlink(targetPath);
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
 * Authenticates PUT, GET, HEAD, and DELETE operations.
 * Activates when S3_BUCKET_NAME and credentials are configured.
 */
export class S3PrivateStorageAdapter implements PrivateStorageAdapter {
  private bucket: string;
  private region: string;
  private endpoint: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.bucket = (process.env.S3_BUCKET_NAME || "").trim();
    this.region = (process.env.S3_REGION || "us-east-1").trim();
    this.endpoint = (process.env.S3_ENDPOINT || `https://s3.${this.region}.amazonaws.com`).trim();
    this.accessKeyId = (process.env.S3_ACCESS_KEY_ID || "").trim();
    this.secretAccessKey = (process.env.S3_SECRET_ACCESS_KEY || "").trim();

    if (!this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      throw new Error(
        "[Storage Configuration Error] S3PrivateStorageAdapter requires S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY."
      );
    }
  }

  getProviderName(): string {
    return "s3-compatible-private-bucket";
  }

  /**
   * Centralized SigV4 signing helper for all S3 HTTP operations.
   * Never exposes secret credentials or raw auth tokens in error messages.
   */
  private signRequest(
    method: "PUT" | "GET" | "HEAD" | "DELETE",
    storageKey: string,
    payloadBuffer?: Buffer,
    contentType?: string
  ): { url: string; headers: Record<string, string> } {
    const rawUrl = `${this.endpoint.replace(/\/+$/, "")}/${this.bucket}/${storageKey}`;
    const parsedUrl = new URL(rawUrl);

    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);

    const payloadHash = payloadBuffer
      ? crypto.createHash("sha256").update(payloadBuffer).digest("hex")
      : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // SHA-256 of empty string

    const headers: Record<string, string> = {
      host: parsedUrl.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    };

    if (method === "PUT") {
      headers["content-length"] = String(payloadBuffer ? payloadBuffer.length : 0);
      headers["content-type"] = contentType || "application/octet-stream";
    }

    // Sort headers alphabetically for canonical request
    const sortedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k.toLowerCase()}:${headers[k].trim()}\n`)
      .join("");
    const signedHeaders = sortedHeaderKeys.map((k) => k.toLowerCase()).join(";");

    // Canonical URI must encode path segments according to RFC 3986 while preserving slashes
    const canonicalUri = parsedUrl.pathname
      .split("/")
      .map((seg) => encodeURIComponent(decodeURIComponent(seg)))
      .join("/");
    const canonicalQueryString = parsedUrl.search.replace(/^\?/, "");

    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${crypto
      .createHash("sha256")
      .update(canonicalRequest)
      .digest("hex")}`;

    const kDate = crypto.createHmac("sha256", `AWS4${this.secretAccessKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(this.region).digest();
    const kService = crypto.createHmac("sha256", kRegion).update("s3").digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

    headers["authorization"] = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return { url: parsedUrl.toString(), headers };
  }

  async putObject(buffer: Buffer, fileExtension: string): Promise<StoragePutResult> {
    const ext = fileExtension.replace(/^\./, "").toLowerCase().slice(0, 10);
    const randomHex = crypto.randomBytes(24).toString("hex");
    const storageKey = `dig_${randomHex}.${ext}`;
    const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

    const { url, headers } = this.signRequest("PUT", storageKey, buffer, "application/octet-stream");

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
    const { url, headers } = this.signRequest("GET", storageKey);
    const res = await fetch(url, { method: "GET", headers });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error("Storage object not found.");
      }
      throw new Error(`Cloud storage read failed: HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  }

  async deleteObject(storageKey: string): Promise<void> {
    const { url, headers } = this.signRequest("DELETE", storageKey);
    const res = await fetch(url, { method: "DELETE", headers });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Cloud storage deletion failed: HTTP ${res.status}`);
    }
  }

  async objectExists(storageKey: string): Promise<boolean> {
    const { url, headers } = this.signRequest("HEAD", storageKey);
    const res = await fetch(url, { method: "HEAD", headers });
    return res.status === 200;
  }
}

let activeStorageAdapter: PrivateStorageAdapter | null = null;

/**
 * Factory function to retrieve active private storage adapter.
 * In production: strictly requires valid S3/R2 configuration; NEVER silently falls back to local disk.
 * In development: uses LocalPrivateStorageAdapter unless S3 is explicitly configured.
 */
export function getStorageAdapter(): PrivateStorageAdapter {
  if (activeStorageAdapter) {
    return activeStorageAdapter;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const provider = (process.env.STORAGE_PROVIDER || "").toLowerCase().trim();
  const hasS3Config = Boolean(
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );

  if (isProduction) {
    if (provider !== "s3") {
      throw new Error(
        `[Storage Configuration Error] Production environment requires STORAGE_PROVIDER="s3". Current provider: "${provider || "unset"}". Refusing to fall back to ephemeral local storage in production.`
      );
    }
    if (!hasS3Config) {
      throw new Error(
        "[Storage Configuration Error] Production environment requires valid S3 credentials. Missing required environment variables: S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and/or S3_SECRET_ACCESS_KEY."
      );
    }
    console.log("[Storage Service] Initialized S3-compatible cloud object storage adapter for production.");
    activeStorageAdapter = new S3PrivateStorageAdapter();
    return activeStorageAdapter;
  }

  // Development / Test environment
  if (provider === "s3") {
    if (!hasS3Config) {
      throw new Error(
        "[Storage Configuration Error] STORAGE_PROVIDER is set to 's3' but required S3 credentials are missing (S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY)."
      );
    }
    console.log("[Storage Service] Using S3-compatible cloud object storage adapter in development mode.");
    activeStorageAdapter = new S3PrivateStorageAdapter();
    return activeStorageAdapter;
  }

  activeStorageAdapter = new LocalPrivateStorageAdapter();
  return activeStorageAdapter;
}

/**
 * Allow test suites to inject custom mock adapter
 */
export function setStorageAdapter(adapter: PrivateStorageAdapter | null): void {
  activeStorageAdapter = adapter;
}
