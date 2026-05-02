import { ReportItem, type Report } from "./ReportItem";
import { useT } from "../hooks/useTranslation";

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
  const t = useT();
  const eventReports = reports.filter(
    (report) => report.type === "FEED" || report.type === "WATER" || report.type === "SEEN",
  );
  const visibleReports =
    typeof maxItems === "number" ? eventReports.slice(0, maxItems) : eventReports;

  if (isLoading) return <p className="report-empty">{t("reportTimeline.loading")}</p>;
  if (errorMessage) return <p className="report-error">{errorMessage}</p>;
  if (visibleReports.length === 0)
    return <p className="report-empty">{t("reportTimeline.empty")}</p>;

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
