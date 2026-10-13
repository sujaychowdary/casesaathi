"""
app.py - Main Application Entry Point for CaseSaathi AI

Provides direct access to the FastAPI `app` instance from `server.py` and
allows running the application with standard execution commands:
  - python app.py
  - uvicorn app:app --reload --port 8000
"""

import os
import webbrowser
import uvicorn
from server import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "127.0.0.1")
    url = f"http://localhost:{port}"

    print("=" * 60)
    print(f"  ⚖️  CaseSaathi AI is running!")
    print(f"  👉 Web App URL :  {url}")
    print(f"  👉 API Docs URL:  {url}/docs")
    print("=" * 60)

    # Optional: Automatically open default web browser
    try:
        webbrowser.open(url)
    except Exception:
        pass

    uvicorn.run("app:app", host=host, port=port, reload=True)
