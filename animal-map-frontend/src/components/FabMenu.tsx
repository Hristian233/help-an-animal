import { useState } from "react";
import { useT } from "../hooks/useTranslation";

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
  const t = useT();

  return (
    <div className="fab-container">
      {/* Secondary buttons */}
      {open && (
        <div className="fab-actions">
          <button className="fab-button small" onClick={onAddAnimal}>
            {t("buttons.addAnimal")}
          </button>
          <button className="fab-button small" onClick={onCheckNearby}>
            {t("buttons.checkNearby")}
          </button>

          <button className="fab-button small" onClick={onCenterLocation}>
            {t("buttons.center")}
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
