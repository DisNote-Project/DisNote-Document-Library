import { useState, useRef, type ReactElement } from "react";
import type { I18n } from "../i18n/dictionary.js";
import type { DisNoteBlock } from "../../core/index.js";
import { image } from "../../core/index.js";

/** Minimal upload provider contract used by the UI (mirrors storage-contracts). */
export interface UploadProvider {
  upload(file: File): Promise<{ assetId: string; alt?: string }>;
}

export interface ImageUploadButtonProps {
  i18n: I18n;
  uploader: UploadProvider;
  onInsert(block: DisNoteBlock): void;
}

type Status = "idle" | "uploading" | "failed";

/** Upload UI that depends only on an `UploadProvider` (DIP), not a concrete backend. */
export function ImageUploadButton({ i18n, uploader, onInsert }: ImageUploadButtonProps): ReactElement {
  const [status, setStatus] = useState<Status>("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File): Promise<void> => {
    setStatus("uploading");
    try {
      const ref = await uploader.upload(file);
      onInsert(image(ref.assetId, ref.alt ?? ""));
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <div>
      <button type="button" onClick={() => inputRef.current?.click()} aria-label={i18n.t("toolbar.image")}>
        {status === "uploading" ? i18n.t("upload.uploading") : i18n.t("upload.dropOrClick")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {status === "failed" ? (
        <span role="alert" style={{ color: "#dc2626" }}>
          {i18n.t("upload.failed")}
        </span>
      ) : null}
    </div>
  );
}
