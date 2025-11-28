import { useState } from "react";

type FabMenuProps = {
  onCheckNearby: () => void;
  onCenterLocation: () => void;
  onAddAnimal: () => void;
};

export default function FabMenu({
  onAddAnimal,
  onCheckNearby,
  onCenterLocation,
}: FabMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fab-container">
      {/* Secondary buttons */}
      {open && (
        <div className="fab-actions">
          <button className="fab-button small" onClick={onAddAnimal}>
            Add Animal
          </button>
          <button className="fab-button small" onClick={onCheckNearby}>
            Check Nearby
          </button>

          <button className="fab-button small" onClick={onCenterLocation}>
            Center
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button className="fab-button main" onClick={() => setOpen(!open)}>
        {open ? "×" : "+"}
      </button>
    </div>
  );
}
