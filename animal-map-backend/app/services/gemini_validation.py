"""
Gemini validation service for image and description validation.
Uses Google AI Studio (google-generativeai) to validate:
1. Image contains the claimed animal type
2. Description is appropriate (no spam, URLs, etc.)
"""
import io
import os
import time
from typing import Tuple

import google.generativeai as genai
import requests
from PIL import Image
from google.cloud import storage

# Initialize Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

INBOX_BUCKET = "help-an-animal-inbox"
PUBLIC_BUCKET = "help-an-animal-images"

# Animal type mappings for validation
ANIMAL_LABELS = {
    "dog": ["dog", "puppy", "canine", "pet dog"],
    "cat": ["cat", "kitten", "feline", "pet cat"],
    "fox": ["fox", "red fox", "wild fox", "vulpes"],
}


def get_storage_client():
    """Get GCS client for reading images."""
    SERVICE_ACCOUNT_FILE = os.getenv("GCS_KEY_FILE", "gcs-key.json")
    IS_CLOUD_RUN = bool(os.getenv("K_SERVICE"))

    if not IS_CLOUD_RUN and os.path.exists(SERVICE_ACCOUNT_FILE):
        return storage.Client.from_service_account_json(SERVICE_ACCOUNT_FILE)

    return storage.Client()


def download_image_from_gcs(gcs_uri: str) -> bytes | None:
    """
    Download image bytes from GCS.
    Tries inbox bucket first, then public bucket if not found.
    Returns None if image not found after retries.
    """
    # Parse bucket and blob name from gs:// URI
    if not gcs_uri.startswith("gs://"):
        return None

    parts = gcs_uri.replace("gs://", "").split("/", 1)
    if len(parts) != 2:
        return None

    bucket_name, blob_name = parts

    client = get_storage_client()
    max_retries = 3
    retry_delay = 2  # seconds

    # Try inbox first, then public bucket
    buckets_to_try = [bucket_name, PUBLIC_BUCKET] if bucket_name == INBOX_BUCKET else [bucket_name]

    for attempt in range(max_retries):
        for bucket_name_to_try in buckets_to_try:
            try:
                bucket = client.bucket(bucket_name_to_try)
                blob = bucket.blob(blob_name)
                if blob.exists():
                    return blob.download_as_bytes()
            except Exception as e:
                print(f"Error downloading from {bucket_name_to_try}: {e}")

        if attempt < max_retries - 1:
            time.sleep(retry_delay)

    return None


def validate_marker_image_and_description(
    image_gcs_uri: str | None,
    image_url: str | None,
    description: str | None,
    claimed_animal: str,
) -> Tuple[bool, str, int]:
    """
    Validate marker image and description using Gemini.

    Args:
        image_gcs_uri: GCS URI of the image (gs://bucket/path)
        image_url: Public URL of the image (fallback)
        description: Bulgarian description text
        claimed_animal: Animal type claimed by user (dog, cat, fox)

    Returns:
        Tuple of (is_valid: bool, error_message: str, status_code: int)
        If valid, error_message is empty string and status_code is 200.
        Status codes: 409 for "image still processing", 400 for validation failures, 503 for API errors.
    """
    # Skip validation if Gemini API key not configured
    if not GEMINI_API_KEY:
        print("Warning: GEMINI_API_KEY not set, skipping validation")
        return True, "", 200

    # Skip validation if no image provided
    if not image_gcs_uri and not image_url:
        return True, "", 200

    try:
        # Initialize Gemini model
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Prepare image for validation
        image_data = None
        if image_gcs_uri:
            image_data = download_image_from_gcs(image_gcs_uri)

        # If GCS download failed, try fetching from public URL
        if not image_data and image_url:
            try:
                response = requests.get(image_url, timeout=10)
                if response.status_code == 200:
                    image_data = response.content
            except Exception as e:
                print(f"Error fetching image from URL: {e}")

        if not image_data:
            return False, "Image is still processing. Please wait a moment and try again.", 409

        # Prepare validation prompt
        animal_labels = ANIMAL_LABELS.get(claimed_animal.lower(), [claimed_animal])
        animal_list = ", ".join(animal_labels)

        validation_prompt = f"""You are validating an animal marker submission. Please check:

1. IMAGE VALIDATION: Does the image contain a {claimed_animal}? Look for: {animal_list}
   - Respond with "IMAGE_VALID: yes" if the image clearly shows a {claimed_animal}
   - Respond with "IMAGE_VALID: no" if the image does not contain a {claimed_animal} or is not an animal photo

2. DESCRIPTION VALIDATION: The description is in Bulgarian. Check if it:
   - Is meaningful and related to animals/location (not spam)
   - Does NOT contain URLs (http://, https://, www.)
   - Is not just repeated characters or gibberish
   - Respond with "DESC_VALID: yes" if appropriate, "DESC_VALID: no" if inappropriate

Description text: "{description or '(no description)'}"

Respond in this exact format:
IMAGE_VALID: [yes/no]
DESC_VALID: [yes/no]
REASON: [brief explanation if any validation fails]
"""

        # Create image part
        image = Image.open(io.BytesIO(image_data))
        image_part = image

        # Generate validation response
        response = model.generate_content([validation_prompt, image_part])

        # Parse response
        response_text = response.text.strip()

        image_valid = False
        desc_valid = False
        reason = ""

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("IMAGE_VALID:"):
                image_valid = "yes" in line.lower()
            elif line.startswith("DESC_VALID:"):
                desc_valid = "yes" in line.lower()
            elif line.startswith("REASON:"):
                reason = line.replace("REASON:", "").strip()

        # Check results
        if not image_valid:
            error_msg = f"The image does not appear to contain a {claimed_animal}."
            if reason:
                error_msg += f" {reason}"
            return False, error_msg, 400

        if description and not desc_valid:
            error_msg = "The description is not appropriate. Please write a meaningful description without URLs or spam."
            if reason:
                error_msg += f" {reason}"
            return False, error_msg, 400

        return True, "", 200

    except Exception as e:
        print(f"Gemini validation error: {e}")
        # On API errors, return 503 (Service Unavailable)
        return False, "Validation temporarily unavailable. Please try again.", 503
