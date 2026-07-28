import { test } from "node:test";
import assert from "node:assert/strict";
import { InMemoryAssetUploader, AssetValidationError, detectMimeType } from "../../src/assets/index.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function uploader() {
  let n = 0;
  return new InMemoryAssetUploader({ generateKey: () => `k${n++}` });
}

test("detectMimeType reads magic bytes", () => {
  assert.equal(detectMimeType(PNG), "image/png");
  assert.equal(detectMimeType(JPEG), "image/jpeg");
  assert.equal(detectMimeType(new Uint8Array([1, 2, 3, 4])), null);
});

test("accepts a valid image and returns a randomized assetId (not the filename)", async () => {
  const u = uploader();
  const ref = await u.upload(
    { fileName: "../../etc/passwd.png", mimeType: "image/png", size: PNG.length, bytes: PNG },
    { actor: "u1" },
  );
  assert.equal(ref.assetId, "k0");
  assert.notEqual(ref.assetId, "../../etc/passwd.png");
  assert.equal(await u.resolveUrl("k0"), "memory://assets/k0");
});

test("rejects declared/real MIME mismatch", async () => {
  const u = uploader();
  await assert.rejects(
    () => u.upload({ fileName: "x.png", mimeType: "image/png", size: JPEG.length, bytes: JPEG }, { actor: "u1" }),
    (e) => e instanceof AssetValidationError && e.code === "mime-mismatch",
  );
});

test("rejects disallowed MIME and oversized files", async () => {
  const u = new InMemoryAssetUploader({ allowedMimeTypes: ["image/png"], maxSize: 4 });
  await assert.rejects(
    () => u.upload({ fileName: "x.jpg", mimeType: "image/jpeg", size: JPEG.length, bytes: JPEG }, { actor: "u1" }),
    (e) => e instanceof AssetValidationError && e.code === "mime-not-allowed",
  );
  await assert.rejects(
    () => u.upload({ fileName: "x.png", mimeType: "image/png", size: PNG.length, bytes: PNG }, { actor: "u1" }),
    (e) => e instanceof AssetValidationError && e.code === "too-large",
  );
});

test("rejects a forged declared size", async () => {
  const uploader = new InMemoryAssetUploader();
  await assert.rejects(
    uploader.upload(
      {
        fileName: "forged.png",
        mimeType: "image/png",
        size: 1,
        bytes: PNG,
      },
      { actor: "u1" },
    ),
    (error: unknown) =>
      error instanceof AssetValidationError && error.code === "size-mismatch",
  );
});
