import { useCallback, useEffect, useState } from "react";
import { API_URL } from "../config/env";
import { ActionBar } from "./ActionBar";
import { ActionModal } from "./ActionModal";
import { ActivityHistoryModal } from "./ActivityHistoryModal";
import { MarkerGalleryModal } from "./MarkerGalleryModal";
import { MarkerHeader } from "./MarkerHeader";
import { ReportTimeline } from "./ReportTimeline";
import type { Report, ReportType } from "./ReportItem";
import { useT } from "../hooks/useTranslation";
import { useToast } from "../hooks/useToast";

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

type GalleryImage = {
  id: number;
  image_url: string;
  created_at: string | null;
};

export function MarkerModal({ marker, onClose }: MarkerModalProps) {
  const t = useT();
  const { showToast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [activeReportType, setActiveReportType] = useState<ReportType | null>(
    null,
  );
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [canReportActivity, setCanReportActivity] = useState(false);

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

  const loadGallery = useCallback(async () => {
    try {
      const res = await fetch(
        `${API_URL}/markers/${String(marker.id)}/images?limit=4`,
      );
      if (!res.ok) {
        setGalleryUrls([]);
        setGalleryTotal(0);
        return;
      }
      const data = (await res.json()) as {
        items?: GalleryImage[];
        total?: number;
      };
      if (!Array.isArray(data.items)) {
        setGalleryUrls([]);
        setGalleryTotal(0);
        return;
      }
      setGalleryUrls(data.items.map((item) => item.image_url));
      setGalleryTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setGalleryUrls([]);
      setGalleryTotal(0);
    }
  }, [marker.id]);

  const handleReportSubmitted = useCallback(async () => {
    await Promise.all([loadReports(), loadGallery()]);
  }, [loadReports, loadGallery]);

  useEffect(() => {
    loadReports();
    loadGallery();
  }, [loadReports, loadGallery]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCanReportActivity(false);
      return;
    }
    if (!window.google?.maps?.geometry?.spherical) {
      setCanReportActivity(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude),
          new google.maps.LatLng(marker.lat, marker.lng),
        );
        setCanReportActivity(distance <= 100);
      },
      () => {
        setCanReportActivity(false);
      },
      { enableHighAccuracy: true },
    );
  }, [marker.lat, marker.lng]);

  const handleUpdateInfoClick = () => {
    showToast(t("tooFar"));
  };

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
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
          </svg>
        </button>
      </div>

      <MarkerHeader
        animal={marker.animal}
        imageUrl={marker.image_url}
        galleryUrls={galleryUrls}
      />
      {galleryTotal > 4 ? (
        <button
          type="button"
          className="gallery-view-all-btn"
          onClick={() => setShowGallery(true)}
        >
          {`${t("markerModal.gallery")} (${galleryTotal})`}
        </button>
      ) : null}
      <h4 className="activity-preview-title">
        {t("markerModal.lastActivity")}
      </h4>
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
      {canReportActivity ? (
        <ActionBar onActionClick={setActiveReportType} />
      ) : (
        <div className="marker-edit-actions">
          <button type="button" disabled className="marker-update-btn">
            {t("update")}
          </button>
          <button
            type="button"
            onClick={handleUpdateInfoClick}
            className="marker-info-btn"
            title={t("updateInfo")}
            aria-label={t("updateInfo")}
          >
            ?
          </button>
        </div>
      )}
      {activeReportType ? (
        <ActionModal
          reportType={activeReportType}
          markerId={marker.id}
          onClose={() => setActiveReportType(null)}
          onSubmitted={handleReportSubmitted}
        />
      ) : null}
      {showAllActivity ? (
        <ActivityHistoryModal
          markerId={marker.id}
          onClose={() => setShowAllActivity(false)}
        />
      ) : null}
      {showGallery ? (
        <MarkerGalleryModal
          markerId={marker.id}
          animal={marker.animal}
          onClose={() => setShowGallery(false)}
        />
      ) : null}
    </div>
  );
}
