# ⚖️ CaseSaathi AI

**CaseSaathi AI** is a legal case guide web application built for ordinary citizens who find court notices, petitions, summons, and legal documents confusing or intimidating. 

It reads uploaded legal documents (PDFs and images) using Google Gemini 2.5 Flash, extracts key information, explains everything in simple words, identifies critical dates with exact source quotes, and helps users track their court deadlines.

---

## 📌 Disclaimer
> **⚠️ Information, Not Legal Advice:** CaseSaathi AI provides informational explanations to help you understand your documents. It does not provide legal advice. Always consult a licensed lawyer or the court registry to verify deadlines and legal actions.

---

## 📁 What Each File Does (In Simple Words)

- **`requirements.txt`**: The shopping list of Python packages needed to run this application (`fastapi` and `uvicorn` for the web server, `google-genai` for the Gemini AI model, and `python-dotenv` to safely load secrets).
- **`.env.example`**: A template showing where to put your Google Gemini API key. You copy this file to `.env` and paste your key.
- **`.gitignore`**: A safety filter that tells Git never to upload your private `.env` file (containing your secret API key) or your local database `casesaathi.db` to GitHub.
- **`db.py`**: The local database engine using Python's built-in SQLite (`sqlite3`). It creates and manages 3 tables: **cases** (your legal cases), **documents** (uploaded notices and AI summaries), and **dates** (court hearings and deadlines).
- **`ai.py`**: The AI brain. It connects to Google Gemini (`gemini-2.5-flash`), sends your uploaded PDF or image directly without needing extra OCR software, instructs Gemini to translate and simplify the text into plain language (English, Hindi, Tamil, Telugu, Marathi, or Bengali), and returns structured data.
- **`server.py`**: The main FastAPI web server serving the REST API and the modern interactive web application frontend.
- **`static/`**: Contains the front-end web application assets (HTML, CSS, JavaScript).
- **`README.md`**: This beginner-friendly guide explaining the setup, file structure, and how to test the application.

---

## 🚀 How to Run the App (Step-by-Step)

### Step 1: Open Terminal in the project folder
Ensure you are in the `casesaathi` folder:
```powershell
cd c:\Users\NANI\OneDrive\Desktop\casesaathi
```

### Step 2: Set up your Gemini API Key
1. Get a free API key from [Google AI Studio](https://aistudio.google.com/).
2. Copy `.env.example` to create a `.env` file:
   ```powershell
   copy .env.example .env
   ```
3. Open `.env` and replace `your_gemini_api_key_here` with your actual API key:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```

### Step 3: Install Dependencies
Run:
```powershell
pip install -r requirements.txt
```
*(Or if using the project virtual environment: `.\.venv\Scripts\pip install -r requirements.txt`)*

### Step 4: Start the Web App
Run:
```powershell
python app.py
```
*(Or `uvicorn app:app --reload --port 8000`, or simply double-click `start.bat`)*

The web app will automatically open or be accessible at `http://localhost:8000`.

---

## 🧪 How to Test the App

1. **Create a Case**:
   - Go to **"📁 My Cases"** in the sidebar.
   - Enter a title like *"Property Dispute Notice"*, an optional Case Number like *"OS 104/2024"*, and Court name like *"Civil Court"*.
   - Click **Create Case**.

2. **Explain a Legal Document**:
   - Go to **"📄 Explain Document"**.
   - Select your case from the dropdown.
   - Upload any court notice, summons, or legal paper (PDF, PNG, or JPG).
   - Choose your preferred language (English, Hindi, Tamil, Telugu, Marathi, or Bengali).
   - Click **"🚀 Explain Document with AI"**.
   - Review the:
     - 3-5 sentence simple summary
     - Plain-English "What This Means For You"
     - Yellow warning boxes
     - Next steps checklist
     - Expandable Legal Terms Glossary

3. **Confirm Court Dates**:
   - Scroll down to the **"Extracted Dates & Deadlines"** section.
   - Look at the extracted date, description, and source quote.
   - Edit the date if needed (must be in `YYYY-MM-DD` format).
   - Click **"💾 Save Document & Confirmed Dates to Case"**.

4. **Track Deadlines**:
   - Go to **"📅 Upcoming Dates"** in the sidebar.
   - View your deadlines sorted with days remaining badges.
   - Any date that is **overdue** or **due within 3 days** is highlighted in **bright red**!
   - Click the **"Mark as Done ✅"** button to finish a deadline.
