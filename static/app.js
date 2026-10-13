/**
 * app.js - CaseSaathi AI National Judicial Portal Application Logic
 * Interactive frontend for Legal Document Explainer, Case Tracking, Cause List & Accessibility
 */

// Application State
const state = {
    currentTab: 'dashboard',
    selectedLanguage: 'English',
    selectedFile: null,
    currentAnalysis: null,
    currentCaseId: null,
    cases: [],
    dates: [],
    datesFilter: 'all',
    hasApiKey: false,
    customApiKey: localStorage.getItem('casesaathi_gemini_api_key') || '',
    stats: {
        total_cases: 0,
        total_docs: 0,
        pending_dates: 0,
        completed_dates: 0,
        urgent_dates: 0,
        overdue_dates: 0
    }
};

// Built-in Indian Judicial & Legal Terminology Glossary
const LEGAL_GLOSSARY_DATABASE = [
    {
        term: "समन (Summons)",
        meaning: "न्यायालय द्वारा जारी आधिकारिक आदेश जिसमें आपको निर्धारित तिथि पर उपस्थित होने या लिखित जवाब प्रस्तुत करने का निर्देश होता है।"
    },
    {
        term: "वकालतनामा (Vakalatnama)",
        meaning: "एक आधिकारिक अधिकार-पत्र जिसके द्वारा मुवक्किल अपने अधिवक्ता (वकील) को न्यायालय में अपनी ओर से पैरवी करने हेतु अधिकृत करता है।"
    },
    {
        term: "एकतरफा आदेश (Ex-Parte Order)",
        meaning: "जब नोटिस प्राप्त होने के बावजूद दूसरा पक्ष अदालत में उपस्थित नहीं होता, तो न्यायाधीश द्वारा एक पक्ष की दलील सुनकर दिया गया फैसला।"
    },
    {
        term: "स्टे ऑर्डर / व्यादेश (Injunction / Stay)",
        meaning: "अदालत का अंतरिम आदेश जो किसी व्यक्ति या विभाग को विवादित संपत्ति बेचने, निर्माण करने या तोड़फोड़ करने से अस्थायी रूप से रोकता है।"
    },
    {
        term: "जमानत (Bail)",
        meaning: "मुकदमे की सुनवाई पूरी होने तक किसी आरोपी को सशर्त या मुचलके (बॉन्ड) पर जेल से अस्थायी रिहाई मिलना।"
    },
    {
        term: "दावा और जवाब-दावा (Plaint & Written Statement)",
        meaning: "वादी द्वारा दायर की गई शिकायत 'दावा' कहलाती है; प्रतिवादी द्वारा उस पर बिंदुवार दिया गया लिखित उत्तर 'जवाब-दावा' कहलाता है।"
    },
    {
        term: "लोक अदालत (Lok Adalat)",
        meaning: "जनता की अदालत जहां आपसी सुलह-समझौते द्वारा बिना कोर्ट फीस के अंतिम व बाध्यकारी रूप से मुकदमों का तुरंत निपटारा होता है।"
    },
    {
        term: "संज्ञेय अपराध (Cognizable Offence)",
        meaning: "गंभीर अपराध जिसमें पुलिस बिना मजिस्ट्रेट के वारंट के तुरंत आरोपी को गिरफ्तार एवं जांच शुरू कर सकती है।"
    },
    {
        term: "गैर-जमानती वारंट (Non-Bailable Warrant / NBW)",
        meaning: "अदालत द्वारा जारी किया गया सख्त गिरफ्तारी वारंट जब कोई व्यक्ति बार-बार समन दिए जाने पर भी कोर्ट में हाजिर नहीं होता।"
    },
    {
        term: "कैविएट (Caveat)",
        meaning: "अदालत में दर्ज की गई एहतियाती अर्जी कि आपका पक्ष सुने बिना आपके खिलाफ कोई भी विरोधी आदेश या स्टे पारित न किया जाए।"
    },
    {
        term: "विधिक नोटिस (Legal Notice)",
        meaning: "अदालत में मुकदमा दायर करने से पहले विपक्षी पार्टी को वकील के जरिए भेजा गया औपचारिक चेतावनी पत्र।"
    },
    {
        term: "शपथ पत्र (Affidavit)",
        meaning: "सत्यनिष्ठा के साथ नोटरी या शपथ आयुक्त के समक्ष लिखित में ली गई शपथ कि प्रस्तुत किए गए समस्त तथ्य सत्य हैं।"
    }
];

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupDropzone();
    renderGlossaryGuide(LEGAL_GLOSSARY_DATABASE);
    startLiveClock();
    restoreTheme();
    restoreLanguage();
});

/**
 * Initialize application configurations and initial data
 */
async function initApp() {
    await checkConfig();
    await loadDashboard();
    await loadCasesDropdown();
}

/**
 * Live Indian Standard Time (IST) Clock
 */
function startLiveClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const el = document.getElementById('live-clock-text');
    if (!el) return;
    const now = new Date();
    const options = {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    el.textContent = `${now.toLocaleDateString('en-IN', options)} IST`;
}

/**
 * Font Size Adjuster
 */
let currentFontSize = 16;
function adjustFontSize(delta) {
    if (delta === 0) currentFontSize = 16;
    else currentFontSize = Math.min(20, Math.max(13, currentFontSize + delta));
    document.documentElement.style.setProperty('--base-font-size', `${currentFontSize}px`);
}

/**
 * High Contrast / Theme Toggle
 */
function toggleContrastTheme() {
    document.body.classList.toggle('light-contrast');
    const isLight = document.body.classList.contains('light-contrast');
    localStorage.setItem('casesaathi_contrast_theme', isLight ? 'light' : 'dark');
}

function restoreTheme() {
    const saved = localStorage.getItem('casesaathi_contrast_theme');
    if (saved === 'light') {
        document.body.classList.add('light-contrast');
    }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    
    toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Switch Navigation Tab Views
 */
function switchTab(tabId) {
    state.currentTab = tabId;

    // Update active nav button
    document.querySelectorAll('.gov-nav-tab').forEach(btn => {
        btn.classList.toggle('active', btn.id === `nav-tab-${tabId}`);
    });

    // Update active view
    document.querySelectorAll('.tab-view').forEach(view => {
        view.classList.toggle('active', view.id === `view-${tabId}`);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Refresh data for the active tab
    if (tabId === 'dashboard') loadDashboard();
    if (tabId === 'cases') loadCasesView();
    if (tabId === 'dates') loadDatesTimeline();
    if (tabId === 'explain') loadCasesDropdown();
}

/**
 * Check Backend Config & Gemini API Key Status
 */
async function checkConfig() {
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        state.hasApiKey = data.has_gemini_key || !!state.customApiKey;

        const dot = document.getElementById('api-status-dot');
        const text = document.getElementById('api-status-text');

        if (state.hasApiKey) {
            dot.style.backgroundColor = 'var(--gov-green-light)';
            dot.style.boxShadow = '0 0 8px var(--gov-green-light)';
            text.textContent = 'सक्रिय (Active Engine)';
        } else {
            dot.style.backgroundColor = 'var(--gov-saffron)';
            dot.style.boxShadow = '0 0 8px var(--gov-saffron)';
            text.textContent = 'कुंजी दर्ज करें (Set Key)';
        }
    } catch (err) {
        console.error('Failed to fetch config:', err);
    }
}

/**
 * Load Dashboard Metrics and Data
 */
async function loadDashboard() {
    try {
        // Fetch stats
        const statsRes = await fetch('/api/stats');
        state.stats = await statsRes.json();

        document.getElementById('stat-total-cases').textContent = state.stats.total_cases;
        document.getElementById('stat-total-docs').textContent = state.stats.total_docs;
        document.getElementById('stat-pending-dates').textContent = state.stats.pending_dates;
        document.getElementById('stat-urgent-dates').textContent = state.stats.urgent_dates + state.stats.overdue_dates;

        const urgentBadge = document.getElementById('header-urgent-badge');
        const totalUrgent = state.stats.urgent_dates + state.stats.overdue_dates;
        if (totalUrgent > 0) {
            urgentBadge.textContent = totalUrgent;
            urgentBadge.style.display = 'inline-block';
        } else {
            urgentBadge.style.display = 'none';
        }

        // Fetch upcoming dates (top 4)
        const datesRes = await fetch('/api/dates?status=pending');
        const dates = await datesRes.json();
        renderDashboardUpcomingDates(dates.slice(0, 4));

        // Fetch cases (top 3)
        const casesRes = await fetch('/api/cases');
        state.cases = await casesRes.json();
        renderDashboardCases(state.cases.slice(0, 3));
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

/**
 * Render Dashboard Next Hearings (Cause List format)
 */
function renderDashboardUpcomingDates(dates) {
    const container = document.getElementById('dashboard-upcoming-list');
    if (!dates || dates.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <p>वर्तमान में कोई लंबित अदालती पेशी अथवा समय-सीमा दर्ज नहीं है।</p>
                <button class="btn btn-gov-secondary btn-sm" style="margin-top: 10px;" onclick="openManualDateModal()">+ पेशी तिथि जोड़ें</button>
            </div>
        `;
        return;
    }

    container.innerHTML = dates.map(d => {
        let badgeHtml = '';
        if (d.status === 'overdue') {
            badgeHtml = `<span class="h-countdown overdue">🔴 अतिदेय (Overdue)</span>`;
        } else if (d.status === 'urgent') {
            badgeHtml = `<span class="h-countdown urgent">⚠️ ${d.days_diff} दिन शेष (Urgent)</span>`;
        } else {
            badgeHtml = `<span class="h-countdown upcoming">${d.days_diff} दिन शेष</span>`;
        }

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-subtle); gap: 14px;">
                <div>
                    <div class="cause-case-ref">🏛️ ${escapeHtml(d.case_title)} ${d.case_number ? `(${escapeHtml(d.case_number)})` : ''}</div>
                    <div style="font-weight: 800; font-size: 0.96rem; color: #ffffff; margin-top: 2px;">${escapeHtml(d.description)}</div>
                    <div style="font-family: var(--font-mono); font-size: 0.84rem; color: var(--text-secondary); margin-top: 2px;">📅 ${d.date}</div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                    ${badgeHtml}
                    <button class="btn btn-sm btn-gov-secondary" onclick="toggleDateStatus(${d.id})">सम्पन्न मार्क करें</button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render Dashboard Cases
 */
function renderDashboardCases(cases) {
    const container = document.getElementById('dashboard-cases-container');
    if (!cases || cases.length === 0) {
        container.innerHTML = `
            <div class="empty-state-mini">
                <p>कोई पंजीकृत वाद दर्ज नहीं है।</p>
                <button class="btn btn-gov-primary btn-sm" style="margin-top: 10px;" onclick="openNewCaseModal()">+ पहला वाद दर्ज करें</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${cases.map(c => `
                <div class="gov-case-box" style="padding: 18px;">
                    <div class="case-box-header">
                        <h4 class="case-box-title">${escapeHtml(c.title)}</h4>
                    </div>
                    <div class="case-box-meta" style="margin-bottom: 14px;">
                        <span class="meta-record-item">🏛️ न्यायालय: <strong>${escapeHtml(c.court)}</strong></span>
                        <span class="meta-record-item">📋 वाद संख्या: <strong>${escapeHtml(c.case_number)}</strong></span>
                    </div>
                    <div class="case-box-stats" style="margin-bottom: 14px;">
                        <span class="gov-stat-chip">📑 <strong>${c.documents_count}</strong> दस्तावेज</span>
                        <span class="gov-stat-chip">📅 <strong>${c.pending_dates_count}</strong> लंबित पेशी</span>
                    </div>
                    <div class="case-box-actions">
                        <button class="btn btn-gov-secondary btn-sm" style="width: 100%;" onclick="openCaseDossier(${c.id})">वाद विवरण पत्रक देखें →</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Load Cases into Dropdown Select
 */
async function loadCasesDropdown() {
    try {
        const res = await fetch('/api/cases');
        state.cases = await res.json();

        const select = document.getElementById('explain-case-select');
        const manualSelect = document.getElementById('manual-date-case');

        if (state.cases.length === 0) {
            select.innerHTML = '<option value="" disabled selected>कोई वाद नहीं मिला। कृपया पहले नया वाद दर्ज करें!</option>';
            manualSelect.innerHTML = '<option value="" disabled selected>कोई वाद उपलब्ध नहीं है।</option>';
            return;
        }

        const options = state.cases.map(c => 
            `<option value="${c.id}">${escapeHtml(c.title)} — ${escapeHtml(c.court || 'Court')} (${escapeHtml(c.case_number || 'No Case No')})</option>`
        ).join('');

        select.innerHTML = `<option value="" disabled selected>पंजीकृत वाद चुनें (Select registered case)...</option>${options}`;
        manualSelect.innerHTML = `<option value="" disabled selected>वाद चुनें...</option>${options}`;

        if (state.currentCaseId) {
            select.value = state.currentCaseId;
        }
    } catch (err) {
        console.error('Error fetching cases for dropdown:', err);
    }
}

/**
 * Language Selector Handling
 */
function selectLanguage(lang) {
    state.selectedLanguage = lang;
    document.querySelectorAll('.gov-lang-chip').forEach(chip => {
        chip.classList.toggle('active', chip.getAttribute('data-lang') === lang);
    });
}

/**
 * Drag & Drop Zone Setup
 */
function setupDropzone() {
    const dropzone = document.getElementById('file-dropzone');
    if (!dropzone) return;

    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            processFile(files[0]);
        }
    });
}

function triggerFileInput() {
    document.getElementById('file-input').click();
}

function handleFileSelected(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function processFile(file) {
    const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
    const ext = file.name.split('.').pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
        showToast('कृपया केवल पीडीएफ (PDF) अथवा इमेज (PNG, JPG, WEBP) फाइल अपलोड करें।', 'error');
        return;
    }

    if (file.size > 25 * 1024 * 1024) {
        showToast('फाइल का आकार 25MB की सीमा से अधिक है।', 'error');
        return;
    }

    state.selectedFile = file;

    // Display selected file info
    document.getElementById('dropzone-idle').style.display = 'none';
    const selBox = document.getElementById('dropzone-selected');
    selBox.style.display = 'flex';

    document.getElementById('selected-filename-text').textContent = file.name;
    document.getElementById('selected-filesize-text').textContent = formatBytes(file.size);

    const icon = ext === 'pdf' ? '📑' : '🖼️';
    document.getElementById('file-icon-display').textContent = icon;
}

function clearSelectedFile(event) {
    if (event) event.stopPropagation();
    state.selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('dropzone-idle').style.display = 'block';
    document.getElementById('dropzone-selected').style.display = 'none';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Handle Document Explanation Submission (Call Gemini API)
 */
async function handleExplainSubmit(event) {
    event.preventDefault();

    const caseSelect = document.getElementById('explain-case-select');
    const caseId = parseInt(caseSelect.value);

    if (!caseId) {
        showToast('कृपया पहले किसी पंजीकृत वाद का चयन करें।', 'error');
        return;
    }

    if (!state.selectedFile) {
        showToast('कृपया विश्लेषण हेतु कोई कानूनी दस्तावेज (PDF अथवा फोटो) चुनें।', 'error');
        return;
    }

    state.currentCaseId = caseId;

    // UI Loading state
    const submitBtn = document.getElementById('btn-analyze-doc');
    const loadingBox = document.getElementById('analysis-loading-box');
    const resultsBox = document.getElementById('analysis-results-box');

    submitBtn.disabled = true;
    loadingBox.style.display = 'flex';
    resultsBox.style.display = 'none';

    // Step bullets animation
    animateLoadingSteps();

    const formData = new FormData();
    formData.append('file', state.selectedFile);
    formData.append('language', state.selectedLanguage);
    if (state.customApiKey) {
        formData.append('custom_api_key', state.customApiKey);
    }

    try {
        const response = await fetch('/api/explain', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'दस्तावेज का विश्लेषण असफल रहा। कृपया फाइल एवं एपीआई कुंजी की जांच करें।');
        }

        state.currentAnalysis = data;
        renderAnalysisResults(data);
        showToast('दस्तावेज का सफलतापूर्वक विश्लेषण किया गया!', 'success');
    } catch (err) {
        console.error('Analysis error:', err);
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        loadingBox.style.display = 'none';
    }
}

function animateLoadingSteps() {
    const titles = [
        "न्यायालयीन दस्तावेज का पठन एवं विश्लेषण हो रहा है...",
        "न्यायिक धाराओं, भारतीय न्याय संहिता (BNS) व सिविल प्रावधानों का परीक्षण...",
        `जनभाषा (${state.selectedLanguage}) में सरल अनुवाद एवं सारांश सृजन...`,
        "अदालत में हाजिरी एवं अंतिम तिथियों (YYYY-MM-DD) का सख्त निष्कर्षण..."
    ];
    let step = 1;
    const interval = setInterval(() => {
        if (step > 4) {
            clearInterval(interval);
            return;
        }
        document.querySelectorAll('.gov-progress-step').forEach((b, i) => {
            b.classList.toggle('active', i < step);
        });
        const titleEl = document.getElementById('loading-stage-title');
        if (titleEl) titleEl.textContent = titles[step - 1];
        step++;
    }, 1800);
}

/**
 * Render Structured AI Analysis Results (Official Dossier)
 */
function renderAnalysisResults(data) {
    const resultsBox = document.getElementById('analysis-results-box');
    const a = data.analysis;

    // Letterhead metadata
    document.getElementById('res-doc-type').textContent = a.doc_type || 'Court Summons / Notice';
    document.getElementById('res-case-number').textContent = a.case_number || 'दस्तावेज में स्पष्ट उल्लिखित नहीं';
    document.getElementById('res-court').textContent = a.court || 'दस्तावेज में स्पष्ट उल्लिखित नहीं';
    document.getElementById('res-filename').textContent = data.filename;

    // Critical Warnings
    const warningsList = document.getElementById('res-warnings-list');
    warningsList.innerHTML = (a.warnings && a.warnings.length > 0) 
        ? a.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')
        : `<li>सभी अदालती पेशियों, सम्मन जवाबों एवं अंतिम तिथियों की पुष्टि अपने अधिवक्ता अथवा कोर्ट रजिस्ट्री से अवश्य करें।</li>`;

    // Plain Language Summary
    document.getElementById('res-summary-text').textContent = a.summary || 'सारांश उपलब्ध नहीं है।';

    // Practical Meaning For Citizen
    document.getElementById('res-what-it-means-text').textContent = a.what_it_means_for_you || 'कोई स्पष्ट व्यक्तिगत प्रभाव उल्लिखित नहीं है।';

    // Actionable Next Steps
    const stepsList = document.getElementById('res-next-steps-list');
    if (a.next_steps && a.next_steps.length > 0) {
        stepsList.innerHTML = a.next_steps.map((s, idx) => `
            <div class="gov-step-item">
                <span class="step-digit">${idx + 1}</span>
                <span class="gov-step-desc">${escapeHtml(s)}</span>
            </div>
        `).join('');
    } else {
        stepsList.innerHTML = `<div class="empty-state-mini">विधिक प्रक्रियाओं हेतु किसी अधिकृत अधिवक्ता से परामर्श करें।</div>`;
    }

    // Legal Terms Decoded
    const glossaryGrid = document.getElementById('res-glossary-grid');
    if (a.glossary && a.glossary.length > 0) {
        glossaryGrid.innerHTML = a.glossary.map(g => `
            <div class="gov-glossary-item">
                <div class="gov-term-title">⚖️ ${escapeHtml(g.term)}</div>
                <div class="gov-term-desc">${escapeHtml(g.meaning)}</div>
            </div>
        `).join('');
    } else {
        glossaryGrid.innerHTML = `<div class="empty-state-mini">इस दस्तावेज में कोई जटिल पारिभाषिक शब्द नहीं पाया गया।</div>`;
    }

    // Dates Confirmation Rows (Strict YYYY-MM-DD Verification)
    const datesContainer = document.getElementById('res-dates-list-container');
    const datesBadge = document.getElementById('res-dates-count');
    const extractedDates = a.important_dates || [];
    
    datesBadge.textContent = `${extractedDates.length} तिथियां निष्कर्षित`;

    if (extractedDates.length === 0) {
        datesContainer.innerHTML = `
            <div class="empty-state-mini">
                <p>दस्तावेज में किसी विशिष्ट पेशी या समय-सीमा का उल्लेख नहीं मिला।</p>
            </div>
        `;
    } else {
        datesContainer.innerHTML = extractedDates.map((d, idx) => `
            <div class="gov-date-row" id="date-row-${idx}">
                <div>
                    <label class="gov-form-label" style="font-size: 0.76rem; color: var(--gov-gold);">पुष्ट तिथि (YYYY-MM-DD):</label>
                    <input type="date" class="gov-form-control" id="confirm-date-val-${idx}" value="${escapeHtml(d.date || '')}" required>
                </div>
                <div>
                    <label class="gov-form-label" style="font-size: 0.76rem; color: var(--gov-gold);">कार्यवाही / प्रयोजन (Purpose):</label>
                    <input type="text" class="gov-form-control" id="confirm-date-desc-${idx}" value="${escapeHtml(d.description || 'न्यायालयीन पेशी')}" required>
                    ${d.source_quote ? `<div style="font-size: 0.76rem; color: #cbd5e1; font-style: italic; margin-top: 4px;">मूल उद्धरण: "${escapeHtml(d.source_quote)}"</div>` : ''}
                </div>
                <button type="button" class="btn btn-gov-secondary btn-sm" onclick="removeExtractedDateRow(${idx})">✕</button>
            </div>
        `).join('');
    }

    resultsBox.style.display = 'flex';
    resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function removeExtractedDateRow(idx) {
    const row = document.getElementById(`date-row-${idx}`);
    if (row) row.remove();
}

/**
 * Save Analyzed Document & Verified Dates into Database
 */
async function saveDocumentAndDates() {
    if (!state.currentAnalysis || !state.currentCaseId) {
        showToast('विश्लेषण डेटा अथवा संबंधित वाद अनुपलब्ध है।', 'error');
        return;
    }

    const saveBtn = document.getElementById('btn-save-dossier');
    saveBtn.disabled = true;
    saveBtn.textContent = 'सहेजा जा रहा है...';

    const a = state.currentAnalysis.analysis;

    // Collect confirmed dates from the editor rows
    const confirmedDates = [];
    const rows = document.querySelectorAll('.gov-date-row');

    for (let row of rows) {
        const idx = row.id.replace('date-row-', '');
        const dateInput = document.getElementById(`confirm-date-val-${idx}`);
        const descInput = document.getElementById(`confirm-date-desc-${idx}`);

        if (dateInput && dateInput.value && descInput && descInput.value) {
            confirmedDates.push({
                date: dateInput.value.trim(),
                description: descInput.value.trim(),
                source_quote: a.important_dates && a.important_dates[idx] ? a.important_dates[idx].source_quote : ''
            });
        }
    }

    const payload = {
        case_id: state.currentCaseId,
        filename: state.currentAnalysis.filename,
        doc_type: a.doc_type || 'Court Document',
        case_number: a.case_number || '',
        court: a.court || '',
        summary: a.summary || '',
        what_it_means: a.what_it_means_for_you || '',
        warnings: a.warnings || [],
        next_steps: a.next_steps || [],
        glossary: a.glossary || [],
        confirmed_dates: confirmedDates
    };

    try {
        const response = await fetch('/api/save-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();
        if (!response.ok) throw new Error(resData.detail || 'दस्तावेज सहेजना असफल रहा।');

        showToast(`दस्तावेज एवं ${confirmedDates.length} पेशी तिथियां सफलतापूर्वक वाद में दर्ज हुईं!`, 'success');
        
        await loadDashboard();
        
        setTimeout(() => {
            switchTab('cases');
            openCaseDossier(state.currentCaseId);
        }, 800);
    } catch (err) {
        console.error('Error saving document:', err);
        showToast(err.message, 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<span>💾 वाद अभिलेख व कॉज लिस्ट में सुरक्षित करें (Save to Case & Calendar)</span>';
    }
}

/**
 * Cases Management View
 */
async function loadCasesView() {
    try {
        const res = await fetch('/api/cases');
        state.cases = await res.json();
        renderCasesGrid(state.cases);
    } catch (err) {
        console.error('Error loading cases:', err);
    }
}

function renderCasesGrid(cases) {
    const container = document.getElementById('cases-cards-container');
    if (!cases || cases.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>कोई पंजीकृत वाद उपलब्ध नहीं है</h3>
                <p>दस्तावेजों एवं सुनवाई तिथियों को व्यवस्थित करने हेतु अपना पहला वाद पंजीकृत करें।</p>
                <button class="btn btn-gov-primary" style="margin-top: 14px;" onclick="openNewCaseModal()">+ नया वाद पंजीयन</button>
            </div>
        `;
        return;
    }

    container.innerHTML = cases.map(c => `
        <div class="gov-case-box">
            <div>
                <div class="case-box-header">
                    <h3 class="case-box-title">${escapeHtml(c.title)}</h3>
                </div>
                <div class="case-box-meta">
                    <span class="meta-record-item">🏛️ न्यायालय: <strong>${escapeHtml(c.court)}</strong></span>
                    <span class="meta-record-item">📋 केस संख्या: <strong>${escapeHtml(c.case_number)}</strong></span>
                    <span class="meta-record-item">🕒 पंजीयन तिथि: ${new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <div class="case-box-stats">
                    <span class="gov-stat-chip">📑 <strong>${c.documents_count}</strong> दस्तावेज</span>
                    <span class="gov-stat-chip">📅 <strong>${c.pending_dates_count}</strong> लंबित पेशी</span>
                </div>
            </div>
            <div class="case-box-actions">
                <button class="btn btn-gov-secondary btn-sm" style="flex: 1;" onclick="openCaseDossier(${c.id})">📂 विवरण पत्रक (Dossier)</button>
                <button class="btn btn-gov-secondary btn-sm" onclick="quickAddDateToCase(${c.id})">+ पेशी</button>
                <button class="btn btn-gov-danger btn-sm" onclick="confirmDeleteCase(${c.id})" title="वाद हटाएं">🗑️</button>
            </div>
        </div>
    `).join('');
}

function filterCasesList() {
    const query = document.getElementById('case-search-input').value.toLowerCase().trim();
    if (!query) {
        renderCasesGrid(state.cases);
        return;
    }

    const filtered = state.cases.filter(c => 
        c.title.toLowerCase().includes(query) ||
        (c.court && c.court.toLowerCase().includes(query)) ||
        (c.case_number && c.case_number.toLowerCase().includes(query))
    );
    renderCasesGrid(filtered);
}

/**
 * Case Dossier Detail Modal
 */
async function openCaseDossier(caseId) {
    try {
        const res = await fetch(`/api/cases/${caseId}`);
        const c = await res.json();

        document.getElementById('dossier-case-title').textContent = c.title;
        document.getElementById('dossier-case-meta').textContent = `न्यायालय: ${c.court} | वाद संख्या: ${c.case_number}`;
        document.getElementById('dossier-doc-count').textContent = c.documents.length;
        document.getElementById('dossier-dates-count').textContent = c.dates.length;

        // Delete hook
        const delBtn = document.getElementById('btn-delete-case-action');
        delBtn.onclick = () => {
            closeModal('modal-case-detail');
            confirmDeleteCase(c.id);
        };

        // Render documents tab
        const docsList = document.getElementById('dossier-docs-list');
        if (c.documents.length === 0) {
            docsList.innerHTML = `
                <div class="empty-state-mini">
                    <p>इस वाद में अभी तक कोई दस्तावेज विश्लेषित नहीं हुआ है।</p>
                    <button class="btn btn-gov-primary btn-sm" style="margin-top: 10px;" onclick="closeModal('modal-case-detail'); state.currentCaseId = ${c.id}; switchTab('explain');">दस्तावेज अपलोड करें</button>
                </div>
            `;
        } else {
            docsList.innerHTML = c.documents.map(d => `
                <div class="gov-card" style="margin-bottom: 16px; border-left: 3px solid var(--gov-gold);">
                    <div class="gov-card-header">
                        <div>
                            <span class="official-stamp-badge">${escapeHtml(d.doc_type)}</span>
                            <h4 style="margin-top: 6px; font-size: 1.05rem; color: #ffffff;">${escapeHtml(d.filename)}</h4>
                        </div>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(d.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div class="gov-card-body">
                        <p style="margin-bottom: 12px; font-size: 0.95rem; line-height: 1.6;">${escapeHtml(d.summary)}</p>
                        ${d.what_it_means ? `<div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--gov-gold); font-size: 0.88rem; margin-bottom: 12px;"><strong>नागरिक पर प्रभाव:</strong> ${escapeHtml(d.what_it_means)}</div>` : ''}
                        ${d.warnings && d.warnings.length > 0 ? `
                            <div style="background: rgba(220, 38, 38, 0.12); border: 1px solid #ef4444; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.84rem; color: #fca5a5;">
                                <strong>⚠️ वैधानिक चेतावनी:</strong> ${escapeHtml(d.warnings[0])}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }

        // Render dates tab
        const datesList = document.getElementById('dossier-dates-list');
        if (c.dates.length === 0) {
            datesList.innerHTML = `
                <div class="empty-state-mini">
                    <p>इस वाद में कोई पेशी तिथि दर्ज नहीं है।</p>
                </div>
            `;
        } else {
            datesList.innerHTML = c.dates.map(d => `
                <div class="cause-list-row ${d.status}" style="margin-bottom: 10px; padding: 14px 18px;">
                    <div>
                        <div class="h-date">${d.date}</div>
                        <div class="h-countdown ${d.status}">${d.status}</div>
                    </div>
                    <div>
                        <div class="cause-stage-title">${escapeHtml(d.description)}</div>
                        ${d.source_quote ? `<div class="cause-quote">"${escapeHtml(d.source_quote)}"</div>` : ''}
                    </div>
                    <div>
                        <button class="btn btn-sm btn-gov-secondary" onclick="toggleDateStatus(${d.id}); openCaseDossier(${caseId});">${d.is_completed ? 'पूर्ववत (Undo)' : 'सम्पन्न मार्क करें'}</button>
                    </div>
                </div>
            `).join('');
        }

        switchDossierTab('docs');
        openModal('modal-case-detail');
    } catch (err) {
        console.error('Error opening dossier:', err);
        showToast('वाद विवरण पत्रक लोड करने में त्रुटि।', 'error');
    }
}

function switchDossierTab(tab) {
    document.getElementById('dtab-docs-btn').classList.toggle('active', tab === 'docs');
    document.getElementById('dtab-dates-btn').classList.toggle('active', tab === 'dates');

    document.getElementById('dossier-docs-panel').style.display = tab === 'docs' ? 'block' : 'none';
    document.getElementById('dossier-dates-panel').style.display = tab === 'dates' ? 'block' : 'none';
}

function quickAddDateToCase(caseId) {
    openManualDateModal();
    document.getElementById('manual-date-case').value = caseId;
}

async function confirmDeleteCase(caseId) {
    if (!confirm('क्या आप सुनिश्चित हैं कि आप इस वाद एवं इसके समस्त दस्तावेजों और तिथियों को हटाना चाहते हैं?')) {
        return;
    }

    try {
        const res = await fetch(`/api/cases/${caseId}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('वाद हटा दिया गया।', 'info');
            await loadCasesView();
            await loadDashboard();
            await loadCasesDropdown();
        }
    } catch (err) {
        showToast('वाद हटाने में त्रुटि।', 'error');
    }
}

/**
 * Daily Cause List & Hearing Dates
 */
async function loadDatesTimeline() {
    try {
        const res = await fetch(`/api/dates?status=${state.datesFilter}`);
        state.dates = await res.json();
        renderDatesTimeline(state.dates);
    } catch (err) {
        console.error('Error loading dates timeline:', err);
    }
}

function filterDates(filter) {
    state.datesFilter = filter;
    document.querySelectorAll('.gov-filter-pill').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-filter') === filter);
    });
    loadDatesTimeline();
}

function renderDatesTimeline(dates) {
    const container = document.getElementById('dates-timeline-container');
    if (!dates || dates.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>कोई पेशी तिथि दर्ज नहीं है</h3>
                <p>दस्तावेज विश्लेषण द्वारा स्वतः निकाली गई अथवा मैनुअल जोड़ी गई समस्त तिथियां यहां दिखाई देंगी।</p>
                <button class="btn btn-gov-primary" style="margin-top: 14px;" onclick="openManualDateModal()">+ पेशी तिथि जोड़ें</button>
            </div>
        `;
        return;
    }

    container.innerHTML = dates.map(d => {
        let badgeClass = 'upcoming';
        let countdownText = `${d.days_diff} दिन शेष`;

        if (d.is_completed) {
            badgeClass = 'done';
            countdownText = '✓ सम्पन्न (Done)';
        } else if (d.status === 'overdue') {
            badgeClass = 'overdue';
            countdownText = `🔴 अतिदेय (${Math.abs(d.days_diff)} दिन पूर्व)`;
        } else if (d.status === 'urgent') {
            badgeClass = 'urgent';
            countdownText = `⚠️ अत्यावश्यक (${d.days_diff} दिन शेष!)`;
        }

        return `
            <div class="cause-list-row ${d.status}">
                <div class="hearing-date-badge">
                    <span class="h-date">${d.date}</span>
                    <span class="h-countdown ${badgeClass}">${countdownText}</span>
                </div>
                <div class="cause-details">
                    <span class="cause-case-ref">🏛️ ${escapeHtml(d.case_title)} ${d.case_number ? `(${escapeHtml(d.case_number)})` : ''}</span>
                    <h4 class="cause-stage-title">${escapeHtml(d.description)}</h4>
                    ${d.source_quote ? `<span class="cause-quote">उद्धरण: "${escapeHtml(d.source_quote)}"</span>` : ''}
                </div>
                <div class="cause-actions">
                    <button class="btn btn-sm ${d.is_completed ? 'btn-gov-secondary' : 'btn-gov-success'}" onclick="toggleDateStatus(${d.id})">
                        ${d.is_completed ? '↩️ पूर्ववत' : '✓ सम्पन्न मार्क करें'}
                    </button>
                    <button class="btn btn-sm btn-gov-secondary" onclick="deleteDateItem(${d.id})" title="हटाएं">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

async function toggleDateStatus(dateId) {
    try {
        const res = await fetch(`/api/dates/${dateId}/toggle`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message === 'Marked as completed' ? 'सम्पन्न के रूप में चिह्नित किया गया' : 'लंबित के रूप में चिह्नित किया गया', 'success');
        await loadDatesTimeline();
        await loadDashboard();
    } catch (err) {
        showToast('स्थिति अद्यतन में त्रुटि।', 'error');
    }
}

async function deleteDateItem(dateId) {
    if (!confirm('क्या आप इस तिथि को अपनी वाद सूची से हटाना चाहते हैं?')) return;
    try {
        await fetch(`/api/dates/${dateId}`, { method: 'DELETE' });
        showToast('तिथि हटा दी गई।', 'info');
        await loadDatesTimeline();
        await loadDashboard();
    } catch (err) {
        showToast('त्रुटि।', 'error');
    }
}

/**
 * Handle Creating a New Case
 */
async function handleCreateCase(event) {
    event.preventDefault();
    const titleInput = document.getElementById('new-case-title');
    const caseNumInput = document.getElementById('new-case-number');
    const courtInput = document.getElementById('new-case-court');

    const payload = {
        title: titleInput.value.trim(),
        case_number: caseNumInput.value.trim(),
        court: courtInput.value.trim()
    };

    try {
        const res = await fetch('/api/cases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'वाद पंजीयन असफल');

        showToast('नया वाद सफलतापूर्वक पंजीकृत हुआ!', 'success');
        closeModal('modal-new-case');

        // Reset form
        titleInput.value = '';
        caseNumInput.value = '';
        courtInput.value = '';

        await loadCasesDropdown();
        await loadDashboard();
        if (state.currentTab === 'cases') loadCasesView();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * Handle Manual Date Creation
 */
async function handleManualDateSubmit(event) {
    event.preventDefault();
    const caseId = parseInt(document.getElementById('manual-date-case').value);
    const dateVal = document.getElementById('manual-date-val').value;
    const descVal = document.getElementById('manual-date-desc').value;
    const notesVal = document.getElementById('manual-date-notes').value;

    const payload = {
        case_id: caseId,
        date: dateVal,
        description: descVal,
        source_quote: notesVal
    };

    try {
        const res = await fetch('/api/dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'तिथि जोड़ना असफल रहा');

        showToast('पेशी तिथि दैनिक वाद सूची में जोड़ी गई!', 'success');
        closeModal('modal-manual-date');

        document.getElementById('manual-date-desc').value = '';
        document.getElementById('manual-date-notes').value = '';

        await loadDatesTimeline();
        await loadDashboard();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * Legal Glossary Guide Render & Filter
 */
function renderGlossaryGuide(items) {
    const container = document.getElementById('glossary-guide-container');
    if (!items || items.length === 0) {
        container.innerHTML = `<div class="empty-state-mini">कोई शब्द नहीं मिला।</div>`;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="gov-glossary-item">
            <div class="gov-term-title">⚖️ ${escapeHtml(item.term)}</div>
            <div class="gov-term-desc">${escapeHtml(item.meaning)}</div>
        </div>
    `).join('');
}

function filterGlossaryGuide() {
    const q = document.getElementById('glossary-search-input').value.toLowerCase().trim();
    if (!q) {
        renderGlossaryGuide(LEGAL_GLOSSARY_DATABASE);
        return;
    }

    const filtered = LEGAL_GLOSSARY_DATABASE.filter(i => 
        i.term.toLowerCase().includes(q) || i.meaning.toLowerCase().includes(q)
    );
    renderGlossaryGuide(filtered);
}

/**
 * Modal Handling Helpers
 */
function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'flex';
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}

function openNewCaseModal() {
    openModal('modal-new-case');
}

function openManualDateModal() {
    loadCasesDropdown();
    openModal('modal-manual-date');
}

function openApiKeyModal() {
    const statusText = document.getElementById('modal-key-status-text');
    const input = document.getElementById('custom-gemini-key');

    if (state.hasApiKey) {
        statusText.innerHTML = '✅ सक्रिय जेमिनी एपीआई कुंजी पाई गई (पर्यावरण चर अथवा लोकल स्टोरेज द्वारा)।';
    } else {
        statusText.innerHTML = '⚠️ कोई एपीआई कुंजी नहीं मिली। दस्तावेज विश्लेषण सक्रिय करने हेतु नीचे अपनी कुंजी दर्ज करें।';
    }

    input.value = state.customApiKey || '';
    openModal('modal-api-key');
}

function saveCustomApiKey() {
    const key = document.getElementById('custom-gemini-key').value.trim();
    state.customApiKey = key;
    localStorage.setItem('casesaathi_gemini_api_key', key);
    state.hasApiKey = !!key;
    checkConfig();
    showToast(key ? 'कस्टम जेमिनी एपीआई कुंजी सहेजी गई!' : 'कुंजी हटा दी गई।', 'success');
    closeModal('modal-api-key');
}

/**
 * Settings Modal — Open, Tab Switching, Language Selection
 */
function openSettingsModal(tab) {
    // Sync AI key status into settings panel
    const keyStatusText = document.getElementById('settings-key-status-text');
    if (keyStatusText) {
        if (state.hasApiKey) {
            keyStatusText.innerHTML = '✅ सक्रिय जेमिनी एपीआई कुंजी पाई गई।';
        } else {
            keyStatusText.innerHTML = '⚠️ कोई एपीआई कुंजी नहीं मिली। नीचे दर्ज करें।';
        }
    }
    const keyInput = document.getElementById('settings-gemini-key');
    if (keyInput) keyInput.value = state.customApiKey || '';

    // Sync language card active state
    refreshLangCards();

    openModal('modal-portal-settings');

    // Navigate to requested tab if passed
    if (tab) switchSettingsTab(tab);
    else switchSettingsTab('lang');
}

function switchSettingsTab(tab) {
    const panels = ['lang', 'disp', 'ai'];
    panels.forEach(p => {
        const panel = document.getElementById(`settings-${p}-panel`);
        const btn = document.getElementById(`stab-${p}-btn`);
        if (panel) panel.style.display = (p === tab) ? '' : 'none';
        if (btn) btn.classList.toggle('active', p === tab);
    });
}

function refreshLangCards() {
    const langs = ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Bengali',
                   'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Odia', 'Urdu'];
    langs.forEach(lang => {
        const card = document.getElementById(`lcard-${lang}`);
        if (card) card.classList.toggle('active', state.selectedLanguage === lang);
    });
    // Sync quick dropdown at top bar
    const qdrop = document.getElementById('top-quick-language-select');
    if (qdrop) {
        // If the selected language exists as an option, select it
        const opt = Array.from(qdrop.options).find(o => o.value === state.selectedLanguage);
        if (opt) qdrop.value = state.selectedLanguage;
    }
}

/**
 * Portal Language Switcher
 * Called from both top-bar dropdown and settings modal language cards.
 */
function setPortalLanguage(lang) {
    if (!lang) return;
    state.selectedLanguage = lang;
    localStorage.setItem('casesaathi_portal_language', lang);

    // Refresh active state on all language cards
    refreshLangCards();

    // Update UI labels to reflect chosen language
    applyLanguageLabels(lang);

    showToast(`भाषा बदली गई: ${lang} | Language set to: ${lang}`, 'success');
}

// Restore saved language on load (defaults to English)
function restoreLanguage() {
    const saved = localStorage.getItem('casesaathi_portal_language') || 'English';
    state.selectedLanguage = saved;
    refreshLangCards();
    applyLanguageLabels(saved);
}

// UI label translations for top-level interface elements
const UI_LABELS = {
    Hindi: {
        settingsBtn: 'सेटिंग्स (Settings)',
        newCaseBtn: 'नया वाद दर्ज करें (+ New Case)',
        analysisSectionTitle: 'न्यायिक दस्तावेज विश्लेषण (Document Analysis)',
        analysisSectionSubtitle: 'कृत्रिम बुद्धिमत्ता आपके दस्तावेज को सरल भाषा में समझाएगी',
        analyzeBtn: 'दस्तावेज विश्लेषण प्रारंभ करें',
        langLabel: 'चयनित भाषा',
    },
    English: {
        settingsBtn: 'Settings',
        newCaseBtn: '+ New Case',
        analysisSectionTitle: 'Legal Document Analysis',
        analysisSectionSubtitle: 'AI will explain your court document in plain language',
        analyzeBtn: 'Analyze Document',
        langLabel: 'Selected Language',
    },
    Tamil: {
        settingsBtn: 'அமைப்புகள் (Settings)',
        newCaseBtn: '+ புதிய வழக்கு (New Case)',
        analysisSectionTitle: 'சட்ட ஆவண பகுப்பாய்வு',
        analysisSectionSubtitle: 'AI உங்கள் நீதிமன்ற ஆவணத்தை எளிய மொழியில் விளக்கும்',
        analyzeBtn: 'ஆவணத்தை பகுப்பாய்வு செய்',
        langLabel: 'தேர்ந்தெடுக்கப்பட்ட மொழி',
    },
    Telugu: {
        settingsBtn: 'సెట్టింగ్లు (Settings)',
        newCaseBtn: '+ కొత్త కేసు (New Case)',
        analysisSectionTitle: 'న్యాయ పత్రం విశ్లేషణ',
        analysisSectionSubtitle: 'AI మీ కోర్టు పత్రాన్ని సాధారణ భాషలో వివరిస్తుంది',
        analyzeBtn: 'పత్రాన్ని విశ్లేషించు',
        langLabel: 'ఎంచుకున్న భాష',
    },
    Marathi: {
        settingsBtn: 'सेटिंग्ज (Settings)',
        newCaseBtn: '+ नवीन खटला (New Case)',
        analysisSectionTitle: 'न्यायालयीन दस्तऐवज विश्लेषण',
        analysisSectionSubtitle: 'AI तुमच्या कोर्ट दस्तऐवजाचे सोप्या भाषेत स्पष्टीकरण देईल',
        analyzeBtn: 'दस्तऐवज विश्लेषण करा',
        langLabel: 'निवडलेली भाषा',
    },
    Bengali: {
        settingsBtn: 'সেটিংস (Settings)',
        newCaseBtn: '+ নতুন মামলা (New Case)',
        analysisSectionTitle: 'আইনি দলিল বিশ্লেষণ',
        analysisSectionSubtitle: 'AI আপনার আদালতের দলিল সহজ ভাষায় ব্যাখ্যা করবে',
        analyzeBtn: 'দলিল বিশ্লেষণ করুন',
        langLabel: 'নির্বাচিত ভাষা',
    },
    Gujarati: {
        settingsBtn: 'સેટિંગ્સ (Settings)',
        newCaseBtn: '+ નવો કેસ (New Case)',
        analysisSectionTitle: 'કાનૂની દસ્તાવેજ વિશ્લેષણ',
        analysisSectionSubtitle: 'AI તમારા કોર્ટ દસ્તાવેજને સરળ ભાષામાં સમજાવશે',
        analyzeBtn: 'દસ્તાવેજ વિશ્લેષણ કરો',
        langLabel: 'પસંદ કરેલ ભાષા',
    },
    Kannada: {
        settingsBtn: 'ಸೆಟ್ಟಿಂಗ್‌ಗಳು (Settings)',
        newCaseBtn: '+ ಹೊಸ ಪ್ರಕರಣ (New Case)',
        analysisSectionTitle: 'ಕಾನೂನು ದಾಖಲೆ ವಿಶ್ಲೇಷಣೆ',
        analysisSectionSubtitle: 'AI ನಿಮ್ಮ ನ್ಯಾಯಾಲಯ ದಾಖಲೆಯನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ವಿವರಿಸುತ್ತದೆ',
        analyzeBtn: 'ದಾಖಲೆ ವಿಶ್ಲೇಷಿಸಿ',
        langLabel: 'ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆ',
    },
    Malayalam: {
        settingsBtn: 'ക്രമീകരണങ്ങൾ (Settings)',
        newCaseBtn: '+ പുതിയ കേസ് (New Case)',
        analysisSectionTitle: 'നിയമ രേഖ വിശകലനം',
        analysisSectionSubtitle: 'AI നിങ്ങളുടെ കോടതി രേഖ ലളിത ഭാഷയിൽ വ്യാഖ്യാനിക്കും',
        analyzeBtn: 'രേഖ വിശകലനം ചെയ്യുക',
        langLabel: 'തിരഞ്ഞെടുത്ത ഭാഷ',
    },
    Punjabi: {
        settingsBtn: 'ਸੈਟਿੰਗਾਂ (Settings)',
        newCaseBtn: '+ ਨਵਾਂ ਕੇਸ (New Case)',
        analysisSectionTitle: 'ਕਾਨੂੰਨੀ ਦਸਤਾਵੇਜ਼ ਵਿਸ਼ਲੇਸ਼ਣ',
        analysisSectionSubtitle: 'AI ਤੁਹਾਡੇ ਕੋਰਟ ਦਸਤਾਵੇਜ਼ ਨੂੰ ਸਰਲ ਭਾਸ਼ਾ ਵਿੱਚ ਦੱਸੇਗਾ',
        analyzeBtn: 'ਦਸਤਾਵੇਜ਼ ਵਿਸ਼ਲੇਸ਼ਣ ਕਰੋ',
        langLabel: 'ਚੁਣੀ ਭਾਸ਼ਾ',
    },
    Odia: {
        settingsBtn: 'ସେଟିଂ (Settings)',
        newCaseBtn: '+ ନୂଆ ମକଦ୍ଦମା (New Case)',
        analysisSectionTitle: 'ଆଇନ ଦଲିଲ ବିଶ୍ଳେଷଣ',
        analysisSectionSubtitle: 'AI ଆପଣଙ୍କ ଅଦାଲତ ଦଲିଲ ସରଳ ଭାଷାରେ ବୁଝାଇବ',
        analyzeBtn: 'ଦଲିଲ ବିଶ୍ଳେଷଣ କରନ୍ତୁ',
        langLabel: 'ଚୟନ କରାଯାଇଥିବା ଭାଷା',
    },
    Urdu: {
        settingsBtn: 'ترتیبات (Settings)',
        newCaseBtn: '+ نیا مقدمہ (New Case)',
        analysisSectionTitle: 'قانونی دستاویز کا تجزیہ',
        analysisSectionSubtitle: 'AI آپ کی عدالتی دستاویز کو سادہ زبان میں سمجھائے گا',
        analyzeBtn: 'دستاویز کا تجزیہ کریں',
        langLabel: 'منتخب زبان',
    },
};

function applyLanguageLabels(lang) {
    const labels = UI_LABELS[lang] || UI_LABELS['Hindi'];

    // Settings button label
    const settingsLbl = document.getElementById('lbl-settings-btn');
    if (settingsLbl) settingsLbl.textContent = labels.settingsBtn;

    // New case button label
    const newCaseLbl = document.getElementById('lbl-btn-new-case');
    if (newCaseLbl) newCaseLbl.textContent = labels.newCaseBtn;

    // Active language indicator badge
    const badge = document.getElementById('active-lang-badge');
    if (badge) badge.textContent = `🌐 ${lang}`;

    // Update document analysis language indicator
    const langIndicator = document.getElementById('current-analysis-lang');
    if (langIndicator) langIndicator.textContent = `${labels.langLabel}: ${lang}`;
}

function saveSettingsApiKey() {
    const key = document.getElementById('settings-gemini-key');
    if (!key) return;
    const val = key.value.trim();
    state.customApiKey = val;
    localStorage.setItem('casesaathi_gemini_api_key', val);
    state.hasApiKey = !!val;
    checkConfig();
    showToast(val ? 'API Key saved! AI engine active.' : 'API Key removed.', 'success');
    closeModal('modal-portal-settings');
}

function savePortalSettings() {
    // Save API key if on AI tab (key input exists and has value)
    const keyInput = document.getElementById('settings-gemini-key');
    if (keyInput && keyInput.value.trim()) {
        const val = keyInput.value.trim();
        state.customApiKey = val;
        localStorage.setItem('casesaathi_gemini_api_key', val);
        state.hasApiKey = !!val;
        checkConfig();
    }
    showToast(`प्राथमिकताएं सहेजी गईं | Preferences saved (Language: ${state.selectedLanguage})`, 'success');
    closeModal('modal-portal-settings');
}

/**
 * HTML Escaper Helper
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
