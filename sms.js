const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const SETTINGS = path.join(__dirname, "data", "sms-settings.json");

function loadSettings() {
  try {
    return Object.assign({
      mode: "sim",
      simGatewayUrl: "http://100.123.155.56:8080/send-sms",
      testPhone: "9666939399",
      fromSim: "6309752008",
      defaultCountry: "91",
    }, JSON.parse(fs.readFileSync(SETTINGS, "utf8")));
  } catch {
    return {
      mode: "sim",
      simGatewayUrl: "http://100.123.155.56:8080/send-sms",
      testPhone: "9666939399",
      fromSim: "6309752008",
      defaultCountry: "91",
    };
  }
}

function saveSettings(s) {
  fs.mkdirSync(path.dirname(SETTINGS), { recursive: true });
  fs.writeFileSync(SETTINGS, JSON.stringify(s, null, 2));
}

function digits(phone) {
  return String(phone || "").replace(/\D/g, "").slice(-10);
}

function request(urlStr, { method = "POST", headers = {}, body = "" } = {}) {
  return new Promise((resolve) => {
    try {
      const u = new URL(urlStr);
      const lib = u.protocol === "https:" ? https : http;
      const req = lib.request({
        hostname: u.hostname,
        port: u.port || (u.protocol === "https:" ? 443 : 80),
        path: u.pathname + u.search,
        method,
        headers,
        timeout: 10000,
      }, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve({ status: res.statusCode, body: raw }));
      });
      req.on("error", (e) => resolve({ status: 0, body: String(e.message || e) }));
      req.on("timeout", () => {
        req.destroy();
        resolve({ status: 0, body: "timeout — laptop cannot reach Android gateway" });
      });
      if (body) req.write(body);
      req.end();
    } catch (e) {
      resolve({ status: 0, body: String(e.message || e) });
    }
  });
}

async function sendViaSimGateway(phone, text, s) {
  const url = s.simGatewayUrl;
  if (!url) return { provider: "sim-missing", ok: false, detail: "No gateway URL" };
  const ten = digits(phone);
  const plus = "+91" + ten;
  const attempts = [
    { type: "json", body: { phone: ten, message: text } },
    { type: "json", body: { to: ten, message: text } },
    { type: "json", body: { number: ten, text: text } },
    { type: "json", body: { phoneNumber: plus, message: text } },
    { type: "json", body: { textMessage: { text }, phoneNumbers: [plus] } },
    { type: "form", body: { phone: ten, message: text, to: ten, text: text } },
  ];
  const notes = [];
  for (const a of attempts) {
    let payload, headers;
    if (a.type === "json") {
      payload = JSON.stringify(a.body);
      headers = { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) };
    } else {
      payload = new URLSearchParams(a.body).toString();
      headers = { "Content-Type": "application/x-www-form-urlencoded", "Content-Length": Buffer.byteLength(payload) };
    }
    if (s.simGatewayUser || s.simGatewayPass) {
      headers.Authorization = "Basic " + Buffer.from(`${s.simGatewayUser}:${s.simGatewayPass}`).toString("base64");
    }
    const r = await request(url, { headers, body: payload });
    notes.push(a.type + ":" + r.status);
    if (r.status >= 200 && r.status < 300) {
      return { provider: "android-sim", ok: true, detail: "sent via " + url + " " + String(r.body).slice(0, 120) };
    }
    if (r.status === 0) {
      return { provider: "android-sim", ok: false, detail: r.body + " — same Wi-Fi or Tailscale required; keep gateway app open" };
    }
  }
  return { provider: "android-sim", ok: false, detail: "gateway rejected payloads: " + notes.join(" | ") };
}

async function sendSms(phone, text) {
  const s = loadSettings();
  if (s.mode === "sim" && s.simGatewayUrl) return sendViaSimGateway(phone, text, s);
  return { provider: "demo-outbox", ok: true, detail: "Outbox only" };
}

module.exports = { sendSms, loadSettings, saveSettings, digits };
