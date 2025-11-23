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
        <h3>Add Animal</h3>

        <label>Animal Type:</label>
        <select value={animal} onChange={(e) => setAnimal(e.target.value)}>
          <option value="fox">Fox</option>
          <option value="dog">Dog</option>
          <option value="cat">Cat</option>
        </select>

        <label>Note:</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />

        <button onClick={handleSubmit}>Save</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </>
  );
}
