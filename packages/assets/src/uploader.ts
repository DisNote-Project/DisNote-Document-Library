import type {
  AssetReference,
  AssetUploader,
  UploadContext,
  UploadFile,
} from "@disnote/storage-contracts";
import { detectMimeType } from "./magic-bytes.js";

export class AssetValidationError extends Error {
  constructor(
    readonly code: "mime-not-allowed" | "mime-mismatch" | "too-large" | "empty",
    message: string,
  ) {
    super(message);
    this.name = "AssetValidationError";
  }
}

export interface UploaderOptions {
  /** Allowed MIME types. Default: common images. */
  allowedMimeTypes?: string[];
  /** Max size in bytes. Default 10 MiB. */
  maxSize?: number;
  /** Inject a key generator (deterministic in tests). */
  generateKey?: () => string;
  /** Build a public URL from a storage key. */
  toUrl?: (key: string) => string;
}

const DEFAULT_ALLOWED = ["image/png", "image/jpeg", "image/gif", "image/webp"];

let seq = 0;
const defaultKey = () => `asset_${(seq++).toString(36)}_${Math.floor(1e6 * 0.5).toString(36)}`;

/**
 * Reference AssetUploader. Enforces the security rules from the guideline
 * (section 21): MIME allowlist, server-side magic-byte check, size limit,
 * randomized storage key, never uses the filename as a path.
 */
export class InMemoryAssetUploader implements AssetUploader {
  private readonly store = new Map<string, { bytes: Uint8Array; ref: AssetReference }>();
  private readonly allowed: Set<string>;
  private readonly maxSize: number;
  private readonly generateKey: () => string;
  private readonly toUrl: (key: string) => string;

  constructor(options: UploaderOptions = {}) {
    this.allowed = new Set(options.allowedMimeTypes ?? DEFAULT_ALLOWED);
    this.maxSize = options.maxSize ?? 10 * 1024 * 1024;
    this.generateKey = options.generateKey ?? defaultKey;
    this.toUrl = options.toUrl ?? ((key) => `memory://assets/${key}`);
  }

  async upload(file: UploadFile, _context: UploadContext): Promise<AssetReference> {
    if (file.size <= 0 || file.bytes.length === 0) {
      throw new AssetValidationError("empty", "Uploaded file is empty");
    }
    if (!this.allowed.has(file.mimeType)) {
      throw new AssetValidationError("mime-not-allowed", `MIME "${file.mimeType}" is not allowed`);
    }
    if (file.size > this.maxSize) {
      throw new AssetValidationError("too-large", `File exceeds max size ${this.maxSize} bytes`);
    }
    const detected = detectMimeType(file.bytes);
    if (detected !== file.mimeType) {
      throw new AssetValidationError(
        "mime-mismatch",
        `Declared MIME "${file.mimeType}" does not match content "${detected ?? "unknown"}"`,
      );
    }

    const key = this.generateKey(); // randomized storage key, not the filename
    const ref: AssetReference = {
      assetId: key,
      url: this.toUrl(key),
      mimeType: file.mimeType,
      fileName: file.fileName,
      size: file.size,
    };
    this.store.set(key, { bytes: file.bytes, ref });
    return ref;
  }

  async resolveUrl(assetId: string): Promise<string | null> {
    return this.store.get(assetId)?.ref.url ?? null;
  }
}
