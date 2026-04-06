import { GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { animalIcons } from "./helpers/animalIcons";
import { AddMarkerModal } from "./components/AddMarkerModal";
import { useJsApiLoader } from "@react-google-maps/api";
import FabMenu from "./components/FabMenu";
import type { Libraries } from "@react-google-maps/api";
import { useToast } from "./hooks/useToast";
import { useT } from "./hooks/useTranslation";
import { API_URL } from "./config/env";
import { formatDate } from "./utils/formatDate";
import { FullScreenSpinner } from "./components/FullScreenSpinner";
import { BackendUnavailableScreen } from "./components/BackendUnavailableScreen.tsx";

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const defaultCenter = {
  lat: 42.6977, // Sofia
  lng: 23.3219,
};

type MarkerType = {
  id: string;
  animal: string;
  key_info: string;
  lat: number;
  lng: number;
  image_url: string;
  created_at?: string | null;
  updated_at?: string | null;
};

type MarkerPayload = {
  animal: string;
  key_info: string;
  lat: number;
  lng: number;
  image_url: string | null;
};

type NewMarkerCoords = {
  lat: number;
  lng: number;
} | null;

const libraries: Libraries = ["geometry"];

type MarkersLoadError =
  | {
      kind: "http";
      status?: number;
      message?: string;
    }
  | {
      kind: "network";
      message?: string;
    };

function App() {
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [markerToEdit, setMarkerToEdit] = useState<MarkerType | null>(null);
  const [newMarkerCoords, setNewMarkerCoords] = useState<NewMarkerCoords>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
  const [isLocatingForEdit, setIsLocatingForEdit] = useState(false);
  const [canEditSelectedMarker, setCanEditSelectedMarker] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoadingMarkers, setIsLoadingMarkers] = useState(true);
  const [markersLoadError, setMarkersLoadError] =
    useState<MarkersLoadError | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const hasHandledDeepLinkRef = useRef(false);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries,
  });
  const t = useT();
  const { showToast } = useToast();
  const handleAddAnimal = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported.");
      return;
    }

    showToast(t("clickWithin100m"));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserLocation({ lat, lng });
        setIsPickingLocation(true); // enable pick mode

        if (map) {
          map.panTo({ lat, lng });
          map.setZoom(16);
        }
      },
      () => alert("Unable to get your GPS location."),
      { enableHighAccuracy: true },
    );
  };

  const loadMarkers = useCallback(async () => {
    setIsLoadingMarkers(true);
    setMarkersLoadError(null);

    try {
      const res = await axios.get(`${API_URL}/markers/all`, { timeout: 10_000 });
      if (!Array.isArray(res.data)) {
        throw new Error("Invalid markers payload: expected array");
      }
      setMarkers(res.data);
    } catch (error: unknown) {
      console.error("Error loading markers:", error);

      if (axios.isAxiosError(error)) {
        if (typeof error.response?.status === "number") {
          setMarkersLoadError({
            kind: "http",
            status: error.response.status,
            message: error.message,
          });
        } else {
          setMarkersLoadError({ kind: "network", message: error.message });
        }
      } else if (error instanceof Error) {
        setMarkersLoadError({ kind: "network", message: error.message });
      } else {
        setMarkersLoadError({ kind: "network" });
      }
    } finally {
      setIsLoadingMarkers(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadMarkers();
    })();
  }, [loadMarkers]);

  useEffect(() => {
    if (isLoadingMarkers || !map || hasHandledDeepLinkRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const animalId = params.get("animal");

    hasHandledDeepLinkRef.current = true;

    if (!animalId) return;

    const matchedMarker = markers.find((marker) => String(marker.id) === animalId);
    if (!matchedMarker) {
      showToast(t("animalLinkNotFound"));
      return;
    }

    setSelectedMarker(matchedMarker);
    map.panTo({ lat: matchedMarker.lat, lng: matchedMarker.lng });
    if ((map.getZoom() ?? 0) < 15) map.setZoom(15);
  }, [isLoadingMarkers, map, markers, showToast, t]);

  useEffect(() => {
    if (selectedMarker) {
      const id = setTimeout(() => {
        (document.activeElement as HTMLElement)?.blur();
      }, 0);
      return () => clearTimeout(id);
    }
  }, [selectedMarker]);

  useEffect(() => {
    if (!selectedMarker || !userLocation) {
      setCanEditSelectedMarker(false);
      return;
    }
    if (!window.google?.maps?.geometry?.spherical) {
      setCanEditSelectedMarker(false);
      return;
    }

    const distance = google.maps.geometry.spherical.computeDistanceBetween(
      new google.maps.LatLng(userLocation.lat, userLocation.lng),
      new google.maps.LatLng(selectedMarker.lat, selectedMarker.lng),
    );
    setCanEditSelectedMarker(distance <= 100);
  }, [selectedMarker, userLocation]);

  const centerOnMyLocation = async () => {
    setIsActionLoading(true);
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            setUserLocation({ lat, lng });

            map?.panTo({ lat, lng });
            if ((map?.getZoom() ?? 0) < 14) map?.setZoom(15);
            resolve();
          },
          () => {
            alert("Cannot get your location.");
            resolve();
          },
        );
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const checkNearbyAnimals = async () => {
    if (!map) return;

    setIsActionLoading(true);
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;

            map.panTo({ lat, lng });
            map.setZoom(15);

            // Draw 1km circle
            const circle = new google.maps.Circle({
              map,
              radius: 100,
              center: { lat, lng },
              strokeColor: "#1E90FF",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#1E90FF",
              fillOpacity: 0.15,
            });

            // Auto-clear
            setTimeout(() => circle.setMap(null), 6000);
            resolve();
          },
          () => {
            alert("Location is required to check nearby animals.");
            resolve();
          },
        );
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartEditing = (marker: MarkerType) => {
    if (!canEditSelectedMarker || isLocatingForEdit) return;

    setIsLocatingForEdit(true);
    setMarkerToEdit(marker);
    setSelectedMarker(null);
    setIsLocatingForEdit(false);
  };

  const handleEditInfoClick = (marker: MarkerType) => {
    if (!userLocation) {
      showToast(t("updateRequirements"));
    }

    if (!navigator.geolocation) {
      showToast(t("errorLocation"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setUserLocation({ lat: currentLat, lng: currentLng });

        const distance = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(currentLat, currentLng),
          new google.maps.LatLng(marker.lat, marker.lng),
        );

        if (distance > 100) {
          showToast(t("tooFar"));
        }
      },
      () => {
        showToast(t("errorLocation"));
      },
      { enableHighAccuracy: true },
    );
  };

  const handleCopyMarkerLink = async (marker: MarkerType) => {
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
      showToast(t("linkCopied"));
    } catch {
      showToast(t("linkCopyFailed"));
    }
  };

  const handleDirections = (marker: MarkerType) => {
    const destination = `${marker.lat},${marker.lng}`;
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  const handleSaveMarker = async (
    data: MarkerPayload,
  ): Promise<boolean | void> => {
    try {
      const res = await axios.post(`${API_URL}/markers`, data);

      if (res.status >= 200 && res.status < 300) {
        showToast(t("animalAdded"));
        loadMarkers();
        return true;
      }
    } catch (err: unknown) {
      let message = "Unknown error";

      if (axios.isAxiosError(err)) {
        if (err.response?.data?.detail) {
          message = err.response.data.detail;
        } else if (err.response?.data) {
          message = JSON.stringify(err.response.data);
        } else if (err.message) {
          message = err.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      showToast(mapBackendErrorToUserMessage(message, t));
      return false;
    }
  };

  const handleUpdateMarker = async (
    markerId: string | number,
    data: MarkerPayload,
  ): Promise<boolean> => {
    try {
      const res = await axios.patch(
        `${API_URL}/markers/${String(markerId)}`,
        data,
      );

      if (res.status >= 200 && res.status < 300) {
        showToast(t("animalUpdated"));
        loadMarkers();
        setMarkerToEdit(null);
        return true;
      }
    } catch (err: unknown) {
      let message = "Unknown error";

      if (axios.isAxiosError(err)) {
        // FastAPI HTTPException
        if (err.response?.data?.detail) {
          message = err.response.data.detail;
        }
        // Other backend errors
        else if (err.response?.data) {
          message = JSON.stringify(err.response.data);
        }
        // Axios message (network, timeout, etc.)
        else if (err.message) {
          message = err.message;
        }
      } else if (err instanceof Error) {
        // Non-Axios JS errors
        message = err.message;
      }

      showToast(mapBackendErrorToUserMessage(message, t));
      return false;
    }
    return false;
  };

  function mapBackendErrorToUserMessage(
    backendMessage: string,
    tFn: (key: string) => string,
  ): string {
    const msg = backendMessage ?? "";
    const lower = msg.toLowerCase();

    // Collapse all validation issues into 2 generic user-facing messages.
    if (lower.includes("description"))
      return tFn("validation.descriptionGeneric");
    if (lower.includes("image")) return tFn("validation.imageGeneric");

    // Fallback: keep existing behavior for non-validation errors.
    return backendMessage || tFn("validation.unknownError");
  }

  if (!isLoaded) return <div>Loading map...</div>;

  if (markersLoadError) {
    const details =
      markersLoadError.kind === "http"
        ? `HTTP ${markersLoadError.status ?? "?"}`
        : markersLoadError.message;

    return (
      <BackendUnavailableScreen
        title={t("backendDown.title")}
        description={t("backendDown.description")}
        retryLabel={t("backendDown.retry")}
        details={details}
        isRetrying={isLoadingMarkers}
        onRetry={loadMarkers}
      />
    );
  }

  return (
    <>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={8}
        onLoad={(mapInstance) => setMap(mapInstance)}
        options={{
          streetViewControl: false,
          disableDoubleClickZoom: true,
          gestureHandling: "greedy",
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
        }}
        onClick={(e) => {
          if (!isPickingLocation || !userLocation) return;

          const clickLat = e.latLng!.lat();
          const clickLng = e.latLng!.lng();

          // Check if within 100m distance
          const distance =
            google.maps.geometry.spherical.computeDistanceBetween(
              new google.maps.LatLng(userLocation.lat, userLocation.lng),
              new google.maps.LatLng(clickLat, clickLng),
            );

          if (distance > 100) {
            showToast(t("clickWithin100m"));
            return;
          }

          setNewMarkerCoords({ lat: clickLat, lng: clickLng });
          setIsPickingLocation(false);
        }}
      >
        <FullScreenSpinner show={isLoadingMarkers || isActionLoading} />

        {!isLoadingMarkers &&
          markers.map((m) => (
            <Marker
              key={m.id}
              position={{ lat: m.lat, lng: m.lng }}
              draggable={false}
              icon={
                isLoaded
                  ? {
                      url: animalIcons[m.animal] ?? "/icons/default.png",
                      scaledSize: new window.google.maps.Size(40, 40),
                      anchor: new window.google.maps.Point(20, 20),
                    }
                  : undefined
              }
              onClick={() => setSelectedMarker(m)}
            />
          ))}

        {/* Popup for viewing details */}
        {selectedMarker && (
          <InfoWindow
            position={{
              lat: selectedMarker.lat,
              lng: selectedMarker.lng,
            }}
            options={{ headerDisabled: true }}
          >
            <div
              style={{
                width: "200px",
                minHeight: "150px",
                overflow: "visible",
                color: "#000",
              }}
            >
              <div className="info-window-actions">
                <div className="info-window-actions-left">
                  <button
                    type="button"
                    className="info-window-action-btn"
                    onClick={() => handleCopyMarkerLink(selectedMarker)}
                  title={t("copyLink")}
                  aria-label={t("copyLink")}
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
                  className="info-window-action-btn"
                  onClick={() => handleDirections(selectedMarker)}
                  title={t("directions")}
                  aria-label={t("directions")}
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
                  className="info-window-action-btn"
                  onClick={() => setSelectedMarker(null)}
                  title={t("close")}
                  aria-label={t("close")}
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
              <img
                src={selectedMarker.image_url ?? ""}
                alt="animal"
                style={{
                  width: "100%",
                  height: "auto",
                  minHeight: "100px",
                  borderRadius: "8px",
                  display: "block",
                  marginBottom: "8px",
                }}
              />
              <h4 style={{ margin: "8px 0 4px 0" }}>
                {t(`animals.${selectedMarker.animal}`)}
              </h4>
              <p>{selectedMarker.key_info}</p>
              {selectedMarker.created_at && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    margin: "4px 0 0 0",
                  }}
                >
                  {t("createdAt")}: {formatDate(selectedMarker.created_at)}
                </p>
              )}
              {selectedMarker.updated_at && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    margin: "2px 0 0 0",
                  }}
                >
                  {t("updatedAt")}: {formatDate(selectedMarker.updated_at)}
                </p>
              )}
              <div className="marker-edit-actions">
                <button
                  type="button"
                  onClick={() => handleStartEditing(selectedMarker)}
                  disabled={!canEditSelectedMarker || isLocatingForEdit}
                  className="marker-update-btn"
                >
                  {isLocatingForEdit ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(255,255,255,0.5)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  ) : (
                    t("update")
                  )}
                </button>
                {!canEditSelectedMarker && (
                  <button
                    type="button"
                    onClick={() => handleEditInfoClick(selectedMarker)}
                    className="marker-info-btn"
                    title={t("updateInfo")}
                    aria-label={t("updateInfo")}
                  >
                    ?
                  </button>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
              scale: 6,
            }}
          />
        )}
      </GoogleMap>

      {/* FAB menu */}
      <FabMenu
        onCheckNearby={checkNearbyAnimals}
        onCenterLocation={centerOnMyLocation}
        onAddAnimal={handleAddAnimal}
      />

      {/* Modal for adding new marker */}
      {newMarkerCoords && (
        <AddMarkerModal
          lat={newMarkerCoords.lat}
          lng={newMarkerCoords.lng}
          onClose={() => setNewMarkerCoords(null)}
          onSave={handleSaveMarker}
        />
      )}

      {/* Modal for editing marker */}
      {markerToEdit && (
        <AddMarkerModal
          lat={markerToEdit.lat}
          lng={markerToEdit.lng}
          onClose={() => setMarkerToEdit(null)}
          onSave={handleSaveMarker}
          initialMarker={markerToEdit}
          onUpdate={handleUpdateMarker}
        />
      )}
    </>
  );
}

export default App;
