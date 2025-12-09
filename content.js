console.log("🎙️ VoicePilot loaded");

// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================
let lastParsedData = null;
let recognition;
let isListening = false;

const FIELD_KEYWORDS = {
  email: ["email", "mail", "gmail"],
  phone: ["phone", "mobile", "number"],
  company: ["company", "organization", "org"],
  job: ["job", "role", "title", "position"],
  subject: ["subject", "topic", "regarding"],
  firstname: ["firstname", "first"],
  lastname: ["lastname", "last", "surname"],
  name: ["name"],
  message: ["message", "about", "description"]
};


function cleanTokenValue(field, value) {
  if (field === "email") {
    return value
      .replace(/\s+at\s+| at /g, "@")
      .replace(/\s+dot\s+| dot /g, ".")
      .replace(/\s/g, "")
      .toLowerCase();
  }

  if (field === "phone") {
    return value.replace(/\D/g, "");
  }

  // Restore capitalization
  if (field === "message") {
    return toSentenceCase(value);
  }
  
  return toTitleCase(value);
}

function tokenizeTranscript(text) {
  const words = text.split(" ");
  const tokens = [];

  let currentField = null;
  let buffer = [];

  words.forEach((word) => {
    // Smart skipping: If we are capturing first/last name, ignore the word 'name'
    // This allows "First Name Aman" -> captures "Aman" under firstname
    if (word === "name" && ["firstname", "lastname"].includes(currentField)) {
        return; 
    }

    const matchedField = Object.keys(FIELD_KEYWORDS)
      .find((field) => FIELD_KEYWORDS[field].includes(word));

    if (matchedField) {
      // If switching fields, save the previous one
      if (currentField) {
        tokens.push({ field: currentField, value: buffer.join(" ") });
      }
      currentField = matchedField;
      buffer = [];
    } else if (currentField) {
      buffer.push(word);
    }
  });

  if (currentField && buffer.length) {
    tokens.push({ field: currentField, value: buffer.join(" ") });
  }

  return tokens;
}

function parseTranscript(normalized, raw) {
  const tokens = tokenizeTranscript(normalized);
  const result = {};

  tokens.forEach(({ field, value }) => {
    // Basic cleanup and capitalization
    result[field] = cleanTokenValue(field, value);
  });

  // Handle name splitting if generic 'name' was used (e.g. "My name is Aman Suhag")
  if (result.name) {
    const parts = result.name.split(" ");
    if (parts.length > 0) {
        if (!result.firstname) result.firstname = parts[0];
        if (!result.lastname && parts.length > 1) {
            result.lastname = parts.slice(1).join(" ");
        }
    }
    // Remove generic name field so it doesn't show up in Confirmation UI
    delete result.name;
  }

  return result;
}


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
    top: "50%",
    right: "0",
    transform: "translateY(-50%)",
    zIndex: "9999",
    padding: "0", // Explicitly remove padding for perfect centering
    borderRadius: "12px 0 0 12px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
    color: "#ffffff",
    fontSize: "24px", // Slightly larger icon
    boxShadow: "-4px 4px 15px rgba(99, 102, 241, 0.35)",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  });

  button.onmouseenter = () => {
    button.style.transform = "translateY(-50%) translateX(-4px)";
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

function showConfirmUI(data) {
  // Remove if already exists
  document.getElementById("voicepilot-confirm")?.remove();

  const overlay = document.createElement("div");
  overlay.id = "voicepilot-confirm";

  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    background: "rgba(15, 23, 42, 0.6)", // Darker, tinted overlay
    backdropFilter: "blur(8px)", // Glassmorphism blur
    zIndex: "10000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: "0",
    transition: "opacity 0.3s ease"
  });

  // Fade in animation
  requestAnimationFrame(() => overlay.style.opacity = "1");

  const modal = document.createElement("div");
  Object.assign(modal.style, {
    width: "400px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "32px",
    fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
    boxShadow: "0 20px 60px -10px rgba(0, 0, 0, 0.5)",
    transform: "translateY(20px)",
    transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
  });

  // Slide up animation
  requestAnimationFrame(() => modal.style.transform = "translateY(0)");

  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <div style="width:40px;height:40px;border-radius:12px;background:#f3f4f6;display:flex;align-items:center;justify-content:center;font-size:20px">🎙️</div>
      <div>
        <h3 style="margin:0;font-size:18px;font-weight:700;color:#0f172a">Confirm Details</h3>
        <p style="margin:0;font-size:13px;color:#64748b">Review what VoicePilot heard</p>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:24px">
      ${Object.entries(data).map(
        ([key, value]) => {
          const labelMap = {
            firstname: "First Name",
            lastname: "Last Name",
            email: "Email Address",
            phone: "Phone Number",
            job: "Job Title",
            company: "Company Name",
            message: "Message",
            subject: "Subject"
          };
          const label = labelMap[key] || key;
          
          return `
          <div>
            <label style="display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;margin-bottom:6px">${label}</label>
            <input 
              data-key="${key}" 
              value="${value}" 
              style="width:100%;padding:12px;font-size:14px;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;outline:none;transition:all 0.2s"
              onfocus="this.style.borderColor='#6366f1';this.style.background='#ffffff';this.style.boxShadow='0 0 0 4px rgba(99, 102, 241, 0.1)'"
              onblur="this.style.borderColor='#e2e8f0';this.style.background='#f8fafc';this.style.boxShadow='none'"
            />
          </div>
        `;
        }
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

  // Add hover effects via JS since we're using inline styles
  const cancelBtn = document.getElementById("vp-cancel");
  cancelBtn.onmouseenter = () => { cancelBtn.style.background = "#f8fafc"; cancelBtn.style.color = "#0f172a"; };
  cancelBtn.onmouseleave = () => { cancelBtn.style.background = "#ffffff"; cancelBtn.style.color = "#64748b"; };
  cancelBtn.onclick = closeOverlay;

  const confirmBtn = document.getElementById("vp-confirm");
  confirmBtn.onmouseenter = () => { confirmBtn.style.transform = "translateY(-1px)"; confirmBtn.style.boxShadow = "0 6px 20px rgba(99, 102, 241, 0.4)"; };
  confirmBtn.onmouseleave = () => { confirmBtn.style.transform = "translateY(0)"; confirmBtn.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.25)"; };

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
// 3. CORE LOGIC (SPEECH RECOGNITION)
// ==========================================
function startListening() {
  if (!("webkitSpeechRecognition" in window)) {
    alert("Speech recognition not supported in this browser");
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

  recognition.onresult = (event) => {
    const rawTranscript = event.results[0][0].transcript;
    const normalizedTranscript = normalizeTranscript(rawTranscript);

    const parsedData = parseTranscript(normalizedTranscript, rawTranscript);
    console.log("🧠 Parsed data:", parsedData);

    lastParsedData = parsedData;
    showConfirmUI(parsedData);
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
  };

  recognition.onend = () => {
    isListening = false;
    console.log("🛑 Listening stopped");
  };

  recognition.start();
}

function normalizeTranscript(transcript) {
  let text = transcript.toLowerCase();

  // 1. Handle "at the rate" FIRST (most specific)
  text = text.replace(/\bat\s+the\s+rate\b/g, "@");

  // 2. Handle standalone "at"
  text = text.replace(/\bat\b/g, "@");

  // 3. Handle dot
  text = text.replace(/\bdot\b/g, ".");

  // 4. Other symbols
  text = text.replace(/\bunderscore\b/g, "_");
  text = text.replace(/\bdash\b/g, "-");

  // 5. Remove spaces around email symbols
  text = text.replace(/\s*@\s*/g, "@");
  text = text.replace(/\s*\.\s*/g, ".");

  // 6. Phone numbers: merge spaced digits
  text = text.replace(/(\d)\s+(\d)/g, "$1$2");

  return text.trim();
}

function tokenizeTranscript(text) {
  const words = text.split(" ");
  const tokens = [];

  let currentField = null;
  let buffer = [];

  const FIELD_PRIORITY = [
    "firstname",
    "lastname",
    "email",
    "phone",
    "company",
    "job",
    "subject",
    "message",
    "name" // name MUST be last
  ];

  words.forEach((word, index) => {
    let matchedField = null;

    // Priority-based matching
    for (const field of FIELD_PRIORITY) {
      if (FIELD_KEYWORDS[field]?.includes(word)) {
        matchedField = field;
        break;
      }
    }

    // Skip standalone "name" if already in firstname/lastname
    if (word === "name" && ["firstname", "lastname"].includes(currentField)) {
      return;
    }

    if (matchedField) {
      if (currentField) {
        tokens.push({ field: currentField, value: buffer.join(" ") });
      }

      currentField = matchedField;
      buffer = [];
    } else if (currentField) {
      buffer.push(word);
    }
  });

  if (currentField && buffer.length) {
    tokens.push({ field: currentField, value: buffer.join(" ") });
  }

  return tokens;
}

function fillFormsFromData(data) {
  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach((input) => {
    const name = input.name?.toLowerCase() || "";
    const placeholder = input.placeholder?.toLowerCase() || "";
    const id = input.id?.toLowerCase() || "";

    if (data.firstname && (name.includes("first") || placeholder.includes("first"))) {
      input.value = data.firstname;
    }

    if (data.lastname && (name.includes("last") || placeholder.includes("last"))) {
      input.value = data.lastname;
    }

    if (data.email && name.includes("email")) {
      input.value = data.email;
    }

    if (data.phone && (name.includes("phone") || name.includes("mobile"))) {
      input.value = data.phone;
    }

    if (data.job && (name.includes("job") || name.includes("title"))) {
      input.value = data.job;
    }

    if (data.company && name.includes("company")) {
      input.value = data.company;
    }

    if (data.message && (name.includes("message") || placeholder.includes("message"))) {
      input.value = data.message;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

// ==========================================
// 4. HELPER FUNCTIONS
// ==========================================
function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map(word => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function toSentenceCase(str) {
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ==========================================
// 5. EXECUTION
// ==========================================
// Wait for page to load
window.addEventListener("load", createVoicePilotButton);
