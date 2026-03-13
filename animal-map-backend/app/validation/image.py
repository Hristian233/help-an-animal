import os
from io import BytesIO

import google.generativeai as genai
import httpx
from fastapi import HTTPException, status
from PIL import Image


def validate_animal_image(image_url: str) -> bool:
    """
    Validate that an image contains an animal using Gemini API.

    Args:
        image_url: URL of the image to validate

    Returns:
        True if the image contains an animal, False otherwise

    Raises:
        HTTPException: If validation fails or API call fails
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API key not configured",
        )

    try:
        # Configure Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-3-flash-preview")

        # Download image from URL
        # Handle both local mock URLs and actual GCS URLs
        if image_url.startswith("/mock/"):
            # For local development, skip validation or use a placeholder
            # In production, this should be a real URL
            return True

        # Download the image
        response = httpx.get(image_url, timeout=30.0)
        response.raise_for_status()

        # Convert to PIL Image for Gemini API
        image_data = BytesIO(response.content)
        pil_image = Image.open(image_data)

        # Create prompt for Gemini
        prompt = """Analyze this image and determine if it contains an animal (cat, dog, fox, hedgehog, or any other animal).
        
        Respond with ONLY one word: "YES" if the image contains an animal, or "NO" if it does not contain an animal.
        Do not include any explanation or additional text."""

        # Call Gemini API with image
        result = model.generate_content([prompt, pil_image])

        # Parse response
        response_text = result.text.strip().upper()

        if "YES" in response_text:
            return True
        elif "NO" in response_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image does not contain an animal. Please upload an image with an animal.",
            )
        else:
            # If response is unclear, be conservative and reject
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to verify that the image contains an animal. Please upload a clear image with an animal.",
            )

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to download image for validation: {str(e)}",
        )
    except Exception as e:
        # Handle Gemini API errors
        error_msg = str(e)
        if "API_KEY" in error_msg or "api key" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API key is invalid or not configured",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image validation failed: {error_msg}",
        )
