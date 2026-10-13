"""
db.py - Database operations for CaseSaathi AI
Uses Python's built-in SQLite (sqlite3) module.
Handles storage for Cases, Uploaded Documents, and Extracted Court Dates.
"""

import sqlite3
import json
from datetime import datetime

DB_NAME = "casesaathi.db"


def get_connection():
    """
    Creates and returns a connection to the SQLite database.
    row_factory is set to sqlite3.Row so columns can be accessed by name like dictionaries.
    """
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    # Enable foreign key constraint support in SQLite
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db():
    """
    Initializes the database schema if tables do not exist already.
    Creates three tables:
    1. cases - Stores general case details (title, court, case number).
    2. documents - Stores uploaded documents and their AI analysis.
    3. dates - Stores confirmed court dates, hearings, or deadlines.
    """
    with get_connection() as conn:
        cursor = conn.cursor()

        # 1. Cases table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                case_number TEXT,
                court TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 2. Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                doc_type TEXT,
                case_number TEXT,
                court TEXT,
                summary TEXT,
                what_it_means TEXT,
                warnings TEXT,       -- Stored as JSON list of warning strings
                next_steps TEXT,     -- Stored as JSON list of action steps
                glossary TEXT,       -- Stored as JSON list of {term, meaning}
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
            );
        """)

        # 3. Important Dates table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id INTEGER NOT NULL,
                doc_id INTEGER,
                date TEXT NOT NULL,         -- Stored in YYYY-MM-DD format
                description TEXT NOT NULL,
                source_quote TEXT,
                is_completed INTEGER DEFAULT 0, -- 0 = pending, 1 = completed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
                FOREIGN KEY (doc_id) REFERENCES documents(id) ON DELETE SET NULL
            );
        """)

        conn.commit()


# ==========================================
# CASE MANAGEMENT FUNCTIONS
# ==========================================

def create_case(title: str, case_number: str = "", court: str = "") -> int:
    """
    Creates a new case and returns the new case ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO cases (title, case_number, court)
            VALUES (?, ?, ?);
        """, (title.strip(), case_number.strip(), court.strip()))
        conn.commit()
        return cursor.lastrowid


def get_all_cases() -> list:
    """
    Retrieves all cases ordered by newest first.
    Returns a list of dict-like sqlite3.Row objects.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, case_number, court, created_at
            FROM cases
            ORDER BY id DESC;
        """)
        return cursor.fetchall()


def get_case_by_id(case_id: int):
    """
    Retrieves a single case by its primary key ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, title, case_number, court, created_at
            FROM cases
            WHERE id = ?;
        """, (case_id,))
        return cursor.fetchone()


# ==========================================
# DOCUMENT STORAGE FUNCTIONS
# ==========================================

def save_document(
    case_id: int,
    filename: str,
    doc_type: str,
    case_number: str,
    court: str,
    summary: str,
    what_it_means: str,
    warnings: list,
    next_steps: list,
    glossary: list
) -> int:
    """
    Saves an explained document's analysis into the database under a specific case.
    Serializes lists and dictionaries as JSON strings.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO documents (
                case_id, filename, doc_type, case_number, court,
                summary, what_it_means, warnings, next_steps, glossary
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            case_id,
            filename,
            doc_type or "Legal Document",
            case_number or "",
            court or "",
            summary or "",
            what_it_means or "",
            json.dumps(warnings or [], ensure_ascii=False),
            json.dumps(next_steps or [], ensure_ascii=False),
            json.dumps(glossary or [], ensure_ascii=False)
        ))
        conn.commit()
        return cursor.lastrowid


def get_documents_by_case(case_id: int) -> list:
    """
    Retrieves all documents associated with a specific case.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, case_id, filename, doc_type, case_number, court,
                   summary, what_it_means, warnings, next_steps, glossary, created_at
            FROM documents
            WHERE case_id = ?
            ORDER BY id DESC;
        """, (case_id,))
        return cursor.fetchall()


# ==========================================
# DATE MANAGEMENT FUNCTIONS
# ==========================================

def save_date(case_id: int, doc_id: int, date_str: str, description: str, source_quote: str = "") -> int:
    """
    Saves a confirmed court date or deadline for a case.
    date_str should be in YYYY-MM-DD format.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO dates (case_id, doc_id, date, description, source_quote, is_completed)
            VALUES (?, ?, ?, ?, ?, 0);
        """, (case_id, doc_id, date_str.strip(), description.strip(), (source_quote or "").strip()))
        conn.commit()
        return cursor.lastrowid


def get_dates_by_case(case_id: int) -> list:
    """
    Retrieves all dates (both completed and pending) associated with a case.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, case_id, doc_id, date, description, source_quote, is_completed, created_at
            FROM dates
            WHERE case_id = ?
            ORDER BY date ASC;
        """, (case_id,))
        return cursor.fetchall()


def get_upcoming_dates() -> list:
    """
    Retrieves all unfinished dates (is_completed = 0) across all cases,
    joined with case details, sorted by date ascending (nearest date first).
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 
                d.id, 
                d.case_id, 
                d.doc_id, 
                d.date, 
                d.description, 
                d.source_quote, 
                d.is_completed, 
                d.created_at,
                c.title AS case_title,
                c.case_number AS case_number,
                c.court AS case_court
            FROM dates d
            JOIN cases c ON d.case_id = c.id
            WHERE d.is_completed = 0
            ORDER BY d.date ASC;
        """)
        return cursor.fetchall()


def mark_date_done(date_id: int):
    """
    Marks a specific date item as completed (Done).
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE dates
            SET is_completed = 1
            WHERE id = ?;
        """, (date_id,))
        conn.commit()


def toggle_date_status(date_id: int) -> int:
    """
    Toggles completion status of a date (0 -> 1, 1 -> 0).
    Returns the new is_completed value.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT is_completed FROM dates WHERE id = ?;", (date_id,))
        row = cursor.fetchone()
        if not row:
            return 0
        new_status = 0 if row["is_completed"] == 1 else 1
        cursor.execute("UPDATE dates SET is_completed = ? WHERE id = ?;", (new_status, date_id))
        conn.commit()
        return new_status


def delete_date(date_id: int):
    """
    Deletes a specific date entry by ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM dates WHERE id = ?;", (date_id,))
        conn.commit()


def delete_case(case_id: int):
    """
    Deletes a case and all cascading documents and dates.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM cases WHERE id = ?;", (case_id,))
        conn.commit()


def get_all_dates(status_filter: str = "all") -> list:
    """
    Retrieves dates across all cases with optional filter: 'all', 'pending', 'completed'.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        query = """
            SELECT 
                d.id, 
                d.case_id, 
                d.doc_id, 
                d.date, 
                d.description, 
                d.source_quote, 
                d.is_completed, 
                d.created_at,
                c.title AS case_title,
                c.case_number AS case_number,
                c.court AS case_court
            FROM dates d
            JOIN cases c ON d.case_id = c.id
        """
        if status_filter == "pending":
            query += " WHERE d.is_completed = 0 "
        elif status_filter == "completed":
            query += " WHERE d.is_completed = 1 "

        query += " ORDER BY d.date ASC;"
        cursor.execute(query)
        return cursor.fetchall()


def get_document_by_id(doc_id: int):
    """
    Retrieves a single document by its ID.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, case_id, filename, doc_type, case_number, court,
                   summary, what_it_means, warnings, next_steps, glossary, created_at
            FROM documents
            WHERE id = ?;
        """, (doc_id,))
        return cursor.fetchone()


def get_stats() -> dict:
    """
    Returns high-level statistics for the dashboard.
    """
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS total_cases FROM cases;")
        total_cases = cursor.fetchone()["total_cases"]

        cursor.execute("SELECT COUNT(*) AS total_docs FROM documents;")
        total_docs = cursor.fetchone()["total_docs"]

        cursor.execute("SELECT COUNT(*) AS pending_dates FROM dates WHERE is_completed = 0;")
        pending_dates = cursor.fetchone()["pending_dates"]

        cursor.execute("SELECT COUNT(*) AS completed_dates FROM dates WHERE is_completed = 1;")
        completed_dates = cursor.fetchone()["completed_dates"]

        return {
            "total_cases": total_cases,
            "total_docs": total_docs,
            "pending_dates": pending_dates,
            "completed_dates": completed_dates
        }


# Automatically initialize tables when imported or run
init_db()
