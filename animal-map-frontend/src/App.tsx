import {
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
} from "@react-google-maps/api";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { animalIcons } from "./helpers/animalIcons";
import { AddMarkerModal } from "./components/AddMarkerModal";
import { useJsApiLoader } from "@react-google-maps/api";

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
  note: string | null;
  lat: number;
  lng: number;
  image_url: string | null;
  user_id: string | null;
};

type NewMarkerCoords = {
  lat: number;
  lng: number;
} | null;

function App() {
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);
  const [newMarkerCoords, setNewMarkerCoords] = useState<NewMarkerCoords>(null);
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

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

  // const handleMapClick = (e: google.maps.MapMouseEvent) => {
  //   if (!e.latLng) return;

  //   const newMarker = {
  //     lat: e.latLng.lat(),
  //     lng: e.latLng.lng(),
  //   };

  //   setMarkers((prev) => [...prev, newMarker]);

  //   console.log("Clicked:", newMarker);
  // };

  if (!isLoaded) return <div>Loading map...</div>;

  return (
    <>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={8}
        options={{
          streetViewControl: false,
          disableDoubleClickZoom: true,
          gestureHandling: "greedy",
        }}
        onClick={(e) => {
          setNewMarkerCoords({
            lat: e.latLng!.lat(),
            lng: e.latLng!.lng(),
          });
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
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
      </GoogleMap>

      {/* Modal for adding new marker */}
      {newMarkerCoords && (
        <AddMarkerModal
          lat={newMarkerCoords.lat}
          lng={newMarkerCoords.lng}
          onClose={() => setNewMarkerCoords(null)}
          onSave={async (data) => {
            await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/markers`,
              data
            );
            loadMarkers();
          }}
        />
      )}
    </>
  );
}

export default App;
