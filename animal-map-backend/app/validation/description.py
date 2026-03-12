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
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        # Create prompt for Gemini
        prompt = f"""Analyze this description for an animal marker:
        
Animal: {animal}
Description: {description}

Determine if the description is:
1. Appropriate and relevant to the animal
2. Not offensive, harmful, or inappropriate content
3. Related to animal welfare, observation, or relevant information

Respond with ONLY one word: "YES" if the description is valid and appropriate, or "NO" if it is invalid, inappropriate, offensive, or unrelated to the animal.
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
                detail="Description is invalid or inappropriate. Please provide a relevant and appropriate description.",
            )
        else:
            # If response is unclear, be conservative and reject
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to verify description validity. Please provide a clear and appropriate description.",
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
            detail=f"Description validation failed: {error_msg}",
        )
