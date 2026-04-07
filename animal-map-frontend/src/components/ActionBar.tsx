import type { ReportType } from "./ReportItem";

type ActionBarProps = {
  onActionClick: (type: ReportType) => void;
};

const ACTIONS: Array<{ type: ReportType; label: string }> = [
  { type: "FEED", label: "Feed" },
  { type: "WATER", label: "Water" },
  { type: "SEEN", label: "Seen" },
  { type: "PHOTO", label: "Add Photo" },
];

export function ActionBar({ onActionClick }: ActionBarProps) {
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
