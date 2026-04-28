import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config/env";
import { ActionBar } from "./ActionBar";
import { ActionModal } from "./ActionModal";
import { ActivityHistoryModal } from "./ActivityHistoryModal";
import { MarkerHeader } from "./MarkerHeader";
import { ReportTimeline } from "./ReportTimeline";
import type { Report, ReportType } from "./ReportItem";
import { useT } from "../hooks/useTranslation";

type Marker = {
  id: string | number;
  animal: string;
  lat: number;
  lng: number;
  image_url?: string | null;
};

type MarkerModalProps = {
  marker: Marker;
  onClose: () => void;
};

export function MarkerModal({ marker, onClose }: MarkerModalProps) {
  const t = useT();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [activeReportType, setActiveReportType] = useState<ReportType | null>(
    null,
  );
  const [showAllActivity, setShowAllActivity] = useState(false);

  const loadReports = useCallback(async () => {
    setIsLoadingReports(true);
    setReportsError(null);
    try {
      const res = await fetch(
        `${API_URL}/markers/${String(marker.id)}/reports?limit=20`,
      );
      if (!res.ok) {
        setReports([]);
        setReportsError("Unable to load reports right now.");
        return;
      }
      const data = (await res.json()) as { items?: Report[] };
      if (!Array.isArray(data.items)) {
        setReports([]);
        setReportsError("Unexpected reports response from server.");
        return;
      }
      const sorted = [...data.items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setReports(sorted);
    } catch {
      setReports([]);
      setReportsError("Network error while loading reports.");
    } finally {
      setIsLoadingReports(false);
    }
  }, [marker.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleCopyMarkerLink = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("animal", String(marker.id));
    const shareUrl = url.toString();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
    } catch {
      // Keep behavior lightweight without interrupting the flow.
    }
  };

  const handleDirections = () => {
    const destination = `${marker.lat},${marker.lng}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const activityCount = reports.filter(
    (report) =>
      report.type === "FEED" ||
      report.type === "WATER" ||
      report.type === "SEEN",
  ).length;

  return (
    <div className="marker-modal-content">
      <div className="info-window-actions">
        <div className="info-window-actions-left">
          <button
            type="button"
            className="info-window-action-btn info-window-action-btn--sm"
            onClick={handleCopyMarkerLink}
            aria-label="Copy link"
            title="Copy link"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4V7h4c2.76 0 5 2.24 5 5s-2.24 5-5 5h-4v-1.9h4c1.71 0 3.1-1.39 3.1-3.1s-1.39-3.1-3.1-3.1z" />
            </svg>
          </button>
          <button
            type="button"
            className="info-window-action-btn info-window-action-btn--sm"
            onClick={handleDirections}
            aria-label="Directions"
            title="Directions"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 2L4.5 20.29l1.41.71L12 18l6.09 3 .71-1.41L12 2z" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          className="info-window-action-btn info-window-action-btn--sm"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          ×
        </button>
      </div>

      <MarkerHeader animal={marker.animal} imageUrl={marker.image_url} />
      <h4 className="activity-preview-title">{t("markerModal.lastActivity")}</h4>
      <ReportTimeline
        reports={reports}
        isLoading={isLoadingReports}
        errorMessage={reportsError}
        maxItems={3}
      />
      {activityCount > 3 ? (
        <button
          type="button"
          className="activity-view-all-btn"
          onClick={() => setShowAllActivity(true)}
        >
          {t("markerModal.viewAllActivity")}
        </button>
      ) : null}
      <ActionBar onActionClick={setActiveReportType} />
      {activeReportType ? (
        <ActionModal
          reportType={activeReportType}
          markerId={marker.id}
          onClose={() => setActiveReportType(null)}
          onSubmitted={loadReports}
        />
      ) : null}
      {showAllActivity ? (
        <ActivityHistoryModal
          markerId={marker.id}
          onClose={() => setShowAllActivity(false)}
        />
      ) : null}
    </div>
  );
}
