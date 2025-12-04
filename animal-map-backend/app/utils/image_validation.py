from google.cloud import storage
import magic

# Allowed image MIME types
VALID_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def validate_uploaded_image(bucket_name: str, file_name: str):
    """
    Validates that a file uploaded to Google Cloud Storage is a real image.

    Steps:
    - Check if object exists
    - Download first bytes and detect MIME type
    - Allow only image formats
    - Check file size
    - Delete invalid images automatically
    """
    storage_client = storage.Client()
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    # 1. Check if file exists
    if not blob.exists():
        return False, "Image not found in storage."

    # 2. Read the first bytes for MIME type detection
    try:
        first_bytes = blob.download_as_bytes(start=0, end=4096)
    except Exception:
        blob.delete()
        return False, "Unable to read file from storage."

    # 3. Detect MIME type using magic numbers
    mime_type = magic.from_buffer(first_bytes, mime=True)

    if mime_type not in VALID_IMAGE_MIME_TYPES:
        blob.delete()
        return False, f"Invalid image type: {mime_type}"

    # 4. Check file size safely
    if blob.size is not None and blob.size > MAX_FILE_SIZE:
        blob.delete()
        return False, "Image too large (max 10MB)."

    # Image is valid
    return True, mime_type
