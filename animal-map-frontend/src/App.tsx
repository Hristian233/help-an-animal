import {
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
} from "@react-google-maps/api";
import { useEffect, useState } from "react";
import axios from "axios";
import { animalIcons } from "./helpers/animalIcons";

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

function App() {
  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<MarkerType | null>(null);

  useEffect(() => {
    const loadMarkers = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/markers/all`
        );
        setMarkers(res.data);
      } catch (error) {
        console.error("Error loading markers:", error);
      }
    };

    loadMarkers();
  }, []);

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={8}
        options={{
          streetViewControl: false,
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            icon={{
              url: animalIcons[m.animal] ?? "/icons/default.png",
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 20),
            }}
            onClick={() => setSelectedMarker(m)}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
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
    </LoadScript>
  );
}

export default App;
