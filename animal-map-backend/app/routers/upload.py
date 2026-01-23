from fastapi import APIRouter, HTTPException, status
from google.cloud import storage
from google.auth import default
from google.auth.transport.requests import Request
from google.auth.iam import Signer
from datetime import timedelta
from google.oauth2.service_account import Credentials as ServiceAccountCreds
import datetime, uuid, os
from google.cloud import storage
import google.auth
import google.auth.transport.requests
import uuid
import os
from pydantic import BaseModel

router = APIRouter()

INBOX_BUCKET = "help-an-animal-inbox"
PUBLIC_BUCKET = "help-an-animal-images"
SERVICE_ACCOUNT_FILE = os.getenv("GCS_KEY_FILE", "gcs-key.json")
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_PREFIX = "image/"


class UploadInitRequest(BaseModel):
    mime_type: str
    size: int  # bytes


def get_storage_client():
    is_cloud_run = bool(os.getenv("K_SERVICE"))

    # Local: use JSON key if present
    if not is_cloud_run and os.path.exists(SERVICE_ACCOUNT_FILE):
        return storage.Client.from_service_account_json(SERVICE_ACCOUNT_FILE)

    return storage.Client()


def get_signing_credentials():
    credentials, _ = default()
    auth_request = Request()

    # Local dev with JSON key
    if isinstance(credentials, ServiceAccountCreds):
        return credentials

    # Cloud Run, gcloud, ADC → must use IAM Signer
    email = getattr(credentials, "service_account_email", None)
    if not email:
        raise RuntimeError("No service account email available for IAM signing")

    return Signer(credentials, auth_request, email)


def validate_image_metadata(mime_type: str, size: int):
    print(mime_type)
    print(size)
    if size <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file size",
        )

    if size > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image exceeds 10 MB limit",
        )

    if not mime_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing MIME type",
        )

    if not mime_type.startswith(ALLOWED_MIME_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only image uploads are allowed",
        )


@router.post("/upload-url")
def generate_upload_url(payload: UploadInitRequest):

    validate_image_metadata(
        mime_type=payload.mime_type,
        size=payload.size,
    )

    client = get_storage_client()
    bucket = client.bucket(INBOX_BUCKET)

    credentials, project_id = google.auth.default()
    credentials.refresh(google.auth.transport.requests.Request())

    file_name = f"{uuid.uuid4()}"
    blob = bucket.blob(file_name)

    signing_creds = get_signing_credentials()
    upload_url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="PUT",
        content_type=payload.mime_type,
        access_token=credentials.token,
        service_account_email=credentials.service_account_email,
        # service_account_email=signing_creds,
    )

    public_url = f"https://storage.googleapis.com/{PUBLIC_BUCKET}/{file_name}"

    return {"upload_url": upload_url, "public_url": public_url}
