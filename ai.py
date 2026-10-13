"""
ai.py - AI document explainer module using Google Gemini (google-genai SDK).
Extracts structured explanations, simple language summaries, and court dates
directly from uploaded PDFs and images without separate OCR.
"""

import os
import json
import re
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables from .env file if available
load_dotenv()

# List of supported output languages for ordinary citizens
SUPPORTED_LANGUAGES = [
    "English",
    "Hindi",
    "Tamil",
    "Telugu",
    "Marathi",
    "Bengali"
]

def get_api_key(custom_key: str = None) -> str:
    """
    Retrieves the Gemini API key from custom input or .env environment variable.
    """
    if custom_key and custom_key.strip():
        return custom_key.strip()
    return os.getenv("GEMINI_API_KEY", "").strip()


def extract_json_from_text(text: str) -> dict:
    """
    Cleans and parses JSON from the model response text.
    Handles potential markdown code fences (```json ... ```) gracefully.
    """
    text = text.strip()
    # Strip markdown code blocks if the model wrapped output with ```json ... ```
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Fallback regex search to find the first JSON object {}
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse valid JSON from AI response: {str(e)}")


def explain_document(file_bytes: bytes, mime_type: str, language: str = "English", custom_api_key: str = None) -> dict:
    """
    Sends the uploaded PDF or image file bytes directly to Gemini 2.5 Flash
    and returns a structured dictionary with plain-language explanations.

    Parameters:
    - file_bytes: Raw bytes of the uploaded file
    - mime_type: MIME type of the file (e.g. 'application/pdf', 'image/png')
    - language: Desired output language (English, Hindi, Tamil, etc.)
    - custom_api_key: Optional API key override from user input

    Returns:
    - dict containing doc_type, case_number, court, summary, what_it_means_for_you,
      important_dates, next_steps, glossary, warnings.
    """
    api_key = get_api_key(custom_api_key)
    if not api_key:
        raise ValueError(
            "Gemini API Key is missing! Please create a .env file with GEMINI_API_KEY=your_key "
            "or enter your API key in the sidebar."
        )

    # Detailed prompt instructing Gemini to analyze the legal document
    prompt = f"""
You are "CaseSaathi AI", a compassionate and expert legal document guide for ordinary people who cannot understand complex legal jargon.

Your job is to read the attached legal document (PDF or image) and explain it in extremely simple, reassuring, and practical terms in the following language: {language}.

Follow these strict rules:
1. SIMPLE WORDS: Explain everything in plain, easy-to-understand words. Avoid legalese.
2. ACCURACY & NO HALLUCINATION: Never invent, guess, or hallucinate dates, names, or facts. If a specific case number, court name, or date is not stated clearly in the document, return null.
3. DATE EXTRACTION: For each date found in the document, extract:
   - "date": Date in strict "YYYY-MM-DD" format. If the year or date cannot be definitively determined, return null.
   - "description": What this date represents (e.g., "Next hearing date", "Deadline to submit reply", "Order issued on").
   - "source_quote": The exact phrase or sentence from the document where this date is mentioned.
4. INFORMATION NOT LEGAL ADVICE: Emphasize that this is informational assistance, not formal legal advice.
5. MANDATORY WARNING: In the "warnings" array, always include an explicit warning advising the person to verify all deadlines, appearance dates, and notices directly with an advocate or court registry.
6. JSON ONLY: Return strictly valid JSON adhering to the exact schema below, with no surrounding explanations.

JSON SCHEMA:
{{
  "doc_type": "string (e.g. Court Summons, Bail Order, Legal Notice, Petition, Judgment, Warrant, or null)",
  "case_number": "string or null",
  "court": "string or null",
  "summary": "string (A clear summary of what this document is about in 3 to 5 very simple sentences)",
  "what_it_means_for_you": "string (Plain-language explanation of what this document practically means for the recipient)",
  "important_dates": [
    {{
      "date": "YYYY-MM-DD or null",
      "description": "string",
      "source_quote": "string"
    }}
  ],
  "next_steps": [
    "string (Common general steps to consider, e.g. Contact an advocate, gather documents, do not ignore summons)"
  ],
  "glossary": [
    {{
      "term": "string (Legal term used in this document)",
      "meaning": "string (Very simple everyday meaning)"
    }}
  ],
  "warnings": [
    "string (Crucial warnings, consequences of ignoring, and the reminder to confirm deadlines with a lawyer or court)"
  ]
}}
"""

    try:
        # Initialize Google GenAI client
        client = genai.Client(api_key=api_key)

        # Prepare multimodal content: file bytes Part + prompt text
        file_part = types.Part.from_bytes(
            data=file_bytes,
            mime_type=mime_type
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[file_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            )
        )

        raw_text = response.text
        if not raw_text:
            raise ValueError("The AI model returned an empty response. Please check if the document is clear.")

        parsed_data = extract_json_from_text(raw_text)

        # Ensure all required keys exist with safe defaults
        result = {
            "doc_type": parsed_data.get("doc_type") or "Legal Document",
            "case_number": parsed_data.get("case_number"),
            "court": parsed_data.get("court"),
            "summary": parsed_data.get("summary") or "No summary available.",
            "what_it_means_for_you": parsed_data.get("what_it_means_for_you") or "No explanation available.",
            "important_dates": parsed_data.get("important_dates") or [],
            "next_steps": parsed_data.get("next_steps") or [],
            "glossary": parsed_data.get("glossary") or [],
            "warnings": parsed_data.get("warnings") or [
                "This is information, not legal advice. Please confirm all dates and deadlines with a lawyer or court."
            ]
        }

        return result

    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "INVALID_ARGUMENT" in error_msg:
            raise RuntimeError("Invalid Gemini API Key. Please verify your GEMINI_API_KEY.") from e
        elif "RESOURCE_EXHAUSTED" in error_msg:
            raise RuntimeError("Gemini API rate limit or quota exceeded. Please wait a moment and try again.") from e
        else:
            raise RuntimeError(f"Error analyzing document with Gemini: {error_msg}") from e
