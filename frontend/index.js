const API_BASE_URL = resolveApiBaseUrl();
const API_URL = `${API_BASE_URL}/predict`;

const REQUIRED_FIELDS = [
  "Time",
  ...Array.from({ length: 28 }, (_, index) => `V${index + 1}`),
  "Amount",
];

const SAMPLE_PAYLOAD = {
  Time: 0,
  V1: -1.359807,
  V2: -0.072781,
  V3: 2.536347,
  V4: 1.378155,
  V5: -0.338321,
  V6: 0.462388,
  V7: 0.239599,
  V8: 0.098698,
  V9: 0.363787,
  V10: 0.090794,
  V11: -0.5516,
  V12: -0.617801,
  V13: -0.99139,
  V14: -0.311169,
  V15: 1.468177,
  V16: -0.470401,
  V17: 0.207971,
  V18: 0.025791,
  V19: 0.403993,
  V20: 0.251412,
  V21: -0.018307,
  V22: 0.277838,
  V23: -0.110474,
  V24: 0.066928,
  V25: 0.128539,
  V26: -0.189115,
  V27: 0.133558,
  V28: -0.021053,
  Amount: 149.62,
};

const jsonInput = document.querySelector("#jsonInput");
const sampleButton = document.querySelector("#sampleButton");
const predictButton = document.querySelector("#predictButton");
const formatButton = document.querySelector("#formatButton");
const fileInput = document.querySelector("#fileInput");
const statusMessage = document.querySelector("#statusMessage");
const resultState = document.querySelector("#resultState");
const fieldList = document.querySelector("#fieldList");

fieldList.innerHTML = REQUIRED_FIELDS
  .map((field) => `<span class="field-chip">${field}</span>`)
  .join("");

jsonInput.value = JSON.stringify(SAMPLE_PAYLOAD, null, 2);

sampleButton.addEventListener("click", () => {
  jsonInput.value = JSON.stringify(SAMPLE_PAYLOAD, null, 2);
  setStatus("Sample JSON loaded.", "success");
});

formatButton.addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonInput.value = JSON.stringify(parsed, null, 2);
    setStatus("JSON formatted.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

fileInput.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    jsonInput.value = JSON.stringify(parsed, null, 2);
    setStatus(`${file.name} loaded successfully.`, "success");
  } catch (error) {
    setStatus(`Could not read JSON file: ${error.message}`, "error");
  } finally {
    fileInput.value = "";
  }
});

predictButton.addEventListener("click", async () => {
  let payload;

  try {
    payload = JSON.parse(jsonInput.value);
  } catch (error) {
    setStatus(`Invalid JSON: ${error.message}`, "error");
    return;
  }

  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    setStatus(validationMessage, "error");
    return;
  }

  setStatus("Calling backend for prediction...", "");
  predictButton.disabled = true;
  predictButton.textContent = "Predicting...";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const message = data?.detail || "Prediction request failed.";
      throw new Error(message);
    }

    renderResult(data);
    setStatus("Prediction completed.", "success");
  } catch (error) {
    renderError(error.message);
    setStatus(error.message, "error");
  } finally {
    predictButton.disabled = false;
    predictButton.textContent = "Predict";
  }
});

function validatePayload(payload) {
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return "The payload must be one JSON object, not an array.";
  }

  const missingFields = REQUIRED_FIELDS.filter((field) => !(field in payload));
  if (missingFields.length) {
    return `Missing fields: ${missingFields.join(", ")}`;
  }

  const invalidFields = REQUIRED_FIELDS.filter(
    (field) => typeof payload[field] !== "number" || Number.isNaN(payload[field]),
  );

  if (invalidFields.length) {
    return `These fields must be numbers: ${invalidFields.join(", ")}`;
  }

  return "";
}

function renderResult(data) {
  const labelClass = data.prediction === 1 ? "fraud" : "normal";
  const heading = data.prediction === 1 ? "Fraud detected" : "Looks normal";

  resultState.className = `result-state ${labelClass}`;
  resultState.innerHTML = `
    <span class="result-badge">${data.label}</span>
    <h3>${heading}</h3>
    <p>Prediction score returned from <code>/predict</code>.</p>
    <div class="metrics">
      <div class="metric"><span>Prediction</span><span>${data.prediction}</span></div>
      <div class="metric"><span>Fraud probability</span><span>${toPercent(data.fraud_probability)}</span></div>
      <div class="metric"><span>Normal probability</span><span>${toPercent(data.normal_probability)}</span></div>
    </div>
  `;
}

function renderError(message) {
  resultState.className = "result-state fraud";
  resultState.innerHTML = `
    <span class="result-badge">Error</span>
    <h3>Request failed</h3>
    <p>${message}</p>
  `;
}

function toPercent(value) {
  return `${(Number(value) * 100).toFixed(2)}%`;
}

function setStatus(message, tone) {
  statusMessage.textContent = message;
  statusMessage.className = "status-message";

  if (tone === "error") {
    statusMessage.classList.add("status-error");
  }

  if (tone === "success") {
    statusMessage.classList.add("status-success");
  }
}

function resolveApiBaseUrl() {
  if (window.API_BASE_URL) {
    return window.API_BASE_URL.replace(/\/$/, "");
  }

  if (window.location.protocol.startsWith("http")) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
}
