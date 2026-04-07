import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config/env";
import { ActionBar } from "./ActionBar";
import { ActionModal } from "./ActionModal";
import { MarkerHeader } from "./MarkerHeader";
import { ReportTimeline } from "./ReportTimeline";
import type { Report, ReportType } from "./ReportItem";

type Marker = {
  id: string | number;
  animal: string;
  image_url?: string | null;
};

type MarkerModalProps = {
  marker: Marker;
  onClose: () => void;
};

export function MarkerModal({ marker, onClose }: MarkerModalProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [activeReportType, setActiveReportType] = useState<ReportType | null>(null);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    try {
      const res = await fetch(`${API_URL}/markers/${String(marker.id)}/reports`);
      if (!res.ok) {
        setReports([]);
        return;
      }
      const data = (await res.json()) as Report[];
      if (!Array.isArray(data)) {
        setReports([]);
        return;
      }
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setReports(sorted);
    } catch {
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, [marker.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  return (
    <div className="marker-modal-content">
      <div className="info-window-actions">
        <div></div>
        <button
          type="button"
          className="info-window-action-btn"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
      </div>

      <MarkerHeader animal={marker.animal} imageUrl={marker.image_url} />
      <ReportTimeline reports={reports} isLoading={isLoadingReports} />
      <ActionBar onActionClick={setActiveReportType} />
      {activeReportType ? (
        <ActionModal
          reportType={activeReportType}
          markerId={marker.id}
          onClose={() => setActiveReportType(null)}
          onSubmitted={loadReports}
        />
      ) : null}
    </div>
  );
}
