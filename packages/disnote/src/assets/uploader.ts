import { LIBRARY_MESSAGES } from "../core/messages.js";
import type {
  AssetReference,
  AssetUploader,
  UploadContext,
  UploadFile,
} from "../storage/index.js";
import { detectMimeType } from "./magic-bytes.js";

export class AssetValidationError extends Error {
  constructor(
    readonly code:
      | "mime-not-allowed"
      | "mime-mismatch"
      | "too-large"
      | "empty"
      | "size-mismatch"
      | "key-collision",
    message: string
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

const defaultKey = () => `asset_${globalThis.crypto.randomUUID()}`;

/**
 * Reference AssetUploader. Enforces the security rules from the guideline
 * (section 21): MIME allowlist, server-side magic-byte check, size limit,
 * randomized storage key, never uses the filename as a path.
 */
export class InMemoryAssetUploader implements AssetUploader {
  private readonly store = new Map<
    string,
    { bytes: Uint8Array; ref: AssetReference }
  >();
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

  async upload(
    file: UploadFile,
    _context: UploadContext
  ): Promise<AssetReference> {
    if (file.size <= 0 || file.bytes.length === 0) {
      throw new AssetValidationError(
        "empty",
        LIBRARY_MESSAGES.UPLOADED_FILE_EMPTY
      );
    }
    if (
      !Number.isSafeInteger(file.size) ||
      file.size !== file.bytes.byteLength
    ) {
      throw new AssetValidationError(
        "size-mismatch",
        LIBRARY_MESSAGES.assetSizeMismatch(file.size, file.bytes.byteLength)
      );
    }
    if (!this.allowed.has(file.mimeType)) {
      throw new AssetValidationError(
        "mime-not-allowed",
        LIBRARY_MESSAGES.mimeNotAllowed(file.mimeType)
      );
    }
    if (file.size > this.maxSize) {
      throw new AssetValidationError(
        "too-large",
        LIBRARY_MESSAGES.fileTooLarge(this.maxSize)
      );
    }
    const detected = detectMimeType(file.bytes);
    if (detected !== file.mimeType) {
      throw new AssetValidationError(
        "mime-mismatch",
        LIBRARY_MESSAGES.assetMimeMismatch(file.mimeType, detected ?? "unknown")
      );
    }

    let key = this.generateKey(); // randomized storage key, not the filename
    let attempts = 0;
    while (this.store.has(key) && attempts < 3) {
      key = this.generateKey();
      attempts++;
    }
    if (this.store.has(key)) {
      throw new AssetValidationError(
        "key-collision",
        LIBRARY_MESSAGES.ASSET_KEY_COLLISION
      );
    }
    const ref: AssetReference = {
      assetId: key,
      url: this.toUrl(key),
      mimeType: file.mimeType,
      fileName: file.fileName,
      size: file.size,
    };
    this.store.set(key, { bytes: file.bytes.slice(), ref: { ...ref } });
    return { ...ref };
  }

  async resolveUrl(assetId: string): Promise<string | null> {
    return this.store.get(assetId)?.ref.url ?? null;
  }
}
