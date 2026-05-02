import { useT } from "../hooks/useTranslation";

type MarkerHeaderProps = {
  imageUrl?: string | null;
  galleryUrls?: string[];
  animal: string;
};

export function MarkerHeader({
  imageUrl,
  galleryUrls,
  animal,
}: MarkerHeaderProps) {
  const t = useT();
  const thumbs = (galleryUrls ?? []).slice(0, 4);
  const animalLabel = t(`animals.${animal}`);

  return (
    <div className="marker-modal-header">
      <h3 className="marker-modal-animal-name">{animalLabel}</h3>

      {imageUrl ? (
        <img src={imageUrl} alt={animalLabel} className="marker-modal-main-image" />
      ) : (
        <div className="marker-modal-main-image marker-modal-main-image-empty">
          No image
        </div>
      )}

      {thumbs.length > 0 ? (
        <div className="marker-modal-thumbs" role="list">
          {thumbs.map((url, idx) => (
            <div
              key={`${idx}-${url}`}
              role="listitem"
              className="marker-modal-thumb"
            >
              <img src={url} alt="" loading="lazy" decoding="async" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
