import { detectMimeType } from "../assets/index.js";
export const OFFLINE_ASSETS = { MAX_BYTES: 20_000_000, INVALID: "invalid-offline-asset", ALLOWED_MIME: new Set(["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "video/mp4", "audio/mpeg", "audio/ogg", "application/pdf", "text/plain"]) } as const;
export interface OfflineAsset { id: string; revision: number; blob: Blob }
export interface OfflineAssetStore {
  read(id: string): Promise<OfflineAsset | null>;
  write(asset: OfflineAsset, expectedRevision: number | null): Promise<boolean>;
  clear(): Promise<void>;
}
export interface OfflineAssetLoader { load(id: string): Promise<Blob> }
/** Immutable asset IDs; the loader must authenticate/authorize before downloading. */
export class OfflineAssetCache {
  private readonly urls = new Map<string, string>();
  constructor(private readonly store: OfflineAssetStore, private readonly loader: OfflineAssetLoader, private readonly createUrl: (blob: Blob) => string = blob => URL.createObjectURL(blob), private readonly revokeUrl: (url: string) => void = url => URL.revokeObjectURL(url)) {}
  async prepare(ids: string[]): Promise<void> {
    if (ids.length > 1000) throw new Error(OFFLINE_ASSETS.INVALID);
    for (const id of new Set(ids)) {
      if (!id) throw new Error(OFFLINE_ASSETS.INVALID);
      let asset = await this.store.read(id);
      if (!asset) {
        const blob = await this.loader.load(id);
        if (blob.size > OFFLINE_ASSETS.MAX_BYTES || !OFFLINE_ASSETS.ALLOWED_MIME.has(blob.type)) throw new Error(OFFLINE_ASSETS.INVALID);
        const sniffed = detectMimeType(new Uint8Array(await blob.slice(0, 32).arrayBuffer()));
        if (sniffed && sniffed !== blob.type) throw new Error(OFFLINE_ASSETS.INVALID);
        asset = { id, revision: 1, blob };
        if (!await this.store.write(asset, null)) asset = await this.store.read(id);
        if (!asset) throw new Error(OFFLINE_ASSETS.INVALID);
      }
      if (asset.blob.size > OFFLINE_ASSETS.MAX_BYTES || !OFFLINE_ASSETS.ALLOWED_MIME.has(asset.blob.type)) throw new Error(OFFLINE_ASSETS.INVALID);
      if (!this.urls.has(id)) this.urls.set(id, this.createUrl(asset.blob));
    }
  }
  resolve(id: string): string | undefined { return this.urls.get(id); }
  release(): void { for (const url of this.urls.values()) this.revokeUrl(url); this.urls.clear(); }
  async clear(): Promise<void> { this.release(); await this.store.clear(); }
}
