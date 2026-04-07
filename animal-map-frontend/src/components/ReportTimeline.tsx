import { ReportItem, type Report } from "./ReportItem";

type ReportTimelineProps = {
  reports: Report[];
  isLoading: boolean;
};

export function ReportTimeline({ reports, isLoading }: ReportTimelineProps) {
  if (isLoading) return <p className="report-empty">Loading reports...</p>;
  if (reports.length === 0) return <p className="report-empty">No reports yet.</p>;

  return (
    <div className="report-timeline">
      {reports.map((report) => (
        <ReportItem key={String(report.id)} report={report} />
      ))}
    </div>
  );
}
