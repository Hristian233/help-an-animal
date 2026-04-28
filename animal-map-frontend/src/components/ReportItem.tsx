import { formatDate } from "../utils/formatDate";
import { useT } from "../hooks/useTranslation";

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

function formatRelativeTime(
  isoDate: string,
  t: (key: string) => string,
): string {
  const reportDate = new Date(isoDate).getTime();
  const now = Date.now();
  const diffMs = Math.max(0, now - reportDate);

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return t("reportItem.time.justNow");
  if (minutes < 60)
    return t("reportItem.time.minutesAgo").replace("{count}", String(minutes));

  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return t("reportItem.time.hoursAgo").replace("{count}", String(hours));

  const days = Math.floor(hours / 24);
  return t("reportItem.time.daysAgo").replace("{count}", String(days));
}

export function ReportItem({ report, absoluteTime = false }: ReportItemProps) {
  const t = useT();
  const eventLabelByType: Record<ReportType, string> = {
    FEED: t("reportItem.events.feed"),
    WATER: t("reportItem.events.water"),
    SEEN: t("reportItem.events.seen"),
    PHOTO: t("reportItem.events.photo"),
  };
  const eventLabel = eventLabelByType[report.type];
  const timeLabel = absoluteTime
    ? formatDate(report.created_at)
    : formatRelativeTime(report.created_at, t);

  return (
    <li className="report-story-item">
      <div>
        {eventLabel} {timeLabel}
      </div>
      {report.text ? (
        <div className="report-story-comment">{report.text}</div>
      ) : null}
    </li>
  );
}
