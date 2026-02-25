import "./AddMarkerModal.css";
import { useEffect, useState } from "react";
import { API_URL, IS_PRODUCTION } from "../config/env.js";
import { useT } from "../hooks/useTranslation";
import { useToast } from "../hooks/useToast.js";

type MarkerData = {
  id: string | number;
  animal: string;
  note: string;
  lat: number;
  lng: number;
  image_url: string | null;
};

type AddMarkerModalProps = {
  lat: number;
  lng: number;
  onClose: () => void;
  onSave: (data: {
    animal: string;
    note: string;
    lat: number;
    lng: number;
    image_url: string | null;
  }) => void | Promise<boolean | void>;
  initialMarker?: MarkerData | null;
  onUpdate?: (
    markerId: string | number,
    data: {
      animal: string;
      note: string;
      lat: number;
      lng: number;
      image_url: string | null;
    }
  ) => void | Promise<boolean | void>;
};

export function AddMarkerModal({
  lat,
  lng,
  onClose,
  onSave,
  initialMarker,
  onUpdate,
}: AddMarkerModalProps) {
  const isEdit = Boolean(initialMarker);

  const [animal, setAnimal] = useState(initialMarker?.animal ?? "");
  const [note, setNote] = useState(initialMarker?.note ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    initialMarker?.image_url ?? null
  );

  useEffect(() => {
    if (initialMarker) {
      setAnimal(initialMarker.animal);
      setNote(initialMarker.note);
      setPreview(initialMarker.image_url || null);
    }
  }, [initialMarker]);
  const t = useT();
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
  const { showToast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);

    // Create preview URL
    const previewUrl = URL.createObjectURL(selected);
    setPreview(previewUrl);
  };

  const handleSubmit = async () => {
    let image_url: string | null = null;

    if (isEdit && initialMarker) {
      image_url = initialMarker.image_url;
    } else if (file) {
      try {
        image_url = await uploadFileToGCS();
      } catch (err) {
        console.error("Image upload failed", err);
        showToast("Image upload failed. Try again.");
        return;
      }
      if (!image_url) return;
    } else {
      showToast("Please select an image");
      return;
    }

    if (isEdit && initialMarker && onUpdate) {
      const ok = await onUpdate(initialMarker.id, {
        animal,
        note,
        lat: initialMarker.lat,
        lng: initialMarker.lng,
        image_url,
      });
      if (ok !== false) onClose();
    } else {
      const ok = await onSave({ animal, note, lat, lng, image_url });
      if (ok !== false) onClose();
    }
  };

  const uploadFileToGCS = async () => {
    if (!file) return null;

    if (!file.type.startsWith("image/")) {
      showToast("Only image files are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showToast("Image exceeds 10 MB limit");
      return;
    }

    // 1. Ask backend for signed URL
    const res = await fetch(`${API_URL}/files/upload-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mime_type: file.type,
        size: file.size,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error("Upload init failed", err?.detail);
      showToast(err?.detail ?? "Failed to initialize upload");
      return null;
    }

    const { upload_url, public_url } = await res.json();

    if (IS_PRODUCTION) {
      // 2. Upload file directly to GCS
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        console.error("Upload to GCS failed");
        return null;
      }
    }

    // Return final public URL (used in POST /markers)
    return public_url;
  };

  const hasPreview = !!preview || !!(isEdit && initialMarker?.image_url);
  const isFormValid = isEdit
    ? animal !== "" && note.trim() !== ""
    : animal !== "" && note.trim() !== "" && (hasPreview || !!file);

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>

      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h3 className="modal-title">
          {isEdit ? t("editAnimal") : t("modal.addAnimal")}
        </h3>

        <label className="modal-label">{t("modal.animalType")}</label>
        <select
          className="modal-select"
          value={animal}
          onChange={(e) => setAnimal(e.target.value)}
          disabled={isEdit}
        >
          <option value="" disabled hidden></option>
          <option value="fox">{t("animals.fox")}</option>
          <option value="dog">{t("animals.dog")}</option>
          <option value="cat">{t("animals.cat")}</option>
        </select>

        <label className="modal-label">{t("modal.note")}</label>
        <textarea
          className="modal-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {!isEdit && (
          <>
            <label className="modal-label">{t("modal.uploadImage")}</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="modal-file-input"
            />
          </>
        )}
        {(preview || (isEdit && initialMarker?.image_url)) && (
          <img
            src={preview || initialMarker?.image_url || ""}
            alt={t("modal.preview")}
            className="modal-preview"
          />
        )}

        <div className="modal-actions">
          <button
            className="modal-btn save"
            onClick={handleSubmit}
            disabled={!isFormValid}
          >
            {t("modal.save")}
          </button>
          <button className="modal-btn cancel" onClick={onClose}>
            {t("modal.cancel")}
          </button>
        </div>
      </div>
    </>
  );
}
