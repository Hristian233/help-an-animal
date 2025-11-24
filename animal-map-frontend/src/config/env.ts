// Note the 'export const'
export const API_URL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL
    : "http://127.0.0.1:8000";

// (Optional) You can also export the mode itself if needed elsewhere
export const IS_PRODUCTION = import.meta.env.MODE === "production";
