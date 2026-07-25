export interface AssetReference {
  assetId: string;
  url?: string;
  mimeType: string;
  fileName: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
}

export interface UploadFile {
  fileName: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
}

export interface UploadContext {
  documentId?: string;
  actor: string;
}

export interface AssetUploader {
  upload(file: UploadFile, context: UploadContext): Promise<AssetReference>;
}

export interface AssetResolver {
  resolveUrl(assetId: string): Promise<string | null>;
}
