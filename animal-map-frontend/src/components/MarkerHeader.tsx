import { useEffect, useMemo, useState } from "react";

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
  const allImageUrls = useMemo(() => {
    const urls: string[] = [];
    if (imageUrl) urls.push(imageUrl);
    if (galleryUrls) {
      for (const url of galleryUrls) {
        if (url) urls.push(url);
      }
    }
    return urls;
  }, [imageUrl, galleryUrls]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex >= allImageUrls.length) {
      setActiveIndex(0);
    }
  }, [allImageUrls.length, activeIndex]);

  const activeUrl = allImageUrls[activeIndex];

  return (
    <div className="marker-modal-header">
      {activeUrl ? (
        <img
          src={activeUrl}
          alt={animal}
          className="marker-modal-main-image"
        />
      ) : (
        <div className="marker-modal-main-image marker-modal-main-image-empty">
          No image
        </div>
      )}

      {allImageUrls.length > 1 ? (
        <div className="marker-modal-thumbs" role="list">
          {allImageUrls.map((url, idx) => (
            <button
              key={`${idx}-${url}`}
              type="button"
              role="listitem"
              className={
                idx === activeIndex
                  ? "marker-modal-thumb marker-modal-thumb--active"
                  : "marker-modal-thumb"
              }
              onClick={() => setActiveIndex(idx)}
              aria-label={`Show image ${idx + 1} of ${allImageUrls.length}`}
              aria-pressed={idx === activeIndex}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      ) : null}

      <h3 className="marker-modal-animal">{animal}</h3>
    </div>
  );
}
