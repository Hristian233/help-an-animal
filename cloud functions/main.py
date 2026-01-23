import functions_framework
from google.cloud import storage
from PIL import Image, ImageOps
import pillow_heif
import io
import os
import uuid

# Enable HEIC/HEIF support (iPhone images)
pillow_heif.register_heif_opener()

# Environment variable set in Cloud Function config
PUBLIC_BUCKET_NAME = os.environ.get("PUBLIC_BUCKET")

# Max image size for map usage
MAX_IMAGE_SIZE = (1200, 1200)

# JPEG compression level
JPEG_QUALITY = 75


@functions_framework.cloud_event
def hello_http(cloud_event):
    data = cloud_event.data

    inbox_bucket_name = data.get("bucket")
    file_name = data.get("name")

    # Defensive guards
    if not inbox_bucket_name or not file_name:
        print("Missing bucket or file name, skipping")
        return

    # Skip folders
    if file_name.endswith("/"):
        print("Folder event detected, skipping")
        return

    print(f"Processing file: {file_name}")

    client = storage.Client()
    inbox_bucket = client.bucket(inbox_bucket_name)
    blob = inbox_bucket.blob(file_name)

    try:
        # Download file into memory
        img_bytes = blob.download_as_bytes()

        # Validate image
        try:
            img = Image.open(io.BytesIO(img_bytes))
            img.verify()
        except Exception:
            print(f"Invalid image detected: {file_name}, deleting")
            blob.delete()
            return

        # Re-open after verify (Pillow requirement)
        img = Image.open(io.BytesIO(img_bytes))

        # Normalize orientation (EXIF rotation fix)
        img = ImageOps.exif_transpose(img)

        # Resize (maintains aspect ratio)
        img.thumbnail(MAX_IMAGE_SIZE)

        # Convert to JPEG (strip alpha, unify format)
        output_buffer = io.BytesIO()
        img.convert("RGB").save(
            output_buffer,
            format="JPEG",
            quality=JPEG_QUALITY,
            optimize=True,
        )
        output_buffer.seek(0)

        # Generate safe public filename
        original_base = os.path.splitext(os.path.basename(file_name))[0]
        public_filename = os.path.basename(file_name)

        public_bucket = client.bucket(PUBLIC_BUCKET_NAME)
        public_blob = public_bucket.blob(public_filename)

        # Upload optimized image
        public_blob.upload_from_file(output_buffer, content_type="image/jpeg")

        # Cleanup: remove original file from inbox
        blob.delete()

        print(f"Success: {file_name} → {PUBLIC_BUCKET_NAME}/{public_filename}")

    except Exception as e:
        # Fail-safe: log but don't crash function
        print(f"Error processing {file_name}: {str(e)}")
