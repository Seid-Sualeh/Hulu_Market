import path from "path";

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  detectedFormat?: string;
  verifiedMimeType?: string;
  sanitizedFilename?: string;
}

const ALLOWED_EXTENSIONS_MAP: Record<string, { format: string; defaultMime: string }> = {
  ".pdf": { format: "PDF", defaultMime: "application/pdf" },
  ".doc": { format: "DOC", defaultMime: "application/msword" },
  ".docx": { format: "DOCX", defaultMime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  ".ppt": { format: "PPT", defaultMime: "application/vnd.ms-powerpoint" },
  ".pptx": { format: "PPTX", defaultMime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
  ".xls": { format: "XLS", defaultMime: "application/vnd.ms-excel" },
  ".xlsx": { format: "XLSX", defaultMime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  ".zip": { format: "ZIP", defaultMime: "application/zip" },
  ".epub": { format: "EPUB", defaultMime: "application/epub+zip" },
  ".txt": { format: "TXT", defaultMime: "text/plain" },
};

/**
 * Gets the configured maximum digital product file size in bytes.
 * Defaults to 50 MB if not set or invalid.
 */
export function getMaxFileSizeLimit(): number {
  const mbStr = process.env.MAX_DIGITAL_FILE_SIZE_MB;
  const mb = mbStr ? parseInt(mbStr, 10) : 50;
  const safeMb = isNaN(mb) || mb <= 0 ? 50 : Math.min(mb, 200);
  return safeMb * 1024 * 1024;
}

/**
 * Inspects ZIP header and scans the first few directory entries for path traversal or malicious markers.
 */
function inspectZipStructure(buffer: Buffer): { valid: boolean; error?: string } {
  // Must start with PK\x03\x04
  if (buffer.length < 30) {
    return { valid: false, error: "Malformed archive: header is incomplete." };
  }

  // Iterate over local file headers to verify structure and check for Zip Slip (directory traversal)
  let offset = 0;
  let entriesInspected = 0;
  const maxEntriesToScan = 50; // Resource limit to prevent ReDoS/infinite loop

  while (offset + 30 <= buffer.length && entriesInspected < maxEntriesToScan) {
    // Check local file header signature 0x04034b50 (little endian PK\x03\x04)
    if (buffer.readUInt32LE(offset) !== 0x04034b50) {
      break; // Reached end of local headers or central directory
    }

    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraFieldLength = buffer.readUInt16LE(offset + 28);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const uncompressedSize = buffer.readUInt32LE(offset + 22);

    if (offset + 30 + filenameLength > buffer.length) {
      return { valid: false, error: "Malformed archive: truncated entry header." };
    }

    const filename = buffer.toString("utf8", offset + 30, offset + 30 + filenameLength);

    // Zip Slip / Directory Traversal Detection
    if (filename.includes("..") || filename.startsWith("/") || filename.startsWith("\\")) {
      return {
        valid: false,
        error: "Security violation: archive contains dangerous directory traversal path.",
      };
    }

    // Compression bomb sanity check (extreme expansion ratio)
    if (compressedSize > 0 && uncompressedSize / compressedSize > 100 && uncompressedSize > 100 * 1024 * 1024) {
      return {
        valid: false,
        error: "Security violation: archive exhibits potential compression bomb ratio.",
      };
    }

    entriesInspected++;
    // Advance offset: 30 + filenameLength + extraFieldLength + compressedSize
    offset += 30 + filenameLength + extraFieldLength + compressedSize;
  }

  return { valid: true };
}

/**
 * Validates binary signature and content integrity based on format.
 */
function validateSignature(buffer: Buffer, ext: string): { valid: boolean; error?: string } {
  // 1. PDF
  if (ext === ".pdf") {
    // Check first 1024 bytes for %PDF-
    const headerSlice = buffer.subarray(0, Math.min(buffer.length, 1024));
    const pdfIndex = headerSlice.indexOf("%PDF-");
    if (pdfIndex === -1) {
      return { valid: false, error: "Invalid PDF: file does not contain valid %PDF- header signature." };
    }

    // Ensure it does not start with executable or HTML markers
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return { valid: false, error: "Disguised executable detected with PDF extension." };
    }
    return { valid: true };
  }

  // 2. ZIP-based formats (ZIP, DOCX, PPTX, XLSX, EPUB)
  if ([".zip", ".docx", ".pptx", ".xlsx", ".epub"].includes(ext)) {
    // Check PK\x03\x04 signature
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      return {
        valid: false,
        error: `Invalid ${ext.toUpperCase()}: file signature does not match expected ZIP container header.`,
      };
    }

    const zipCheck = inspectZipStructure(buffer);
    if (!zipCheck.valid) {
      return zipCheck;
    }

    return { valid: true };
  }

  // 3. OLE2 Compound Binary Documents (DOC, PPT, XLS)
  if ([".doc", ".ppt", ".xls"].includes(ext)) {
    // 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1
    const oleHeader = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    for (let i = 0; i < 8; i++) {
      if (buffer[i] !== oleHeader[i]) {
        return {
          valid: false,
          error: `Invalid ${ext.toUpperCase()}: binary signature does not match Microsoft Compound File header.`,
        };
      }
    }
    return { valid: true };
  }

  // 4. Plain Text (TXT)
  if (ext === ".txt") {
    // Check first 4096 bytes: no binary null bytes
    const checkLen = Math.min(buffer.length, 4096);
    for (let i = 0; i < checkLen; i++) {
      if (buffer[i] === 0x00) {
        return { valid: false, error: "Invalid text document: binary null byte detected." };
      }
    }

    const sample = buffer.subarray(0, Math.min(buffer.length, 512)).toString("utf8").toLowerCase();
    // Reject disguised scripts/executables
    if (sample.startsWith("mz") || sample.startsWith("\x7felf")) {
      return { valid: false, error: "Disguised binary executable rejected." };
    }
    if (sample.startsWith("#!/") || sample.includes("<?php") || sample.includes("<script")) {
      return { valid: false, error: "Script files are not permitted as text documents." };
    }

    return { valid: true };
  }

  return { valid: false, error: "Unsupported format." };
}

/**
 * Multi-layer server-side file validator for digital product original files.
 * Validates extension, untrusted client MIME, magic bytes, maximum size, empty content, and archive safety.
 */
export function validateDigitalProductFile(
  buffer: Buffer,
  originalFilename: string,
  clientMimeType?: string
): FileValidationResult {
  // 1. Empty file check
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "File is empty (0 bytes). Please upload a valid document." };
  }

  // 2. Maximum file size check
  const maxBytes = getMaxFileSizeLimit();
  if (buffer.length > maxBytes) {
    const mbLimit = Math.round(maxBytes / (1024 * 1024));
    return {
      valid: false,
      error: `File size exceeds the maximum permitted limit of ${mbLimit} MB.`,
    };
  }

  // 3. Filename and extension check
  const safeFilename = path.basename(originalFilename || "").trim();
  if (!safeFilename || safeFilename.length > 255) {
    return { valid: false, error: "Invalid or excessively long filename." };
  }

  const ext = path.extname(safeFilename).toLowerCase();
  const formatInfo = ALLOWED_EXTENSIONS_MAP[ext];
  if (!formatInfo) {
    return {
      valid: false,
      error: `File extension '${ext}' is not permitted. Allowed formats: PDF, DOC, DOCX, PPT, PPTX, ZIP, EPUB, TXT, XLS, XLSX.`,
    };
  }

  // 4. Untrusted MIME type check
  if (clientMimeType) {
    const lowerMime = clientMimeType.toLowerCase().trim();
    // Reject obviously dangerous MIME types
    if (
      lowerMime.includes("javascript") ||
      lowerMime.includes("html") ||
      lowerMime.includes("executable") ||
      lowerMime.includes("x-msdownload") ||
      lowerMime.includes("x-sh") ||
      lowerMime.includes("x-bat")
    ) {
      return {
        valid: false,
        error: `Dangerous or unsupported MIME type '${clientMimeType}' rejected.`,
      };
    }
  }

  // 5. Binary magic byte & signature inspection
  const sigCheck = validateSignature(buffer, ext);
  if (!sigCheck.valid) {
    return {
      valid: false,
      error: sigCheck.error || "File binary signature does not match the claimed file format.",
    };
  }

  return {
    valid: true,
    detectedFormat: formatInfo.format,
    verifiedMimeType: formatInfo.defaultMime,
    sanitizedFilename: safeFilename,
  };
}
