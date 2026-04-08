import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config/env";
import { ReportTimeline } from "./ReportTimeline";
import type { Report } from "./ReportItem";

type ReportsPage = {
  items: Report[];
  next_cursor: string | null;
};

type ActivityHistoryModalProps = {
  markerId: string | number;
  onClose: () => void;
};

export function ActivityHistoryModal({
  markerId,
  onClose,
}: ActivityHistoryModalProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const fetchReports = useCallback(
    async (cursor?: string | null) => {
      const isLoadMore = Boolean(cursor);
      if (isLoadMore) setIsLoadingMore(true);
      else setIsLoading(true);
      setErrorMessage(null);

      try {
        const url = new URL(`${API_URL}/markers/${String(markerId)}/reports`);
        url.searchParams.set("limit", "20");
        if (cursor) url.searchParams.set("cursor", cursor);

        const res = await fetch(url.toString());
        if (!res.ok) {
          setErrorMessage("Unable to load activity history.");
          return;
        }

        const data = (await res.json()) as ReportsPage;
        const pageItems = Array.isArray(data.items) ? data.items : [];
        setReports((prev) => (isLoadMore ? [...prev, ...pageItems] : pageItems));
        setNextCursor(data.next_cursor ?? null);
      } catch {
        setErrorMessage("Network error while loading activity history.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [markerId],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="activity-overlay">
      <div className="activity-sheet">
        <div className="activity-header">
          <h2 className="activity-title">All activity</h2>
          <button
            type="button"
            className="info-window-action-btn info-window-action-btn--md"
            onClick={onClose}
            aria-label="Back"
            title="Back"
          >
            Back
          </button>
        </div>

        <div className="activity-list-scroll">
          <ReportTimeline
            reports={reports}
            isLoading={isLoading}
            errorMessage={errorMessage}
            absoluteTime
          />
        </div>

        {nextCursor ? (
          <button
            type="button"
            className="marker-action-btn activity-load-more"
            disabled={isLoadingMore}
            onClick={() => fetchReports(nextCursor)}
          >
            {isLoadingMore ? "Loading..." : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
