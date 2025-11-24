import { useState } from "react";

type AddMarkerModalProps = {
  lat: number;
  lng: number;
  onClose: () => void;
  onSave: (data: {
    animal: string;
    note: string;
    lat: number;
    lng: number;
  }) => void;
};

export function AddMarkerModal({
  lat,
  lng,
  onClose,
  onSave,
}: AddMarkerModalProps) {
  const [animal, setAnimal] = useState("dog");
  const [note, setNote] = useState("");

  const handleSubmit = () => {
    onSave({ animal, note, lat, lng });
    onClose();
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
