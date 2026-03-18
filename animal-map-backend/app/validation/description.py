import os

import google.generativeai as genai
from fastapi import HTTPException, status


def validate_description(description: str | None, animal: str) -> bool:
    """
    Validate that a description is appropriate and relevant to the animal using Gemini API.

    Args:
        description: The description/note text to validate (can be None)
        animal: The animal name/type

    Returns:
        True if the description is valid, False otherwise

    Raises:
        HTTPException: If validation fails or API call fails
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Gemini API key not configured",
        )

    # If description is None or empty, that's acceptable (it's optional)
    if not description or not description.strip():
        return True

    try:
        # Configure Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-3-flash-preview",
            safety_settings={
                "HARM_CATEGORY_HARASSMENT": "BLOCK_ONLY_HIGH",
                "HARM_CATEGORY_SEXUALLY_EXPLICIT": "BLOCK_ONLY_HIGH",
            },
        )

        # Create prompt for Gemini
        prompt = f"""Analyze this description for an animal marker:

Animal: {animal}
Description: {description}

You are a validator for a Bulgarian wildlife map.
IMPORTANT: Bulgarian users naturally use diminutives like 'котенце', 'сладко',
'кученце' to describe animals.
These are NOT flirtatious or inappropriate; they are affectionate and common.
ONLY reject content that is truly offensive, violent, or completely unrelated to animals.

Respond with ONLY one word: "YES" if the description is valid and appropriate,
or "NO" if it is invalid, inappropriate, offensive, or unrelated to the animal.
Do not include any explanation or additional text."""

        # Call Gemini API
        result = model.generate_content(prompt)

        # Parse response
        response_text = result.text.strip().upper()

        if "YES" in response_text:
            return True
        elif "NO" in response_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Description is invalid or inappropriate. "
                    "Please provide a relevant and appropriate description."
                ),
            )
        else:
            # If response is unclear, be conservative and reject
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Unable to verify description validity. "
                    "Please provide a clear and appropriate description."
                ),
            )

    except HTTPException:
        raise
    except Exception as e:
        # Handle Gemini API errors
        error_msg = str(e)
        if "API_KEY" in error_msg or "api key" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Gemini API key is invalid or not configured",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Description validation failed: {error_msg}",
        ) from e
