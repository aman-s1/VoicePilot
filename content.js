console.log("🎙️ VoicePilot loaded");

// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================
let lastParsedData = null;
let recognition;
let isListening = false;
let pageFieldsCache = [];

// ==========================================
// 2. INITIALIZATION & UI (ENTRY POINT)
// ==========================================
function createVoicePilotButton() {
  if (document.getElementById("voicepilot-btn")) return;

  const button = document.createElement("button");
  button.id = "voicepilot-btn";
  button.innerText = "🎙️";

  Object.assign(button.style, {
    position: "fixed",
    height: "50px",
    width: "50px",
    top: "30%",
    right: "-6px",
    transform: "translateY(-50%)",
    zIndex: "9999",
    padding: "0",
    borderRadius: "12px 0 0 12px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
    color: "#ffffff",
    fontSize: "24px",
    boxShadow: "-4px 4px 15px rgba(99, 102, 241, 0.35)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  button.onmouseenter = () => {
    button.style.transform = "translateY(-50%) translateX(-6px)";
    button.style.boxShadow = "-6px 6px 20px rgba(99, 102, 241, 0.5)";
  };
  button.onmouseleave = () => {
    button.style.transform = "translateY(-50%)";
    button.style.boxShadow = "-4px 4px 15px rgba(99, 102, 241, 0.35)";
  };

  button.addEventListener("click", () => {
    console.log("🎙️ VoicePilot activated");
    if (isListening) {
      recognition?.stop();
    } else {
      startListening();
    }
  });

  document.body.appendChild(button);
}

function showConfirmUI(data, fieldsMetadata, confidenceScores = {}) {
  document.getElementById("voicepilot-confirm")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "voicepilot-confirm";

  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(15, 23, 42, 0.6)",
    backdropFilter: "blur(8px)",
    zIndex: "10000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: "0",
    transition: "opacity 0.3s ease"
  });

  requestAnimationFrame(() => overlay.style.opacity = "1");

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    width: "400px",
    maxHeight: "80vh",
    overflowY: "auto",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "32px",
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    boxShadow: "0 20px 60px -10px rgba(0, 0, 0, 0.5)",
    transform: "translateY(20px)",
    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
  });

  requestAnimationFrame(() => modal.style.transform = "translateY(0)");

  // Helper to find label for a key
  const getLabel = (key) => {
    const field = fieldsMetadata.find(f => f.key === key);
    return field ? (field.label || key) : key;
  };

  // Helper for confidence color
  const getConfidenceStyle = (key) => {
    const score = confidenceScores[key];

    if (score >= 0.8) return "border:1px solid #22c55e;background:#f0fdf4;"; // Green (High)
    if (score >= 0.5) return "border:1px solid #eab308;background:#fefce8;"; // Yellow (Medium)
    return "border:1px solid #ef4444;background:#fef2f2;"; // Red (Low)
  };

  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div style="width:40px;height:40px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:20px">🎙️</div>
      <div>
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0f172a">Confirm Details</h3>
        <p style="margin:0;font-size:13px;color:#64748b">Review what VoicePilot heard</p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px">
      ${Object.entries(data)
        .filter(([_, value]) => value && value.trim() !== "")
        .map(
        ([key, value]) => `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <label style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8">${getLabel(key)}</label>
              ${confidenceScores[key] !== undefined ? 
                `<span style="font-size:10px;font-weight:500;color:#64748b;background:#f1f5f9;padding:2px 6px;border-radius:4px">${Math.round(confidenceScores[key] * 100)}%</span>` 
                : ''}
            </div>
            <input 
              data-key="${key}" 
              value="${value}" 
              style="width:100%;padding:12px;font-size:14px;color:#0f172a;border-radius:12px;outline:none;transition:all 0.2s;${getConfidenceStyle(key)}"
              onfocus="this.style.filter='brightness(0.95)';this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'"
              onblur="this.style.filter='none';this.style.boxShadow='none'"
            />
          </div>
        `
      ).join("")}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <button id="vp-cancel" style="padding:12px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;color:#64748b;font-weight:600;font-size:14px;cursor:pointer;transition:all 0.2s">
        Discard
      </button>
      <button id="vp-confirm" style="padding:12px;border-radius:12px;border:none;background:linear-gradient(135deg, #6366f1 0%, #ec4899 100%);color:white;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 4px 12px rgba(99, 102, 241, 0.25);transition:all 0.2s">
        Fill Form
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const closeOverlay = () => {
    overlay.style.opacity = "0";
    modal.style.transform = "translateY(20px)";
    setTimeout(() => overlay.remove(), 300);
  };

  const cancelBtn = document.getElementById("vp-cancel");
  cancelBtn.onclick = closeOverlay;

  const confirmBtn = document.getElementById("vp-confirm");
  confirmBtn.onclick = () => {
    const updatedData = {};
    modal.querySelectorAll("input").forEach((input) => {
      updatedData[input.dataset.key] = input.value;
    });

    closeOverlay();
    fillFormsFromData(updatedData);
  };
}

// ==========================================
// 3. PAGE SCANNING & FIELD EXTRACTION
// ==========================================
function scanPageFields() {
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
  const fields = [];

  inputs.forEach((input) => {
    // Skip hidden, submit, buttons, etc.
    if (input.type === "hidden" || input.type === "submit" || input.type === "button" || input.type === "image" || input.style.display === "none") {
      return;
    }

    const key = input.id || input.name;
    if (!key) return; // Cannot map without a key

    let label = "";

    // 1. Try <label for="id">
    if (input.id) {
      const explicitLabel = document.querySelector(`label[for="${input.id}"]`);
      if (explicitLabel) label = explicitLabel.innerText;
    }

    // 2. Try wrapping <label>
    if (!label) {
      const parentLabel = input.closest("label");
      if (parentLabel) label = parentLabel.innerText.replace(input.value, ''); // Remove input value from text if present
    }

    // 3. Try aria-label or placeholder
    if (!label) label = input.getAttribute("aria-label") || input.placeholder;

    // 4. Fallback to name/id
    if (!label) label = key;

    fields.push({
      key: key,
      label: label.trim(),
      type: input.tagName.toLowerCase() === "select" ? "select" : (input.type || "text")
    });
  });

  console.log("🔎 Scanned Page Fields:", fields);
  return fields;
}

// ==========================================
// 4. CORE LOGIC (SPEECH & API)
// ==========================================
function startListening() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech recognition not supported");
    return;
  }

  // Scan fields fresh every time we start listening
  pageFieldsCache = scanPageFields();
  if (pageFieldsCache.length === 0) {
    alert("No visible form fields found on this page.");
    return;
  }

  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isListening = true;
    console.log("🎧 Listening...");
  };

  recognition.onresult = async (event) => {
    const rawTranscript = event.results[0][0].transcript;
    // Basic normalization for cleaner API input, but trust API mostly
    const normalizedTranscript = rawTranscript.trim(); 

    console.log("🗣️ Transcript:", normalizedTranscript);

    try {
      const apiResult = await interpertApiCall(normalizedTranscript, pageFieldsCache);
      
      if (apiResult && apiResult.data && Object.keys(apiResult.data).length > 0) {
        console.log("🤖 AI Parsed data:", apiResult.data);
        console.log("📊 Confidence scores:", apiResult.confidence);

        // Filter out fields with 0 confidence
        const filteredData = {};
        const confidence = apiResult.confidence || {};
        
        Object.keys(apiResult.data).forEach(key => {
          if (confidence[key] !== undefined && confidence[key] > 0) {
             filteredData[key] = apiResult.data[key];
          } else if (confidence[key] === undefined) {
             // Keep fields without confidence score (fallback)
             filteredData[key] = apiResult.data[key];
          }
        });

        lastParsedData = filteredData;
        showConfirmUI(filteredData, pageFieldsCache, confidence);
      } else {
        console.warn("⚠️ No data extracted from speech.");
      }
    } catch (err) {
      console.error("❌ API Failed:", err);
      alert("Failed to process speech. Check console.");
    }
  };

  recognition.onerror = (e) => console.error("Speech Error", e);
  recognition.onend = () => { isListening = false; console.log("🛑 Stopped"); };

  recognition.start();
}

async function interpertApiCall(speech, fields) {
  const response = await fetch("https://autumn-pine-0c2b.voicepilot.workers.dev/api/interpret-form", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ speech, fields }),
  });

  const data = await response.json();
  console.log("📡 API Response:", data);
  return data;
}

function fillFormsFromData(data) {
  // Data keys match element IDs or Names directly now
  Object.entries(data).forEach(([key, value]) => {
    let element = document.getElementById(key);
    
    // If ID lookup fails, try Name
    if (!element) {
      const elementsByName = document.getElementsByName(key);
      if (elementsByName.length > 0) element = elementsByName[0];
    }

    if (element) {
      element.value = value;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      // Highlight effect
      element.style.transition = "background-color 0.5s";
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "#e0e7ff"; // Light indigo
      setTimeout(() => element.style.backgroundColor = originalBg, 1500);
    }
  });
}

// ==========================================
// 5. BOOTSTRAP
// ==========================================
window.addEventListener("load", createVoicePilotButton);
