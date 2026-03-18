type BackendUnavailableScreenProps = {
  title: string;
  description: string;
  retryLabel: string;
  onRetry: () => void | Promise<void>;
  details?: string;
  isRetrying?: boolean;
};

export function BackendUnavailableScreen({
  title,
  description,
  retryLabel,
  onRetry,
  details,
  isRetrying = false,
}: BackendUnavailableScreenProps) {
  return (
    <div className="backend-unavailable">
      <div className="backend-unavailable-card" role="alert" aria-live="polite">
        <div className="backend-unavailable-code">503</div>
        <h2 className="backend-unavailable-title">{title}</h2>
        <p className="backend-unavailable-description">{description}</p>

        {details ? (
          <p className="backend-unavailable-details">
            {details}
          </p>
        ) : null}

        <button
          type="button"
          className="backend-unavailable-retry"
          onClick={onRetry}
          disabled={isRetrying}
        >
          {isRetrying ? "…" : null}
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

