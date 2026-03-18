type FullScreenSpinnerProps = {
  show: boolean;
  message?: string;
};

export function FullScreenSpinner({
  show,
  message = "Зареждане...",
}: FullScreenSpinnerProps) {
  if (!show) return null;

  return (
    <div className="map-loading">
      <div className="spinner" />
      <p style={{ color: "rgb(33, 53, 71)" }}>{message}</p>
    </div>
  );
}

