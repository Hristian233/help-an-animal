import { ReportItem, type Report } from "./ReportItem";

type ReportTimelineProps = {
  reports: Report[];
  isLoading: boolean;
  errorMessage: string | null;
  maxItems?: number;
  absoluteTime?: boolean;
};

export function ReportTimeline({
  reports,
  isLoading,
  errorMessage,
  maxItems,
  absoluteTime = false,
}: ReportTimelineProps) {
  const eventReports = reports.filter(
    (report) => report.type === "FEED" || report.type === "WATER" || report.type === "SEEN",
  );
  const visibleReports =
    typeof maxItems === "number" ? eventReports.slice(0, maxItems) : eventReports;

  if (isLoading) return <p className="report-empty">Loading reports...</p>;
  if (errorMessage) return <p className="report-error">{errorMessage}</p>;
  if (visibleReports.length === 0)
    return <p className="report-empty">No feed/water/seen events yet.</p>;

  return (
    <ul className="report-timeline report-story-list">
      {visibleReports.map((report) => (
        <ReportItem
          key={String(report.id)}
          report={report}
          absoluteTime={absoluteTime}
        />
      ))}
    </ul>
  );
}
