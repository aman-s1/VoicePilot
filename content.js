console.log("🎙️ VoicePilot loaded");

function fillForms() {
  const inputs = document.querySelectorAll("input, textarea, select");

  inputs.forEach((input) => {
    const name = input.name?.toLowerCase() || "";
    const placeholder = input.placeholder?.toLowerCase() || "";
    const id = input.id?.toLowerCase() || "";

    if (name.includes("firstname") || placeholder.includes("firstname")) {
      input.value = "Aman";
    }

    if (name.includes("lastname") || placeholder.includes("lastname")) {
      input.value = "Suhag";
    }

    if (name.includes("email") || placeholder.includes("email")) {
      input.value = "aman@example.com";
    }

    if (name.includes("phone") || placeholder.includes("phone")) {
      input.value = "9876543210";
    }

    if (name.includes("job") || placeholder.includes("job") || name.includes("title")) {
      input.value = "Software Engineer";
    }

    if (name.includes("company") || placeholder.includes("company")) {
      input.value = "Google DeepMind";
    }

    if (name.includes("subject") || id.includes("subject")) {
      input.value = "general";
    }

    if (name.includes("message") || placeholder.includes("message")) {
      input.value = "Hello, I am interested in learning more about your services. Please get back to me.";
    }

    // Trigger change/input events (important!)
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}


// 👇 Create floating button
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
    fillForms();
  });

  document.body.appendChild(button);
}

// Wait for page to load
window.addEventListener("load", createVoicePilotButton);

