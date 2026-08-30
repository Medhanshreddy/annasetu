const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { connect, seed, id, nowIso, ensureHourlySlots, istParts, ensureDemoUsers } = require("./db");
const { sendSms, loadSettings, saveSettings } = require("./sms");

const PORT = process.env.PORT || 8080;
const PUBLIC = path.join(__dirname, "public");
const db = connect();
seed(db);
try { ensureDemoUsers(db); } catch (e) { console.warn(e.message); }
try { db.exec("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT, created_at TEXT)"); } catch {}

function event(text) {
  db.prepare("INSERT INTO events VALUES (?,?,?)").run(id("EV"), text, nowIso());
}

/** Live yard load from real farmer bookings (not a stored label).
 *  OPEN: fewer than 8 farmers waiting and under 45% of today's slot capacity.
 *  BUSY: 8–14 waiting or 45–74% full.
 *  CROWDED: 15+ waiting or 75%+ full.
 */
function crowdFromBookings(db, centreId) {
  const today = new Date().toISOString().slice(0, 10);
  const waiting = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE centre_id=? AND date=? AND status IN ('booked','checked_in')").get(centreId, today).n;
  let cap = db.prepare("SELECT COALESCE(SUM(capacity),0) AS n FROM slots WHERE centre_id=? AND date=?").get(centreId, today).n;
  if (!cap) {
    const row = db.prepare("SELECT capacity FROM centres WHERE id=?").get(centreId);
    cap = (row?.capacity || 18) * 10;
  }
  const bookedToday = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE centre_id=? AND date=? AND status!='cancelled'").get(centreId, today).n;
  const fill = cap ? Math.round((bookedToday / cap) * 100) : 0;
  let status = "open";
  if (waiting >= 15 || fill >= 75) status = "crowded";
  else if (waiting >= 8 || fill >= 45) status = "busy";
  const waitMin = Math.max(5, waiting * 6);
  return { waiting, bookedToday, capacityToday: cap, fill, status, waitMin };
}

function decorateCentre(db, c) {
  const live = crowdFromBookings(db, c.id);
  return { ...c, ...live, wait_min: live.waitMin };
}

async function notify(phone, text, kind) {
  const result = await sendSms(phone, text);
  try {
    db.exec("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, phone TEXT, text TEXT, kind TEXT, read INTEGER, created_at TEXT)");
    db.prepare("INSERT INTO notifications VALUES (?,?,?,?,?,?)").run(id("NT"), phone, text, kind, 0, nowIso());
  } catch {}
  db.prepare("INSERT INTO sms VALUES (?,?,?,?,?,?,?,?)").run(
    id("SMS"), phone, text, kind, result.provider, result.ok ? 1 : 0, String(result.detail).slice(0, 240), nowIso()
  );
  return result;
}

function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(obj));
}

function body(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
  });
}

function auth(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  try {
    const row = db.prepare("SELECT user_id FROM sessions WHERE token=?").get(token);
    if (!row) return null;
    return db.prepare("SELECT * FROM users WHERE id=?").get(row.user_id) || null;
  } catch {
    return null;
  }
}

function createSession(user) {
  const token = id("TOK");
  db.prepare("INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)").run(token, user.id, nowIso());
  return token;
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };

function staticFile(req, res) {
  let pth = new URL(req.url, "http://x").pathname;
  if (pth === "/") pth = "/index.html";
  const file = path.join(PUBLIC, path.normalize(pth));
  if (!file.startsWith(PUBLIC)) return json(res, 403, { error: "no" });
  fs.readFile(file, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC, "index.html"), (e2, html) => {
        if (e2) return json(res, 404, { error: "missing" });
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      });
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}

function safeUser(u) {
  if (!u) return null;
  const { pin, ...rest } = u;
  return rest;
}

function nextToken(db, centreId, date) {
  const prefix = String(centreId.replace(/\D/g, "") || "1");
  const rows = db.prepare("SELECT token_no FROM bookings WHERE centre_id=? AND date=?").all(centreId, date);
  let maxN = 0;
  for (const r of rows) {
    const n = parseInt(String(r.token_no).replace(/\D/g, "").slice(-3), 10);
    if (!Number.isNaN(n) && n > maxN) maxN = n;
  }
  const serial = maxN + 1;
  return prefix + String(serial).padStart(3, "0");
}

function refreshSlotCount(db, slotId) {
  if (!slotId) return;
  const n = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE slot_id=? AND status != 'cancelled'").get(slotId).n;
  db.prepare("UPDATE slots SET booked=? WHERE id=?").run(n, slotId);
}

function mapBooking(b) {
  if (!b) return null;
  return {
    ...b,
    farmerId: b.farmer_id,
    farmerName: b.farmer_name,
    centreId: b.centre_id,
    centreName: b.centre_name,
    slotId: b.slot_id,
    qtyQuintal: b.qty,
    tokenNo: b.token_no,
    changedCentre: !!b.changed_centre,
    createdAt: b.created_at,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const method = req.method;
  try {
    if (p === "/api/health") return json(res, 200, { ok: true, name: "AnnaSetu", db: "sqlite", ps: "SIH26032" });

    if (p === "/api/otp/request" && method === "POST") {
      const b = await body(req);
      const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
      if (phone.length !== 10) return json(res, 400, { error: "Enter a 10-digit mobile number" });
      if (phone === "9666939399") return json(res, 401, { error: "This number is not registered for login" });
      const u = db.prepare("SELECT * FROM users WHERE phone=?").get(phone);
      if (!u) return json(res, 404, { error: "Number not registered. Create farmer account first, or use a team number." });
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      try {
        db.exec("CREATE TABLE IF NOT EXISTS otps (phone TEXT PRIMARY KEY, otp TEXT, exp INTEGER)");
        db.prepare("INSERT INTO otps(phone,otp,exp) VALUES(?,?,?) ON CONFLICT(phone) DO UPDATE SET otp=excluded.otp, exp=excluded.exp").run(phone, otp, Date.now() + 5 * 60 * 1000);
      } catch {
        globalThis.__otp = globalThis.__otp || new Map();
        globalThis.__otp.set(phone, { otp, exp: Date.now() + 5 * 60 * 1000 });
      }
      const text = "AnnaSetu OTP: " + otp + " valid 5 min. Do not share.";
      try {
        db.exec("CREATE TABLE IF NOT EXISTS pending_sms (id TEXT PRIMARY KEY, phone TEXT, text TEXT, kind TEXT, status TEXT, created_at TEXT)");
        db.prepare("INSERT INTO pending_sms VALUES (?,?,?,?,?,?)").run(id("PS"), phone, text, "otp", "queued", nowIso());
      } catch {}
      const sent = await notify(phone, text, "otp");
      return json(res, 200, {
        ok: true,
        otp,
        sentVia: sent.provider,
        sentOk: sent.ok,
        detail: sent.detail,
        hint: sent.ok ? "SMS pushed to Android 6309752008. Code also shown here." : "Code shown on screen. Android SMS: " + sent.detail,
      });
    }
    if (p === "/api/otp/verify" && method === "POST") {
      const b = await body(req);
      const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
      const otp = String(b.otp || "").trim();
      let row = null;
      try {
        row = db.prepare("SELECT * FROM otps WHERE phone=?").get(phone);
      } catch {
        row = (globalThis.__otp || new Map()).get(phone);
      }
      if (!row || row.exp < Date.now() || String(row.otp) !== otp) return json(res, 401, { error: "Invalid or expired OTP" });
      const u = db.prepare("SELECT * FROM users WHERE phone=?").get(phone);
      if (!u) return json(res, 404, { error: "User not found" });
      try { db.prepare("DELETE FROM otps WHERE phone=?").run(phone); } catch {}
      if (globalThis.__otp) globalThis.__otp.delete(phone);
      const token = createSession(u);
      return json(res, 200, { token, user: safeUser(u) });
    }

    if (p === "/api/login" && method === "POST") {
      const b = await body(req);
      const phone = String(b.phone || "").replace(/\D/g, "").slice(-10);
      if (phone === "9666939399") return json(res, 401, { error: "This number is not a staff or farmer login" });
      const pin = String(b.pin || "").trim();
      const u = pin
        ? db.prepare("SELECT * FROM users WHERE phone=? AND pin=?").get(phone, pin)
        : db.prepare("SELECT * FROM users WHERE phone=?").get(phone);
      if (!u) return json(res, 401, { error: "Invalid phone or PIN" });
      const token = createSession(u);
      return json(res, 200, { token, user: safeUser(u) });
    }

    if (p === "/api/register" && method === "POST") {
      const b = await body(req);
      if (!b.name || !b.phone) return json(res, 400, { error: "Name and phone required" });
      if (db.prepare("SELECT id FROM users WHERE phone=?").get(String(b.phone))) return json(res, 409, { error: "Phone already registered" });
      const uid = id("U");
      db.prepare("INSERT INTO users (id,role,name,phone,pin,village,district,aadhaar,land_acres,crop,bank,ifsc,centre_id,vehicle,lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .run(uid, "farmer", b.name, String(b.phone), String(b.pin || "1234"), b.village || "", b.district || "Rangareddy", "XXXX-XXXX-" + String(b.phone).slice(-4), Number(b.landAcres) || 1, b.crop || "Paddy", b.bank || "", b.ifsc || "", null, null, b.lang || "en");
      const u = db.prepare("SELECT * FROM users WHERE id=?").get(uid);
      event("New farmer " + u.name);
      await notify(u.phone, "AnnaSetu: Welcome " + u.name + ". Book a procurement slot today.", "register");
      const token = createSession(u);
      return json(res, 200, { token, user: safeUser(u) });
    }

    if (p === "/api/centres") {
      const today = new Date().toISOString().slice(0, 10);
      const centres = db.prepare("SELECT * FROM centres").all();
      return json(res, 200, centres.map((c) => decorateCentre(db, c)));
    }

    if (p === "/api/slots") {
      ensureHourlySlots(db);
      const { ymd: today, hour, minute } = istParts();
      const centreId = url.searchParams.get("centreId");
      const rows = centreId
        ? db.prepare("SELECT * FROM slots WHERE centre_id=? ORDER BY date, window").all(centreId)
        : db.prepare("SELECT * FROM slots ORDER BY date, window").all();
      const live = rows.filter((s) => {
        if (s.date > today) return true;
        if (s.date < today) return false;
        const startH = Number(String(s.window).slice(0, 2));
        if (Number.isNaN(startH)) return true;
        if (hour < startH) return true;
        if (hour === startH && minute < 55) return true;
        return false;
      });
      return json(res, 200, live.map((s) => ({ ...s, centreId: s.centre_id, left: Math.max(0, s.capacity - s.booked) })));
    }

    if (p.startsWith("/api/queue/")) {
      const centreId = p.split("/")[3] || "C1";
      const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
      const list = db.prepare("SELECT * FROM bookings WHERE centre_id=? AND date=? AND status!='cancelled' ORDER BY created_at").all(centreId, date);
      return json(res, 200, list.map(mapBooking));
    }

    const u = auth(req);
    try {
      const m = db.prepare("SELECT id FROM users WHERE phone='9000000005'").get();
      if (!m) {
        db.prepare("INSERT INTO users (id,role,name,phone,pin,village,district,aadhaar,land_acres,crop,bank,ifsc,centre_id,vehicle,lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .run("U-M1", "minister", "State Command", "9000000005", "1234", "", "Telangana", "", 0, "", "", "", null, null, "en");
      }
      const sim = db.prepare("SELECT id FROM users WHERE phone='9666939399'").get();
      if (!sim) {
        db.prepare("INSERT INTO users (id,role,name,phone,pin,village,district,aadhaar,land_acres,crop,bank,ifsc,centre_id,vehicle,lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
          .run("U-SMS", "sms", "iPhone SMS Station", "9666939399", "1234", "", "Hyderabad", "", 0, "", "", "", null, null, "en");
      }
    } catch {}

    if (p === "/api/sms/config" && method === "GET") {
      const s = loadSettings();
      return json(res, 200, { mode: s.mode, simGatewayUrl: s.simGatewayUrl || "", hasUser: !!s.simGatewayUser });
    }
    if (p === "/api/sms/config" && method === "POST") {
      const b = await body(req);
      const cur = loadSettings();
      const next = {
        ...cur,
        mode: b.mode === "sim" ? "sim" : "outbox",
        simGatewayUrl: String(b.simGatewayUrl || "").trim(),
        simGatewayUser: String(b.simGatewayUser || cur.simGatewayUser || ""),
        simGatewayPass: String(b.simGatewayPass || cur.simGatewayPass || ""),
      };
      saveSettings(next);
      return json(res, 200, { ok: true, mode: next.mode, simGatewayUrl: next.simGatewayUrl });
    }

    const open = ["/api/health", "/api/login", "/api/register", "/api/centres", "/api/slots", "/api/smart", "/api/otp/request", "/api/otp/verify", "/api/sms/config"];
    if (p.startsWith("/api/") && !open.includes(p) && !p.startsWith("/api/queue") && !u) return json(res, 401, { error: "Login required" });
    if (p === "/api/staff") {
      const rows = db.prepare("SELECT id, role, name, phone, district, active FROM users WHERE role IN ('officer','collector','admin','centre','payment','transport','minister') ORDER BY role, name").all();
      return json(res, 200, rows.map(r => ({...r, active: r.active === 0 ? 0 : 1})));
    }
    if (p === "/api/me") return json(res, 200, safeUser(u));

    if (p === "/api/book" && method === "POST") {
      if (u.role !== "farmer") return json(res, 403, { error: "Farmers only" });
      const b = await body(req);
      const slot = db.prepare("SELECT * FROM slots WHERE id=?").get(b.slotId);
      if (!slot) return json(res, 404, { error: "Slot not found" });
      const live = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE slot_id=? AND status != 'cancelled'").get(slot.id).n;
      if (live >= slot.capacity) return json(res, 409, { error: "Slot full" });
      if (db.prepare("SELECT id FROM bookings WHERE farmer_id=? AND status IN ('booked','checked_in','weighed')").get(u.id))
        return json(res, 409, { error: "You already have an active token" });
      const centre = db.prepare("SELECT * FROM centres WHERE id=?").get(slot.centre_id);
      const tokenNo = nextToken(db, slot.centre_id, slot.date);
      const bid = id("BK");
      db.prepare("INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(
        bid, u.id, u.name, u.phone, slot.centre_id, centre.name, slot.id, slot.date, slot.window, Number(b.qtyQuintal) || 20, tokenNo, "booked", 0, nowIso()
      );
      refreshSlotCount(db, slot.id);
      event(u.name + " booked " + centre.name + " token " + tokenNo);
      await notify(u.phone, "AnnaSetu: Token " + tokenNo + " at " + centre.name + " on " + slot.date + " " + slot.window + ".", "booking");
      return json(res, 200, mapBooking(db.prepare("SELECT * FROM bookings WHERE id=?").get(bid)));
    }

    if (p === "/api/my-booking") {
      const list = db.prepare("SELECT * FROM bookings WHERE farmer_id=? ORDER BY created_at DESC").all(u.id);
      const active = list.find((x) => !["paid", "cancelled"].includes(x.status)) || list[0] || null;
      if (!active) return json(res, 200, null);
      const ahead = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE centre_id=? AND date=? AND window=? AND status IN ('booked','checked_in') AND created_at < ?").get(active.centre_id, active.date, active.window, active.created_at).n;
      const centre = db.prepare("SELECT * FROM centres WHERE id=?").get(active.centre_id);
      const payment = db.prepare("SELECT * FROM payments WHERE booking_id=?").get(active.id);
      const weigh = db.prepare("SELECT * FROM weighments WHERE booking_id=?").get(active.id);
      const trip = db.prepare("SELECT * FROM trips WHERE booking_id=?").get(active.id);
      return json(res, 200, { ...mapBooking(active), ahead, waitMin: Math.max(6, (ahead + 1) * 7 + (centre?.wait_min || 10) / 4), centre, payment, weigh: weigh ? { ...weigh, netQuintal: weigh.net_q } : null, trip });
    }

    if (p === "/api/change-centre" && method === "POST") {
      const b = await body(req);
      const bk = db.prepare("SELECT * FROM bookings WHERE id=? AND farmer_id=?").get(b.bookingId, u.id);
      if (!bk) return json(res, 404, { error: "Booking not found" });
      if (bk.status !== "booked") return json(res, 409, { error: "Cannot change after check-in" });
      if (bk.status !== "booked") return json(res, 409, { error: "Cannot change after check-in" });
      const ns = db.prepare("SELECT * FROM slots WHERE id=?").get(b.newSlotId);
      if (!ns) return json(res, 404, { error: "New slot not found" });
      const liveNew = db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE slot_id=? AND status != 'cancelled'").get(ns.id).n;
      if (liveNew >= ns.capacity) return json(res, 409, { error: "New slot full" });
      const centre = db.prepare("SELECT * FROM centres WHERE id=?").get(ns.centre_id);
      const tokenNo = nextToken(db, ns.centre_id, ns.date);
      db.prepare("UPDATE bookings SET slot_id=?, centre_id=?, centre_name=?, date=?, window=?, changed_centre=1, token_no=? WHERE id=?").run(ns.id, ns.centre_id, centre.name, ns.date, ns.window, tokenNo, bk.id);
      refreshSlotCount(db, bk.slot_id);
      refreshSlotCount(db, ns.id);
      await notify(u.phone, "AnnaSetu: Centre changed. New token " + tokenNo + " at " + centre.name + ".", "change");
      return json(res, 200, { ok: true, tokenNo });
    }

    if (p === "/api/cancel" && method === "POST") {
      const b = await body(req);
      const bk = db.prepare("SELECT * FROM bookings WHERE id=? AND farmer_id=?").get(b.bookingId, u.id);
      if (!bk) return json(res, 404, { error: "Not found" });
      if (bk.status !== "booked") return json(res, 409, { error: "Cannot cancel after check-in" });
      db.prepare("UPDATE bookings SET status='cancelled' WHERE id=?").run(bk.id);
      refreshSlotCount(db, bk.slot_id);
      await notify(u.phone, "AnnaSetu: Token " + bk.token_no + " cancelled.", "cancel");
      return json(res, 200, { ok: true });
    }

    if (p === "/api/checkin" && method === "POST") {
      const b = await body(req);
      const bk = db.prepare("SELECT * FROM bookings WHERE id=?").get(b.bookingId);
      if (!bk) return json(res, 404, { error: "Not found" });
      db.prepare("UPDATE bookings SET status='checked_in' WHERE id=?").run(bk.id);
      await notify(bk.phone, "AnnaSetu: Token " + bk.token_no + " checked in at " + bk.centre_name + ".", "checkin");
      return json(res, 200, { ok: true });
    }

    if (p === "/api/weigh" && method === "POST") {
      const b = await body(req);
      const bk = db.prepare("SELECT * FROM bookings WHERE id=?").get(b.bookingId);
      if (!bk) return json(res, 404, { error: "Not found" });
      const net = Number(b.netQuintal);
      const rate = Number(b.rate) || 2300;
      const amount = Math.round(net * rate);
      db.prepare("INSERT INTO weighments VALUES (?,?,?,?,?,?,?,?,?)").run(id("W"), bk.id, bk.farmer_id, net, b.faq || "FAQ", rate, amount, "RCPT-" + bk.token_no, nowIso());
      db.prepare("UPDATE bookings SET status='weighed' WHERE id=?").run(bk.id);
      const centre = db.prepare("SELECT * FROM centres WHERE id=?").get(bk.centre_id);
      db.prepare("INSERT INTO trips VALUES (?,?,?,?,?,?,?,?)").run(id("TR"), bk.id, bk.centre_id, "Civil Supplies Mill – " + (centre?.district || "RR"), "TS09 GD 4421", "M. Naresh", "assigned", nowIso());
      const farmer = db.prepare("SELECT * FROM users WHERE id=?").get(bk.farmer_id);
      db.prepare("INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(id("PAY"), bk.id, bk.farmer_id, bk.farmer_name, bk.phone, amount, farmer?.bank || "", "pending", null, nowIso(), null);
      await notify(bk.phone, "AnnaSetu: Weighed " + net + "q. Amount Rs " + amount + ".", "weigh");
      return json(res, 200, { ok: true, amount });
    }

    if (p === "/api/trips") {
      const rows = db.prepare("SELECT t.*, b.token_no, b.farmer_name, b.centre_name FROM trips t LEFT JOIN bookings b ON b.id=t.booking_id ORDER BY t.created_at DESC").all();
      return json(res, 200, rows.map((t) => ({ ...t, booking: { tokenNo: t.token_no, farmerName: t.farmer_name, centreName: t.centre_name } })));
    }

    if (p === "/api/trip-status" && method === "POST") {
      const b = await body(req);
      const tr = db.prepare("SELECT * FROM trips WHERE id=?").get(b.tripId);
      if (!tr) return json(res, 404, { error: "Trip not found" });
      db.prepare("UPDATE trips SET status=? WHERE id=?").run(b.status, tr.id);
      if (b.status === "lifted" || b.status === "delivered") db.prepare("UPDATE bookings SET status=? WHERE id=?").run(b.status, tr.booking_id);
      const bk = db.prepare("SELECT * FROM bookings WHERE id=?").get(tr.booking_id);
      if (bk) await notify(bk.phone, "AnnaSetu: Lot " + bk.token_no + " is now " + b.status + ".", "transport");
      return json(res, 200, { ok: true });
    }

    if (p === "/api/payments") return json(res, 200, db.prepare("SELECT * FROM payments ORDER BY created_at DESC").all());

    if (p === "/api/pay" && method === "POST") {
      const b = await body(req);
      const pay = db.prepare("SELECT * FROM payments WHERE id=?").get(b.paymentId);
      if (!pay) return json(res, 404, { error: "Payment not found" });
      const utr = b.utr || "UTRN" + Date.now().toString().slice(-10);
      db.prepare("UPDATE payments SET status=?, utr=?, paid_at=? WHERE id=?").run(b.status || "paid", utr, nowIso(), pay.id);
      if ((b.status || "paid") === "paid") db.prepare("UPDATE bookings SET status='paid' WHERE id=?").run(pay.booking_id);
      await notify(pay.phone, "AnnaSetu: Rs " + pay.amount + " credited. UTR " + utr + ".", "payment");
      return json(res, 200, { ok: true, utr });
    }

    if (p === "/api/admin/overview") {
      const today = new Date().toISOString().slice(0, 10);
      return json(res, 200, {
        farmers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='farmer'").get().n,
        centres: db.prepare("SELECT COUNT(*) AS n FROM centres").get().n,
        bookingsToday: db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE date=?").get(today).n,
        waiting: db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('booked','checked_in')").get().n,
        weighed: db.prepare("SELECT COUNT(*) AS n FROM weighments").get().n,
        pendingPay: db.prepare("SELECT COUNT(*) AS n FROM payments WHERE status='pending'").get().n,
        paid: db.prepare("SELECT COUNT(*) AS n FROM payments WHERE status='paid'").get().n,
        paidAmt: db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status='paid'").get().n,
        sms: db.prepare("SELECT COUNT(*) AS n FROM sms").get().n,
        events: db.prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT 12").all(),
        centresLive: db.prepare("SELECT * FROM centres").all(),
      });
    }

    if (p === "/api/smart") {
      const today = new Date().toISOString().slice(0, 10);
      const hour = new Date().getHours();
      const centres = db.prepare("SELECT * FROM centres").all().map((c) => {
        const live = decorateCentre(db, c);
        const predicted = live.waitMin;
        const heat = live.fill;
        return { ...live, predicted, heat, suggestScore: predicted + (live.status === "crowded" ? 25 : live.status === "busy" ? 10 : 0) };
      });
      const ranked = [...centres].sort((a, b) => a.suggestScore - b.suggestScore);
      return json(res, 200, { centres, best: ranked[0], ranked, mspRate: 2300, hour });
    }

    if (p === "/api/msp") {
      const qty = Number(url.searchParams.get("qty") || 20);
      const rate = 2300;
      return json(res, 200, { qty, rate, bonus: 0, amount: Math.round(qty * rate) });
    }

    if (p === "/api/tickets" && method === "GET") {
      return json(res, 200, db.prepare("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 40").all());
    }
    if (p === "/api/tickets" && method === "POST") {
      const b = await body(req);
      const tid = id("TK");
      db.prepare("INSERT INTO tickets VALUES (?,?,?,?,?,?,?,?)").run(
        tid, u.id, u.name, u.phone, b.topic || "Queue / slot", b.message || "", "open", nowIso()
      );
      event("Grievance from " + u.name + ": " + (b.topic || "ticket"));
      return json(res, 200, { ok: true, id: tid });
    }
    if (p === "/api/tickets/close" && method === "POST") {
      const b = await body(req);
      db.prepare("UPDATE tickets SET status='closed' WHERE id=?").run(b.id);
      return json(res, 200, { ok: true });
    }

    if (p === "/api/centre-status" && method === "POST") {
      const b = await body(req);
      db.prepare("UPDATE centres SET status=? WHERE id=?").run(b.status || "open", b.centreId);
      event("Yard " + b.centreId + " set " + b.status);
      return json(res, 200, { ok: true });
    }
    if (p === "/api/scan" && method === "POST") {
      const b = await body(req);
      const token = String(b.tokenNo || b.token || "").trim();
      const bk = db.prepare("SELECT * FROM bookings WHERE token_no=? AND status!='cancelled' ORDER BY created_at DESC").get(token);
      if (!bk) return json(res, 404, { error: "Token not found" });
      return json(res, 200, mapBooking(bk));
    }

    if (p === "/api/command") {
      const today = new Date().toISOString().slice(0, 10);
      const byStatus = db.prepare("SELECT status, COUNT(*) AS n FROM bookings GROUP BY status").all();
      const byDistrict = db.prepare("SELECT district, status, wait_min FROM centres").all();
      const paidAmt = db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status='paid'").get().n;
      const pendingAmt = db.prepare("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status='pending'").get().n;
      const ticketsOpen = db.prepare("SELECT COUNT(*) AS n FROM tickets WHERE status='open'").get().n;
      return json(res, 200, {
        today,
        farmers: db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='farmer'").get().n,
        bookingsToday: db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE date=?").get(today).n,
        waiting: db.prepare("SELECT COUNT(*) AS n FROM bookings WHERE status IN ('booked','checked_in')").get().n,
        paidAmt,
        pendingAmt,
        ticketsOpen,
        byStatus,
        byDistrict,
        centres: db.prepare("SELECT * FROM centres").all(),
        recentPay: db.prepare("SELECT * FROM payments ORDER BY created_at DESC LIMIT 8").all(),
        events: db.prepare("SELECT * FROM events ORDER BY created_at DESC LIMIT 10").all(),
        tickets: db.prepare("SELECT * FROM tickets ORDER BY created_at DESC LIMIT 10").all(),
      });
    }

    if (p === "/api/sms/pending") {
      try {
        db.exec("CREATE TABLE IF NOT EXISTS pending_sms (id TEXT PRIMARY KEY, phone TEXT, text TEXT, kind TEXT, status TEXT, created_at TEXT)");
        return json(res, 200, db.prepare("SELECT * FROM pending_sms WHERE status='queued' ORDER BY created_at DESC LIMIT 30").all());
      } catch {
        return json(res, 200, []);
      }
    }
    if (p === "/api/sms/sent" && method === "POST") {
      const b = await body(req);
      try { db.prepare("UPDATE pending_sms SET status='sent' WHERE id=?").run(b.id); } catch {}
      return json(res, 200, { ok: true });
    }

    if (p === "/api/notifications") {
      const phone = u.phone;
      try {
        db.exec("CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, phone TEXT, text TEXT, kind TEXT, read INTEGER, created_at TEXT)");
        return json(res, 200, db.prepare("SELECT * FROM notifications WHERE phone=? ORDER BY created_at DESC LIMIT 30").all(phone));
      } catch { return json(res, 200, []); }
    }
    if (p === "/api/trail" && method === "POST") {
      if (!["admin","centre","minister","payment","transport","officer","collector"].includes(u.role)) return json(res, 403, { error: "Staff only" });
      const b = await body(req);
      const allowed = ["booked","checked_in","weighed","lifted","delivered","paid","cancelled"];
      if (!allowed.includes(b.status)) return json(res, 400, { error: "Bad status" });
      const bk = db.prepare("SELECT * FROM bookings WHERE id=?").get(b.bookingId);
      if (!bk) return json(res, 404, { error: "Booking not found" });
      db.prepare("UPDATE bookings SET status=? WHERE id=?").run(b.status, bk.id);
      event("Trail " + bk.token_no + " -> " + b.status + " by " + u.name);
      await notify(bk.phone, "AnnaSetu: Token " + bk.token_no + " is now " + b.status.replace("_"," ") + ".", "trail");
      return json(res, 200, mapBooking(db.prepare("SELECT * FROM bookings WHERE id=?").get(bk.id)));
    }
    if (p === "/api/live-queue") {
      const today = new Date().toISOString().slice(0, 10);
      const rows = db.prepare("SELECT centre_id, centre_name, status, COUNT(*) AS n FROM bookings WHERE date=? AND status IN ('booked','checked_in') GROUP BY centre_id, centre_name, status").all(today);
      return json(res, 200, { t: nowIso(), rows });
    }

    if (p === "/api/sms") return json(res, 200, db.prepare("SELECT * FROM sms ORDER BY created_at DESC LIMIT 40").all());
    if (p === "/api/sms/test" && method === "POST") {
      const b = await body(req);
      return json(res, 200, await notify(b.phone || u.phone, b.text || "AnnaSetu test: alerts active.", "test"));
    }
    if (p.startsWith("/api/")) return json(res, 404, { error: "Unknown API" });
    return staticFile(req, res);
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => console.log("AnnaSetu SQLite server on http://localhost:" + PORT));
