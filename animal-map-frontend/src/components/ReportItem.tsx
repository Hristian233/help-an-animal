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

export function ReportItem({ report }: ReportItemProps) {
  return (
    <div className="report-item">
      <div className="report-item-meta">
        <span className={`report-type report-type-${report.type.toLowerCase()}`}>
          {report.type}
        </span>
        <span className="report-time">{formatRelativeTime(report.created_at)}</span>
      </div>

      {report.text ? <p className="report-text">{report.text}</p> : null}

      {report.image_url ? (
        <img src={report.image_url} alt={report.type} className="report-image" />
      ) : null}
    </div>
  );
}
