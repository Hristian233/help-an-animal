from fastapi import APIRouter
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

router = APIRouter()

BUCKET_NAME = "help-an-animal-images"
SERVICE_ACCOUNT_FILE = os.getenv("GCS_KEY_FILE", "gcs-key.json")


def get_storage_client():
    is_cloud_run = bool(os.getenv("K_SERVICE"))

    # Local: use JSON key if present
    if not is_cloud_run and os.path.exists(SERVICE_ACCOUNT_FILE):
        return storage.Client.from_service_account_json(SERVICE_ACCOUNT_FILE)

    # Cloud Run or local ADC
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


# @router.get("/upload-url")
# def generate_upload_url():
#     client = get_storage_client()
#     bucket = client.bucket(BUCKET_NAME)

#     file_name = f"{uuid.uuid4()}.jpg"
#     blob = bucket.blob(file_name)

#     signing_creds = get_signing_credentials()

#     print("Using signer:", type(signing_creds))

#     upload_url = blob.generate_signed_url(
#         version="v4",
#         expiration=timedelta(minutes=10),
#         method="PUT",
#         content_type="image/jpeg",
#         credentials=signing_creds,
#     )

#     public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{file_name}"

#     return {"upload_url": upload_url, "public_url": public_url}


@router.get("/upload-url")
def generate_upload_url():
    client = get_storage_client()
    bucket = client.bucket(BUCKET_NAME)
    credentials, project_id = google.auth.default()

    file_name = f"{uuid.uuid4()}.jpg"
    blob = bucket.blob(file_name)

    signing_creds = get_signing_credentials()
    credentials.refresh(google.auth.transport.requests.Request())
    upload_url = blob.generate_signed_url(
        version="v4",
        expiration=datetime.timedelta(minutes=15),
        method="PUT",
        content_type="image/jpeg",
        access_token=credentials.token,
        service_account_email=credentials.service_account_email,
    )

    public_url = f"https://storage.googleapis.com/{BUCKET_NAME}/{file_name}"

    return {"upload_url": upload_url, "public_url": public_url}
