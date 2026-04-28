import type { ReportType } from "./ReportItem";
import { useT } from "../hooks/useTranslation";

type ActionBarProps = {
  onActionClick: (type: ReportType) => void;
};

export function ActionBar({ onActionClick }: ActionBarProps) {
  const t = useT();
  const ACTIONS: Array<{ type: ReportType; label: string }> = [
    { type: "FEED", label: t("actionBar.feed") },
    { type: "WATER", label: t("actionBar.water") },
    { type: "SEEN", label: t("actionBar.seen") },
  ];

  return (
    <div className="marker-action-bar">
      {ACTIONS.map((action) => (
        <button
          key={action.type}
          type="button"
          className="marker-action-btn"
          onClick={() => onActionClick(action.type)}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
