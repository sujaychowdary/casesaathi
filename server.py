"""
server.py - Production-ready FastAPI Web Server for CaseSaathi AI
Serves both REST API backend and the Modern Single-Page Application (SPA) frontend.
"""

import os
import json
from datetime import datetime, date
from typing import Optional, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import db
import ai

# Initialize DB tables
db.init_db()

app = FastAPI(
    title="CaseSaathi AI",
    description="Empowering ordinary citizens with plain-language legal document explanations and court date tracking",
    version="2.0.0"
)

# Enable CORS for flexible integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# PYDANTIC DATA MODELS
# ==============================================================================
class CaseCreateRequest(BaseModel):
    title: str
    case_number: Optional[str] = ""
    court: Optional[str] = ""


class DateSaveItem(BaseModel):
    date: str
    description: str
    source_quote: Optional[str] = ""


class ManualDateCreateRequest(BaseModel):
    case_id: int
    date: str
    description: str
    source_quote: Optional[str] = ""


class DocumentSaveRequest(BaseModel):
    case_id: int
    filename: str
    doc_type: Optional[str] = "Legal Document"
    case_number: Optional[str] = ""
    court: Optional[str] = ""
    summary: Optional[str] = ""
    what_it_means: Optional[str] = ""
    warnings: Optional[List[str]] = []
    next_steps: Optional[List[str]] = []
    glossary: Optional[List[dict]] = []
    confirmed_dates: Optional[List[DateSaveItem]] = []


# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@app.get("/api/config")
def get_config():
    """
    Returns app configuration status, including whether Gemini API key is configured.
    """
    api_key = ai.get_api_key()
    return {
        "has_gemini_key": bool(api_key),
        "supported_languages": ai.SUPPORTED_LANGUAGES,
        "app_name": "CaseSaathi AI",
        "disclaimer": "This is information, not legal advice. Always confirm court dates, deadlines, and legal notices with a licensed lawyer or court clerk."
    }


@app.get("/api/stats")
def get_stats():
    """
    Returns total cases, documents, pending and completed dates.
    """
    stats = db.get_stats()
    
    # Calculate overdue and urgent count dynamically
    pending_dates = db.get_upcoming_dates()
    today_str = date.today().isoformat()
    
    overdue_count = 0
    urgent_count = 0
    
    for item in pending_dates:
        d_str = item["date"]
        try:
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
            diff_days = (d_obj - date.today()).days
            if diff_days < 0:
                overdue_count += 1
            elif diff_days <= 3:
                urgent_count += 1
        except Exception:
            pass

    stats["overdue_dates"] = overdue_count
    stats["urgent_dates"] = urgent_count
    return stats


# ------------------------------------------------------------------------------
# CASE MANAGEMENT
# ------------------------------------------------------------------------------

@app.get("/api/cases")
def list_cases():
    """
    Lists all legal cases.
    """
    rows = db.get_all_cases()
    results = []
    for r in rows:
        # Count documents and pending dates for each case
        docs = db.get_documents_by_case(r["id"])
        dates = db.get_dates_by_case(r["id"])
        pending_count = sum(1 for d in dates if d["is_completed"] == 0)

        results.append({
            "id": r["id"],
            "title": r["title"],
            "case_number": r["case_number"] or "Not Specified",
            "court": r["court"] or "Not Specified",
            "created_at": r["created_at"],
            "documents_count": len(docs),
            "pending_dates_count": pending_count,
            "total_dates_count": len(dates)
        })
    return results


@app.post("/api/cases")
def create_case(payload: CaseCreateRequest):
    """
    Creates a new legal case.
    """
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Case title is required.")
    
    new_id = db.create_case(
        title=payload.title,
        case_number=payload.case_number or "",
        court=payload.court or ""
    )
    return {"id": new_id, "message": "Case created successfully."}


@app.get("/api/cases/{case_id}")
def get_case(case_id: int):
    """
    Returns single case details, including its analyzed documents and dates.
    """
    case_row = db.get_case_by_id(case_id)
    if not case_row:
        raise HTTPException(status_code=404, detail="Case not found.")

    doc_rows = db.get_documents_by_case(case_id)
    documents = []
    for d in doc_rows:
        try:
            warnings = json.loads(d["warnings"]) if d["warnings"] else []
        except Exception:
            warnings = []
        try:
            next_steps = json.loads(d["next_steps"]) if d["next_steps"] else []
        except Exception:
            next_steps = []
        try:
            glossary = json.loads(d["glossary"]) if d["glossary"] else []
        except Exception:
            glossary = []

        documents.append({
            "id": d["id"],
            "filename": d["filename"],
            "doc_type": d["doc_type"],
            "case_number": d["case_number"],
            "court": d["court"],
            "summary": d["summary"],
            "what_it_means": d["what_it_means"],
            "warnings": warnings,
            "next_steps": next_steps,
            "glossary": glossary,
            "created_at": d["created_at"]
        })

    date_rows = db.get_dates_by_case(case_id)
    dates_list = []
    today = date.today()
    for item in date_rows:
        d_str = item["date"]
        status_label = "upcoming"
        days_diff = None
        try:
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
            days_diff = (d_obj - today).days
            if item["is_completed"] == 1:
                status_label = "completed"
            elif days_diff < 0:
                status_label = "overdue"
            elif days_diff <= 3:
                status_label = "urgent"
            else:
                status_label = "upcoming"
        except Exception:
            status_label = "upcoming"

        dates_list.append({
            "id": item["id"],
            "case_id": item["case_id"],
            "doc_id": item["doc_id"],
            "date": item["date"],
            "description": item["description"],
            "source_quote": item["source_quote"],
            "is_completed": bool(item["is_completed"]),
            "status": status_label,
            "days_diff": days_diff,
            "created_at": item["created_at"]
        })

    return {
        "id": case_row["id"],
        "title": case_row["title"],
        "case_number": case_row["case_number"] or "Not Specified",
        "court": case_row["court"] or "Not Specified",
        "created_at": case_row["created_at"],
        "documents": documents,
        "dates": dates_list
    }


@app.delete("/api/cases/{case_id}")
def delete_case(case_id: int):
    """
    Deletes a case and all associated records.
    """
    db.delete_case(case_id)
    return {"message": "Case deleted successfully."}


# ------------------------------------------------------------------------------
# DOCUMENT EXPLAINER & AI ANALYSIS
# ------------------------------------------------------------------------------

@app.post("/api/explain")
async def explain_document_api(
    file: UploadFile = File(...),
    language: str = Form("English"),
    custom_api_key: Optional[str] = Form(None)
):
    """
    Uploads a PDF or image document and analyzes it using Gemini 2.5 Flash.
    Returns structured plain-language summary, warnings, dates, and glossary.
    """
    valid_mime_types = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "image/webp"
    ]

    content_type = file.content_type or ""
    filename = file.filename or "uploaded_document"
    
    # Infer MIME type from file extension if not provided accurately
    if not content_type or content_type == "application/octet-stream":
        ext = filename.lower().split(".")[-1]
        if ext == "pdf":
            content_type = "application/pdf"
        elif ext in ["png", "jpg", "jpeg", "webp"]:
            content_type = f"image/{ext if ext != 'jpg' else 'jpeg'}"

    if content_type not in valid_mime_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type ({content_type}). Please upload a PDF or image (PNG, JPG, WEBP)."
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="The uploaded file is empty.")

    # Max 25 MB limit
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 25MB limit.")

    try:
        analysis = ai.explain_document(
            file_bytes=file_bytes,
            mime_type=content_type,
            language=language,
            custom_api_key=custom_api_key
        )
        return {
            "success": True,
            "filename": filename,
            "language": language,
            "analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/save-document")
def save_document_analysis(payload: DocumentSaveRequest):
    """
    Saves an explained document's analysis into the database and stores confirmed dates.
    """
    # Verify case exists
    case = db.get_case_by_id(payload.case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Selected case does not exist.")

    doc_id = db.save_document(
        case_id=payload.case_id,
        filename=payload.filename,
        doc_type=payload.doc_type or "Legal Document",
        case_number=payload.case_number or "",
        court=payload.court or "",
        summary=payload.summary or "",
        what_it_means=payload.what_it_means or "",
        warnings=payload.warnings or [],
        next_steps=payload.next_steps or [],
        glossary=payload.glossary or []
    )

    saved_dates_count = 0
    if payload.confirmed_dates:
        for item in payload.confirmed_dates:
            if item.date and item.description:
                db.save_date(
                    case_id=payload.case_id,
                    doc_id=doc_id,
                    date_str=item.date,
                    description=item.description,
                    source_quote=item.source_quote or ""
                )
                saved_dates_count += 1

    return {
        "success": True,
        "doc_id": doc_id,
        "saved_dates_count": saved_dates_count,
        "message": f"Document saved successfully with {saved_dates_count} dates added to calendar."
    }


# ------------------------------------------------------------------------------
# DATES & DEADLINES TRACKER
# ------------------------------------------------------------------------------

@app.get("/api/dates")
def list_dates(status: str = Query("all", pattern="^(all|pending|completed)$")):
    """
    Lists dates across all cases with urgency status badges.
    """
    rows = db.get_all_dates(status_filter=status)
    today = date.today()
    results = []

    for r in rows:
        d_str = r["date"]
        status_label = "upcoming"
        days_diff = None

        try:
            d_obj = datetime.strptime(d_str, "%Y-%m-%d").date()
            days_diff = (d_obj - today).days
            if r["is_completed"] == 1:
                status_label = "completed"
            elif days_diff < 0:
                status_label = "overdue"
            elif days_diff <= 3:
                status_label = "urgent"
            else:
                status_label = "upcoming"
        except Exception:
            status_label = "upcoming"

        results.append({
            "id": r["id"],
            "case_id": r["case_id"],
            "case_title": r["case_title"],
            "case_number": r["case_number"] or "",
            "case_court": r["case_court"] or "",
            "doc_id": r["doc_id"],
            "date": r["date"],
            "description": r["description"],
            "source_quote": r["source_quote"],
            "is_completed": bool(r["is_completed"]),
            "status": status_label,
            "days_diff": days_diff,
            "created_at": r["created_at"]
        })

    return results


@app.post("/api/dates")
def add_manual_date(payload: ManualDateCreateRequest):
    """
    Adds a custom hearing date or deadline to a case.
    """
    if not payload.date.strip() or not payload.description.strip():
        raise HTTPException(status_code=400, detail="Date and description are required.")

    try:
        datetime.strptime(payload.date.strip(), "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Please use YYYY-MM-DD.")

    date_id = db.save_date(
        case_id=payload.case_id,
        doc_id=None,
        date_str=payload.date.strip(),
        description=payload.description.strip(),
        source_quote=payload.source_quote.strip() if payload.source_quote else "Manually added by user"
    )
    return {"id": date_id, "message": "Date scheduled successfully."}


@app.post("/api/dates/{date_id}/toggle")
def toggle_date(date_id: int):
    """
    Toggles completion status for a date.
    """
    new_status = db.toggle_date_status(date_id)
    return {
        "id": date_id,
        "is_completed": bool(new_status),
        "message": "Marked as completed" if new_status == 1 else "Marked as pending"
    }


@app.delete("/api/dates/{date_id}")
def delete_date(date_id: int):
    """
    Deletes a date entry.
    """
    db.delete_date(date_id)
    return {"message": "Date deleted."}


# ==============================================================================
# STATIC FRONTEND SERVING
# ==============================================================================
# Mount static files folder
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return JSONResponse({"status": "CaseSaathi AI API is live. Place static/index.html to view UI."})


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"⚖️ Starting CaseSaathi AI Web Application on http://localhost:{port}")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
