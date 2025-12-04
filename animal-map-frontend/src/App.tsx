import { GoogleMap, InfoWindow, Marker } from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { animalIcons } from "./helpers/animalIcons";
import { AddMarkerModal } from "./components/AddMarkerModal";
import { useJsApiLoader } from "@react-google-maps/api";
import FabMenu from "./components/FabMenu";
import type { Libraries } from "@react-google-maps/api";
import { useToast } from "./hooks/useToast";
import { useT } from "./hooks/useTranslation";

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
  note: string;
  lat: number;
  lng: number;
  image_url: string;
};

type NewMarkerCoords = {
  lat: number;
  lng: number;
} | null;

const libraries: Libraries = ["geometry"];

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
      { enableHighAccuracy: true }
    );
  };

  const loadMarkers = useCallback(async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/markers/all`
      );
      setMarkers(res.data);
    } catch (error) {
      console.error("Error loading markers:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadMarkers();
    })();
  }, [loadMarkers]);

  const centerOnMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        setUserLocation({ lat, lng });

        map?.panTo({ lat, lng });
        if ((map?.getZoom() ?? 0) < 14) map?.setZoom(15);
      },
      () => alert("Cannot get your location.")
    );
  };

  const checkNearbyAnimals = () => {
    if (!map) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        map.panTo({ lat, lng });
        map.setZoom(15);

        // Draw 1km circle
        const circle = new google.maps.Circle({
          map,
          radius: 1000,
          center: { lat, lng },
          strokeColor: "#1E90FF",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "#1E90FF",
          fillOpacity: 0.15,
        });

        // Auto-clear
        setTimeout(() => circle.setMap(null), 6000);
      },
      () => {
        alert("Location is required to check nearby animals.");
      }
    );
  };

  const handleSaveMarker = async (data: MarkerType) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/markers`,
        data
      );

      if (res.status >= 200 && res.status < 300) {
        showToast(t("animalAdded"));
        loadMarkers();
        return true;
      }
    } catch (err: unknown) {
      let message = "Unknown error";

      // FastAPI HTTPException
      if (err.response?.data?.detail) {
        message = err.response.data.detail;
      }
      // Other backend errors
      else if (err.response?.data) {
        message = JSON.stringify(err.response.data);
      }
      // Network / axios errors
      else if (err.message) {
        message = err.message;
      }

      showToast(message);
      return false; // indicate error
    }
  };

  if (!isLoaded) return <div>Loading map...</div>;

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
              new google.maps.LatLng(clickLat, clickLng)
            );

          if (distance > 100) {
            showToast(t("clickWithin100m"));
            return;
          }

          setNewMarkerCoords({ lat: clickLat, lng: clickLng });
          setIsPickingLocation(false);
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            draggable={true}
            onDragEnd={(e) => {
              setNewMarkerCoords({
                lat: e.latLng!.lat(),
                lng: e.latLng!.lng(),
              });
            }}
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
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div style={{ width: "200px" }}>
              <img
                src={selectedMarker.image_url ?? ""}
                alt="animal"
                style={{ width: "100%", borderRadius: "8px" }}
              />
              <h4>{selectedMarker.animal.toUpperCase()}</h4>
              <p>{selectedMarker.note}</p>
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
    </>
  );
}

export default App;
