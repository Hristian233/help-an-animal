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
import { FullScreenSpinner } from "./components/FullScreenSpinner";
import { BackendUnavailableScreen } from "./components/BackendUnavailableScreen.tsx";
import { MarkerModal } from "./components/MarkerModal";

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
  const [newMarkerCoords, setNewMarkerCoords] = useState<NewMarkerCoords>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isPickingLocation, setIsPickingLocation] = useState(false);
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
            <MarkerModal
              marker={selectedMarker}
              onClose={() => setSelectedMarker(null)}
            />
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

    </>
  );
}

export default App;
