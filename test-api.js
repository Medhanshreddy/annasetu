const http = require("http");
const fs = require("fs");
const path = require("path");
function req(pathName, { method = "GET", body, token } = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      hostname: "127.0.0.1",
      port: process.env.PORT || 8080,
      path: pathName,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(raw), raw }); }
        catch { resolve({ status: res.statusCode, json: raw, raw }); }
      });
    });
    r.on("error", reject);
    if (data) r.write(data);
    r.end();
  });
}
(async () => {
  const fails = [];
  const check = (name, ok, extra) => {
    console.log((ok ? "PASS " : "FAIL ") + name + (extra ? " — " + extra : ""));
    if (!ok) fails.push(name);
  };
  const html = await req("/");
  check("home page html", html.status === 200 && String(html.raw).includes("AnnaSetu"));
  const appjs = fs.readFileSync(path.join(__dirname, "public/app.js"), "utf8");
  check("no demo PIN sentence on login", !appjs.includes("Demo staff PIN is"));
  check("PIN placeholder not 1234", !appjs.includes('placeholder="1234"'));
  check("farmer sms outbox gone", !appjs.includes("SMS outbox"));
  check("real QR endpoint used", appjs.includes("api.qrserver.com"));
  const blocked = await req("/api/login", { method: "POST", body: { phone: "9666939399", pin: "1234" } });
  check("9666939399 cannot login", blocked.status === 401);
  const health = await req("/api/health");
  check("health", health.status === 200 && health.json.ok);
  const accounts = [
    ["farmer Ravi", "9876543210"],
    ["farmer Lakshmi", "9123456780"],
    ["farmer Suresh", "9001110001"],
    ["officer Kiran", "9002220001"],
    ["officer inactive", "9002220003"],
    ["collector RR", "9003330001"],
    ["minister", "9000000005"],
    ["centre", "9000000001"],
  ];
  const tokens = {};
  for (const [name, phone] of accounts) {
    const r = await req("/api/login", { method: "POST", body: { phone, pin: "1234" } });
    check(name + " PIN login", r.status === 200 && r.json.token, r.json && r.json.error);
    if (r.json && r.json.token) tokens[name] = r.json.token;
  }
  const otp = await req("/api/otp/request", { method: "POST", body: { phone: "9876543210" } });
  check("OTP shown for screen", otp.status === 200 && /^\d{6}$/.test(String(otp.json.otp || "")));
  if (otp.json && otp.json.otp) {
    const ver = await req("/api/otp/verify", { method: "POST", body: { phone: "9876543210", otp: otp.json.otp } });
    check("OTP verify", ver.status === 200 && ver.json.token);
  }
  const otpBlocked = await req("/api/otp/request", { method: "POST", body: { phone: "9666939399" } });
  check("OTP blocked for 9666939399", otpBlocked.status >= 400);
  const centres = await req("/api/centres");
  check("centres list", Array.isArray(centres.json) && centres.json.length >= 6);
  const ravi = tokens["farmer Ravi"];
  const mine = await req("/api/my-booking", { token: ravi });
  check("farmer token visible", mine.status === 200);
  const notes = await req("/api/notifications", { token: ravi });
  check("farmer notifications", notes.status === 200 && Array.isArray(notes.json));
  const q = await req("/api/queue/C1");
  check("live queue C1", q.status === 200 && Array.isArray(q.json));
  const live = await req("/api/live-queue", { token: tokens["officer Kiran"] });
  check("realtime rollup", live.status === 200);
  const staff = await req("/api/staff", { token: tokens["collector RR"] });
  check("collector sees officers", staff.status === 200 && Array.isArray(staff.json) && staff.json.some((x) => x.role === "officer"));
  const inactive = (staff.json || []).find((x) => x.phone === "9002220003");
  check("inactive officer flagged", inactive && Number(inactive.active) === 0);
  if (mine.json && mine.json.id && tokens["collector RR"]) {
    const tr = await req("/api/trail", { method: "POST", token: tokens["collector RR"], body: { bookingId: mine.json.id, status: "checked_in" } });
    check("collector can update trail", tr.status === 200, tr.json && tr.json.error);
    await req("/api/trail", { method: "POST", token: tokens["collector RR"], body: { bookingId: mine.json.id, status: "booked" } });
  }
  const cmd = await req("/api/command", { token: tokens["minister"] });
  check("minister command dashboard", cmd.status === 200);
  if (fails.length) { console.error("Failed:", fails.join(", ")); process.exit(1); }
  console.log("All software checks passed.");
})().catch((e) => { console.error("Server not running?", e.message); process.exit(1); });
