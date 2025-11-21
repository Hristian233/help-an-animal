import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import { useEffect, useState } from "react";
import axios from "axios";

const containerStyle = {
  width: "100vw",
  height: "100vh",
};

const defaultCenter = {
  lat: 42.6977, // Sofia
  lng: 23.3219,
};

type LocalMarker = {
  lat: number;
  lng: number;
};

function App() {
  const [markers, setMarkers] = useState<LocalMarker[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/markers/all`
        );
        setMarkers(res.data);
      } catch (err) {
        console.error("Error loading markers:", err);
      }
    };

    fetchData();
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;

    const newMarker = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };

    setMarkers((prev) => [...prev, newMarker]);

    console.log("Clicked:", newMarker);
  };

  return (
    <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={8}
        onClick={handleMapClick}
      >
        {markers.map((m, i) => (
          <Marker key={i} position={{ lat: m.lat, lng: m.lng }} />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}

export default App;
