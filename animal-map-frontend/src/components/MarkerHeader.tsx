type MarkerHeaderProps = {
  imageUrl?: string | null;
  animal: string;
};

export function MarkerHeader({ imageUrl, animal }: MarkerHeaderProps) {
  return (
    <div className="marker-modal-header">
      {imageUrl ? (
        <img src={imageUrl} alt={animal} className="marker-modal-main-image" />
      ) : (
        <div className="marker-modal-main-image marker-modal-main-image-empty">
          No image
        </div>
      )}
      <h3 className="marker-modal-animal">{animal}</h3>
    </div>
  );
}
