import "./AddMarkerModal.css";
import { useState } from "react";
import { API_URL } from "../config/env.js";

type AddMarkerModalProps = {
  lat: number;
  lng: number;
  onClose: () => void;
  onSave: (data: {
    animal: string;
    note: string;
    lat: number;
    lng: number;
    imageUrl: string | null;
  }) => void;
};

export function AddMarkerModal({
  lat,
  lng,
  onClose,
  onSave,
}: AddMarkerModalProps) {
  const [animal, setAnimal] = useState("fox");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);

    // Create preview URL
    const previewUrl = URL.createObjectURL(selected);
    setPreview(previewUrl);
  };

  const handleSubmit = async () => {
    let imageUrl = null;

    if (file) {
      try {
        imageUrl = await uploadFileToGCS();
      } catch (err) {
        console.error("Image upload failed", err);
        alert("Image upload failed. Try again.");
        return;
      }
    }

    onSave({
      animal,
      note,
      lat,
      lng,
      imageUrl,
    });
    onClose();
  };

  const uploadFileToGCS = async () => {
    if (!file) return null;

    // 1. Ask backend for signed URL
    const res = await fetch(`${API_URL}/files/upload-url`, {
      method: "GET",
    });

    if (!res.ok) {
      console.error("Failed to get signed URL");
      return null;
    }

    const { upload_url, public_url } = await res.json();

    // 2. Upload file directly to GCS
    const uploadRes = await fetch(upload_url, {
      method: "PUT",
      headers: {
        "Content-Type": file.type, // <== VERY IMPORTANT
      },
      body: file,
    });

    if (!uploadRes.ok) {
      console.error("Upload to GCS failed");
      return null;
    }

    // Return final public URL (used in POST /markers)
    return public_url;
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}></div>

      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h3 className="modal-title">Add Animal</h3>

        <label className="modal-label">Animal Type</label>
        <select
          className="modal-select"
          value={animal}
          onChange={(e) => setAnimal(e.target.value)}
        >
          <option value="fox">Fox</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
        </select>

        <label className="modal-label">Note</label>
        <textarea
          className="modal-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <label className="modal-label">Upload Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="modal-file-input"
        />

        {/* Preview the selected image */}
        {preview && (
          <img src={preview} alt="Preview" className="modal-preview" />
        )}

        <div className="modal-actions">
          <button className="modal-btn save" onClick={handleSubmit}>
            Save
          </button>
          <button className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}
