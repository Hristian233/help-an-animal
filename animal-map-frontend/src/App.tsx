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
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={{ lat: m.lat, lng: m.lng }}
            icon={{
              url: m.image_url ?? "",
              scaledSize: new google.maps.Size(50, 50),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(25, 25),
            }}
          />
        ))}
      </GoogleMap>
    </LoadScript>
  );
}

export default App;
