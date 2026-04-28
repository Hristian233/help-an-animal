import { useState } from "react";
import { API_URL, IS_PRODUCTION } from "../config/env";
import type { ReportType } from "./ReportItem";
import { useT } from "../hooks/useTranslation";

type ActionModalProps = {
  reportType: ReportType;
  markerId: string | number;
  onClose: () => void;
  onSubmitted: () => Promise<void> | void;
};

type CreateReportPayload = {
  type: ReportType;
  text?: string;
  image_url?: string;
};

export function ActionModal({
  reportType,
  markerId,
  onClose,
  onSubmitted,
}: ActionModalProps) {
  const t = useT();
  const reportTypeLabelByType: Record<ReportType, string> = {
    FEED: t("actionBar.feed"),
    WATER: t("actionBar.water"),
    SEEN: t("actionBar.seen"),
    PHOTO: t("reportItem.events.photo"),
  };
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFileToGCS = async (): Promise<string | null> => {
    if (!file) return null;

    const initRes = await fetch(`${API_URL}/files/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mime_type: file.type,
        size: file.size,
      }),
    });

    if (!initRes.ok) return null;
    const { upload_url, public_url } = await initRes.json();

    if (IS_PRODUCTION) {
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) return null;
    }

    return public_url;
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const image_url = await uploadFileToGCS();
      const payload: CreateReportPayload = { type: reportType };
      if (text.trim()) payload.text = text.trim();
      if (image_url) payload.image_url = image_url;

      const res = await fetch(
        `${API_URL}/markers/${String(markerId)}/reports`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        setError(t("actionModal.submitError"));
        return;
      }

      await onSubmitted();
      onClose();
    } catch {
      setError(t("actionModal.submitError"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="modal-overlay action-modal-overlay"
        onClick={isSaving ? undefined : onClose}
      ></div>
      <div className="modal-box action-modal-box">
        <div className="action-modal-content">
          <div className="action-modal-header">
            <h3 className="modal-title">{reportTypeLabelByType[reportType]}</h3>
            <button
              className="modal-close action-modal-close"
              onClick={onClose}
              disabled={isSaving}
            >
              ×
            </button>
          </div>

          <label className="modal-label">{t("actionModal.textOptional")}</label>
          <textarea
            className="modal-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSaving}
          />

          <label className="modal-label">
            {t("actionModal.imageOptional")}
          </label>
          <input
            type="file"
            accept="image/*"
            className="modal-file-input"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isSaving}
          />

          {error ? <p className="report-submit-error">{error}</p> : null}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-btn cancel"
              onClick={onClose}
              disabled={isSaving}
            >
              {t("modal.cancel")}
            </button>
            <button
              type="button"
              className="modal-btn save"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {t("actionModal.submit")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
