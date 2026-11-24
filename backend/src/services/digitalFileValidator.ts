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
 * Robust ZIP archive inspector validating:
 * - End of Central Directory (EOCD) record (PK\x05\x06)
 * - Central Directory entries (PK\x01\x02) across all entries (unbounded by previous 50 limit, capped at 5,000)
 * - Local file headers (PK\x03\x04)
 * - Path traversal (..), absolute paths (/ or \ or C:), and null bytes
 * - Total uncompressed size (< 500 MB) and extreme decompression ratios (> 100:1)
 * - ZIP64 structures
 * Performs pure binary validation without extracting any archive content to disk.
 */
function inspectZipStructure(buffer: Buffer): { valid: boolean; error?: string } {
  const minZipSize = 22; // Minimal valid ZIP: empty EOCD record
  if (buffer.length < minZipSize) {
    return { valid: false, error: "Malformed archive: file is too small to be a valid ZIP archive." };
  }

  // 1. Locate End of Central Directory Record (EOCD signature: 0x06054b50, PK\x05\x06)
  // EOCD is 22 bytes + optional comment up to 65,535 bytes
  let eocdOffset = -1;
  const maxSearchLength = Math.min(buffer.length - 22, 65535 + 22);
  const searchStart = buffer.length - 22;
  const searchEnd = buffer.length - maxSearchLength;

  for (let i = searchStart; i >= searchEnd; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    return {
      valid: false,
      error: "Malformed archive: End of Central Directory (EOCD) record not found.",
    };
  }

  const commentLength = buffer.readUInt16LE(eocdOffset + 20);
  if (eocdOffset + 22 + commentLength > buffer.length) {
    return { valid: false, error: "Malformed archive: corrupted comment length in EOCD record." };
  }

  const diskNumber = buffer.readUInt16LE(eocdOffset + 4);
  const cdStartDisk = buffer.readUInt16LE(eocdOffset + 6);
  if (diskNumber !== 0 || cdStartDisk !== 0) {
    return { valid: false, error: "Security restriction: multi-disk spanned ZIP archives are not supported." };
  }

  const totalEntriesOnDisk = buffer.readUInt16LE(eocdOffset + 8);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const cdSizeBytes = buffer.readUInt32LE(eocdOffset + 12);
  const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

  // Check for ZIP64 indicator values
  const isZip64 =
    totalEntries === 0xffff ||
    cdSizeBytes === 0xffffffff ||
    cdOffset === 0xffffffff ||
    totalEntriesOnDisk === 0xffff;

  if (isZip64) {
    // Check for ZIP64 Locator signature (0x07064b50, PK\x06\x07)
    const locatorOffset = eocdOffset - 20;
    if (locatorOffset < 0 || buffer.readUInt32LE(locatorOffset) !== 0x07064b50) {
      return {
        valid: false,
        error: "Malformed archive: ZIP64 indicator detected without valid ZIP64 locator structure.",
      };
    }
    // Hulu Market enforces a 50 MB - 200 MB maximum upload size; standard ZIP64 archives exceeding these bounds are rejected
    return {
      valid: false,
      error: "Security restriction: ZIP64 format archives exceeding 32-bit limits are not supported.",
    };
  }

  // Enforce reasonable entry bounds
  const MAX_ENTRIES_LIMIT = 5000;
  if (totalEntries > MAX_ENTRIES_LIMIT) {
    return {
      valid: false,
      error: `Security violation: archive contains excessive entries (${totalEntries} > ${MAX_ENTRIES_LIMIT}).`,
    };
  }

  if (cdOffset + cdSizeBytes > buffer.length) {
    return {
      valid: false,
      error: "Malformed archive: Central Directory bounds extend beyond archive file size.",
    };
  }

  // 2. Iterate and inspect every Central Directory record (signature: 0x02014b50, PK\x01\x02)
  let cdCursor = cdOffset;
  let entriesInspected = 0;
  let totalUncompressedSize = 0;
  const MAX_TOTAL_UNCOMPRESSED_BYTES = 500 * 1024 * 1024; // 500 MB uncompressed limit

  while (cdCursor < cdOffset + cdSizeBytes && entriesInspected < totalEntries) {
    if (cdCursor + 46 > buffer.length) {
      return { valid: false, error: "Malformed archive: truncated Central Directory header." };
    }

    if (buffer.readUInt32LE(cdCursor) !== 0x02014b50) {
      return {
        valid: false,
        error: `Malformed archive: invalid signature in Central Directory entry #${entriesInspected + 1}.`,
      };
    }

    const compressedSize = buffer.readUInt32LE(cdCursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cdCursor + 24);
    const filenameLen = buffer.readUInt16LE(cdCursor + 28);
    const extraFieldLen = buffer.readUInt16LE(cdCursor + 30);
    const commentLen = buffer.readUInt16LE(cdCursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cdCursor + 42);

    if (cdCursor + 46 + filenameLen > buffer.length) {
      return { valid: false, error: "Malformed archive: filename exceeds Central Directory entry length." };
    }

    const filename = buffer.toString("utf8", cdCursor + 46, cdCursor + 46 + filenameLen);

    // Path traversal, absolute path, and dangerous separator inspection
    if (
      filename.includes("..") ||
      filename.startsWith("/") ||
      filename.startsWith("\\") ||
      /^[a-zA-Z]:[/\\]/.test(filename) ||
      filename.includes("\0")
    ) {
      return {
        valid: false,
        error: `Security violation: archive contains dangerous directory traversal or absolute path (${filename.slice(0, 50)}).`,
      };
    }

    // Compression bomb prevention
    totalUncompressedSize += uncompressedSize;
    if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      return {
        valid: false,
        error: "Security violation: archive cumulative uncompressed size exceeds limit (500 MB).",
      };
    }

    if (compressedSize > 0 && uncompressedSize / compressedSize > 100 && uncompressedSize > 10 * 1024 * 1024) {
      return {
        valid: false,
        error: `Security violation: archive entry exhibits dangerous decompression ratio (${Math.round(uncompressedSize / compressedSize)}:1).`,
      };
    }

    // Verify corresponding local header offset
    if (localHeaderOffset + 30 > buffer.length) {
      return { valid: false, error: "Malformed archive: local header offset out of bounds." };
    }
    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      return { valid: false, error: "Malformed archive: mismatched local file header signature." };
    }

    entriesInspected++;
    cdCursor += 46 + filenameLen + extraFieldLen + commentLen;
  }

  if (entriesInspected !== totalEntries) {
    return {
      valid: false,
      error: `Malformed archive: expected ${totalEntries} entries in Central Directory but parsed ${entriesInspected}.`,
    };
  }

  // 3. Scan local headers up to cdOffset to ensure consistency
  let localCursor = 0;
  while (localCursor + 30 <= cdOffset && localCursor < buffer.length) {
    if (buffer.readUInt32LE(localCursor) !== 0x04034b50) {
      break; // Reached end of local headers or padding
    }

    const localFnLen = buffer.readUInt16LE(localCursor + 26);
    const localExtraLen = buffer.readUInt16LE(localCursor + 28);
    const localCompSize = buffer.readUInt32LE(localCursor + 18);

    if (localCursor + 30 + localFnLen > buffer.length) {
      return { valid: false, error: "Malformed archive: truncated local header filename." };
    }

    const localFn = buffer.toString("utf8", localCursor + 30, localCursor + 30 + localFnLen);
    if (
      localFn.includes("..") ||
      localFn.startsWith("/") ||
      localFn.startsWith("\\") ||
      /^[a-zA-Z]:[/\\]/.test(localFn) ||
      localFn.includes("\0")
    ) {
      return {
        valid: false,
        error: `Security violation: local file header contains dangerous directory traversal path (${localFn.slice(0, 50)}).`,
      };
    }

    localCursor += 30 + localFnLen + localExtraLen + localCompSize;
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
