from fastapi import APIRouter
from google.cloud import storage
from datetime import timedelta
import uuid

router = APIRouter()

BUCKET_NAME = "help-an-animal-images"
SERVICE_ACCOUNT_FILE = "gcs-key.json"

@router.get("/upload-url")
def generate_upload_url():
    # Authenticate using service account key
    client = storage.Client.from_service_account_json(SERVICE_ACCOUNT_FILE)

    # Bucket reference
    bucket = client.bucket(BUCKET_NAME)

    # Generate unique filename
    file_name = f"{uuid.uuid4()}.jpg"

    # Blob / object inside bucket
    blob = bucket.blob(file_name)

    # Create a signed URL that allows PUT upload
    upload_url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=10),
        method="PUT",
        content_type="image/jpeg",
    )

    # Public URL (after upload)
    public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{file_name}"

    return {
        "upload_url": upload_url,
        "public_url": public_url,
    }
