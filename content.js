console.log("🎙️ VoicePilot loaded");

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


let recognition;
let isListening = false;

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
    const transcript = normalizeTranscript(rawTranscript);

    console.log("🗣️ Raw:", rawTranscript);
    console.log("🧹 Normalized:", transcript);

    const parsedData = parseTranscript(transcript, rawTranscript);
    fillFormsFromData(parsedData);
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


function parseTranscript(normalized, raw) {
  const data = {};

  const patterns = {
    firstname: /(first name|firstname|name is)\s+([a-z]+)/i,
    lastname: /(last name|lastname|surname)\s+([a-z]+)/i,
    email: /(email|mail)\s+([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
    phone: /(phone|mobile|number)\s+([\d]{8,15})/i,
    job: /(job|title|role)\s+([a-z\s]+)/i,
    company: /(company|organization|firm)\s+([a-z\s]+)/i
  };

  for (const key in patterns) {
    const match = normalized.match(patterns[key]);
    if (match) data[key] = match[2].trim();
  }

  if (/message|comment|note/i.test(raw)) {
    data.message = raw.replace(/^(message|comment|note)\s+/i, "").trim();
  }

  // Post-process capitalization
  if (data.firstname) data.firstname = toTitleCase(data.firstname);
  if (data.lastname) data.lastname = toTitleCase(data.lastname);
  if (data.job) data.job = toTitleCase(data.job);
  if (data.company) data.company = toTitleCase(data.company);

  // Free text → sentence case (keep raw meaning)
  if (data.message) data.message = toSentenceCase(data.message);

  return data;
}

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
    borderRadius: "12px 0 0 12px",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
    color: "#ffffff",
    fontSize: "20px",
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
    recognition.stop();
  } else {
    startListening();
  }
});

  document.body.appendChild(button);
}

// Wait for page to load
window.addEventListener("load", createVoicePilotButton);


// Helper functions
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


