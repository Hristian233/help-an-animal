import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { API_URL } from "../config/env";
import { useT } from "../hooks/useTranslation";

type GalleryImage = {
  id: number;
  image_url: string;
  created_at: string | null;
};

type MarkerGalleryModalProps = {
  markerId: string | number;
  animal: string;
  onClose: () => void;
};

export function MarkerGalleryModal({
  markerId,
  animal,
  onClose,
}: MarkerGalleryModalProps) {
  const t = useT();
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `${API_URL}/markers/${String(markerId)}/images?limit=20`,
      );
      if (!res.ok) {
        setErrorMessage(t("gallery.loadError"));
        return;
      }
      const data = (await res.json()) as {
        items?: GalleryImage[];
        total?: number;
      };
      setImages(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
    } catch {
      setErrorMessage(t("gallery.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [markerId, t]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const isLightboxOpen = lightboxIndex !== null;

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const showPrev = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || images.length === 0) return prev;
      return prev > 0 ? prev - 1 : images.length - 1;
    });
  }, [images.length]);

  const showNext = useCallback(() => {
    setLightboxIndex((prev) => {
      if (prev === null || images.length === 0) return prev;
      return prev < images.length - 1 ? prev + 1 : 0;
    });
  }, [images.length]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isLightboxOpen, closeLightbox, showPrev, showNext]);

  return createPortal(
    <>
      <div className="gallery-overlay" role="dialog" aria-modal="true">
        <div className="gallery-sheet">
          <div className="gallery-header">
            <h2 className="gallery-title">
              {t("markerModal.gallery")}
              {total > 0 ? (
                <span className="gallery-count"> ({total})</span>
              ) : null}
            </h2>
            <button
              type="button"
              className="info-window-action-btn info-window-action-btn--md"
              onClick={onClose}
              aria-label={t("gallery.back")}
              title={t("gallery.back")}
            >
              {t("gallery.back")}
            </button>
          </div>

          <div className="gallery-list-scroll">
            {isLoading ? (
              <p className="gallery-status">{t("gallery.loading")}</p>
            ) : errorMessage ? (
              <p className="gallery-status gallery-status--error">
                {errorMessage}
              </p>
            ) : images.length === 0 ? (
              <p className="gallery-status">{t("gallery.empty")}</p>
            ) : (
              <div className="gallery-grid">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className="gallery-grid-item"
                    onClick={() => setLightboxIndex(idx)}
                    aria-label={`${animal} ${idx + 1}`}
                  >
                    <img
                      src={img.image_url}
                      alt={animal}
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isLightboxOpen && images[lightboxIndex] ? (
        <div
          className="lightbox-overlay"
          role="dialog"
          aria-modal="true"
          onClick={closeLightbox}
        >
          <button
            type="button"
            className="lightbox-close"
            onClick={(e) => {
              e.stopPropagation();
              closeLightbox();
            }}
            aria-label={t("close")}
            title={t("close")}
          >
            ×
          </button>

          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow--prev"
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              aria-label={t("gallery.previous")}
              title={t("gallery.previous")}
            >
              ‹
            </button>
          ) : null}

          <img
            src={images[lightboxIndex].image_url}
            alt={animal}
            className="lightbox-image"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-arrow lightbox-arrow--next"
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              aria-label={t("gallery.next")}
              title={t("gallery.next")}
            >
              ›
            </button>
          ) : null}

          {images.length > 1 ? (
            <div className="lightbox-counter">
              {lightboxIndex + 1} / {images.length}
            </div>
          ) : null}
        </div>
      ) : null}
    </>,
    document.body,
  );
}
