import { formatDate } from "../utils/formatDate";

export type ReportType = "FEED" | "WATER" | "SEEN" | "PHOTO";

export type Report = {
  id: string | number;
  marker_id: string | number;
  type: ReportType;
  text?: string | null;
  image_url?: string | null;
  created_at: string;
};

type ReportItemProps = {
  report: Report;
  absoluteTime?: boolean;
};

function formatRelativeTime(isoDate: string): string {
  const reportDate = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - reportDate);

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ReportItem({ report, absoluteTime = false }: ReportItemProps) {
  const eventLabel =
    report.type === "FEED"
      ? "fed"
      : report.type === "WATER"
        ? "watered"
        : "seen";
  const timeLabel = absoluteTime
    ? formatDate(report.created_at)
    : formatRelativeTime(report.created_at);

  return (
    <li className="report-story-item">
      <div>
        {eventLabel} {timeLabel}
      </div>
      {report.text ? <div className="report-story-comment">{report.text}</div> : null}
    </li>
  );
}
