const express = require("express");
const cors = require("cors");
const path = require("path");
const { load, save, seedIfEmpty, id, nowIso } = require("./store");
const { sendSms } = require("./sms");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

seedIfEmpty();

const sessions = new Map();

function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  const user = sessions.get(token);
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

function pushEvent(db, text) {
  db.events.unshift({ t: nowIso(), text });
  db.events = db.events.slice(0, 80);
}

async function notify(db, phone, text, kind) {
  const result = await sendSms(phone, text);
  db.sms.unshift({
    id: id("SMS"),
    phone,
    text,
    kind,
    t: nowIso(),
    provider: result.provider,
    ok: result.ok,
    detail: String(result.detail).slice(0, 240),
  });
  return result;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "AnnaSetu", ps: "SIH26032" });
});

app.get("/api/meta", (_req, res) => {
  const db = load();
  res.json({
    name: "AnnaSetu",
    ps: "SIH26032",
    org: "Ministry of Consumer Affairs, Food & Public Distribution",
    crop: "Paddy (Telangana MSP procurement demo)",
    centres: db.centres.length,
    smsMode: process.env.MSG91_AUTH_KEY || process.env.TWILIO_ACCOUNT_SID ? "live" : "demo-outbox",
  });
});

app.post("/api/login", (req, res) => {
  const { phone, pin } = req.body || {};
  const db = load();
  const user = db.users.find((u) => u.phone === String(phone) && u.pin === String(pin));
  if (!user) return res.status(401).json({ error: "Invalid phone or PIN" });
  const token = id("TOK");
  const safe = { ...user };
  delete safe.pin;
  sessions.set(token, safe);
  res.json({ token, user: safe });
});

app.post("/api/register", async (req, res) => {
  const { name, phone, pin, village, district, landAcres, crop, bank, ifsc, lang } = req.body || {};
  if (!name || !phone || !pin) return res.status(400).json({ error: "Name, phone and PIN required" });
  const db = load();
  if (db.users.find((u) => u.phone === String(phone))) return res.status(409).json({ error: "Phone already registered" });
  const user = {
    id: id("U"),
    role: "farmer",
    name,
    phone: String(phone),
    pin: String(pin),
    village: village || "",
    district: district || "Rangareddy",
    aadhaar: "XXXX-XXXX-" + String(phone).slice(-4),
    landAcres: Number(landAcres) || 1,
    crop: crop || "Paddy",
    bank: bank || "",
    ifsc: ifsc || "",
    lang: lang || "en",
  };
  db.users.push(user);
  pushEvent(db, `New farmer registered: ${name} (${phone})`);
  await notify(db, user.phone, `AnnaSetu: Registration successful. Welcome ${name}. Book a procurement slot in the app.`, "register");
  save(db);
  const token = id("TOK");
  const safe = { ...user };
  delete safe.pin;
  sessions.set(token, safe);
  res.json({ token, user: safe });
});

app.get("/api/me", auth, (req, res) => res.json(req.user));

app.get("/api/centres", (_req, res) => {
  const db = load();
  const today = new Date().toISOString().slice(0, 10);
  const enriched = db.centres.map((c) => {
    const todays = db.slots.filter((s) => s.centreId === c.id && s.date === today);
    const booked = todays.reduce((a, s) => a + s.booked, 0);
    const cap = todays.reduce((a, s) => a + s.capacity, 0) || c.capacityPerSlot * 5;
    const waiting = db.bookings.filter((b) => b.centreId === c.id && b.date === today && ["booked", "checked_in"].includes(b.status)).length;
    return { ...c, bookedToday: booked, capacityToday: cap, waiting, fill: cap ? Math.round((booked / cap) * 100) : 0 };
  });
  res.json(enriched);
});

app.get("/api/slots", (req, res) => {
  const { centreId, date } = req.query;
  const db = load();
  let slots = db.slots;
  if (centreId) slots = slots.filter((s) => s.centreId === centreId);
  if (date) slots = slots.filter((s) => s.date === date);
  res.json(slots.map((s) => ({ ...s, left: Math.max(0, s.capacity - s.booked) })));
});

app.post("/api/book", auth, async (req, res) => {
  if (req.user.role !== "farmer") return res.status(403).json({ error: "Farmers only" });
  const { slotId, qtyQuintal } = req.body || {};
  const db = load();
  const slot = db.slots.find((s) => s.id === slotId);
  if (!slot) return res.status(404).json({ error: "Slot not found" });
  if (slot.booked >= slot.capacity) return res.status(409).json({ error: "Slot full. Try another window or centre." });
  const existing = db.bookings.find((b) => b.farmerId === req.user.id && ["booked", "checked_in", "weighed"].includes(b.status));
  if (existing) return res.status(409).json({ error: "You already have an active token. Complete or cancel it first." });
  slot.booked += 1;
  const centre = db.centres.find((c) => c.id === slot.centreId);
  const tokenNo = (centre.id.replace("C", "") + String(100 + slot.booked)).padStart(4, "0");
  const booking = {
    id: id("BK"),
    farmerId: req.user.id,
    farmerName: req.user.name,
    phone: req.user.phone,
    centreId: slot.centreId,
    centreName: centre.name,
    slotId: slot.id,
    date: slot.date,
    window: slot.window,
    qtyQuintal: Number(qtyQuintal) || 20,
    tokenNo,
    status: "booked",
    changedCentre: false,
    createdAt: nowIso(),
    queuePos: slot.booked,
  };
  db.bookings.push(booking);
  pushEvent(db, `${req.user.name} booked ${centre.name} ${slot.date} ${slot.window} token ${tokenNo}`);
  await notify(
    db,
    req.user.phone,
    `AnnaSetu: Token ${tokenNo} booked at ${centre.name} on ${slot.date} ${slot.window}. Arrive 15 min early. Track queue in app.`,
    "booking"
  );
  save(db);
  res.json(booking);
});

app.get("/api/my-booking", auth, (req, res) => {
  const db = load();
  const list = db.bookings.filter((b) => b.farmerId === req.user.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const active = list.find((b) => !["paid", "cancelled"].includes(b.status)) || list[0] || null;
  if (!active) return res.json(null);
  const same = db.bookings.filter((b) => b.centreId === active.centreId && b.date === active.date && b.window === active.window && ["booked", "checked_in"].includes(b.status));
  const ahead = same.filter((b) => b.createdAt < active.createdAt).length;
  const centre = db.centres.find((c) => c.id === active.centreId);
  const payment = db.payments.find((p) => p.bookingId === active.id);
  const weigh = db.weighments.find((w) => w.bookingId === active.id);
  const trip = db.trips.find((t) => t.bookingId === active.id);
  res.json({
    ...active,
    ahead,
    waitMin: Math.max(5, (ahead + 1) * 8 + (centre?.waitMin || 10) / 4),
    centre,
    payment,
    weigh,
    trip,
  });
});

app.post("/api/change-centre", auth, async (req, res) => {
  const { bookingId, newSlotId } = req.body || {};
  const db = load();
  const b = db.bookings.find((x) => x.id === bookingId && x.farmerId === req.user.id);
  if (!b) return res.status(404).json({ error: "Booking not found" });
  if (b.changedCentre) return res.status(409).json({ error: "Centre can be changed only once." });
  if (b.status !== "booked") return res.status(409).json({ error: "Cannot change after check-in." });
  const newSlot = db.slots.find((s) => s.id === newSlotId);
  if (!newSlot) return res.status(404).json({ error: "New slot not found" });
  if (newSlot.booked >= newSlot.capacity) return res.status(409).json({ error: "New slot is full." });
  const old = db.slots.find((s) => s.id === b.slotId);
  if (old) old.booked = Math.max(0, old.booked - 1);
  newSlot.booked += 1;
  const centre = db.centres.find((c) => c.id === newSlot.centreId);
  b.slotId = newSlot.id;
  b.centreId = newSlot.centreId;
  b.centreName = centre.name;
  b.date = newSlot.date;
  b.window = newSlot.window;
  b.changedCentre = true;
  b.tokenNo = (centre.id.replace("C", "") + String(200 + newSlot.booked)).padStart(4, "0");
  pushEvent(db, `${req.user.name} moved token to ${centre.name}`);
  await notify(db, req.user.phone, `AnnaSetu: Centre changed once. New token ${b.tokenNo} at ${centre.name} ${b.date} ${b.window}.`, "change");
  save(db);
  res.json(b);
});

app.post("/api/cancel", auth, async (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.body.bookingId && x.farmerId === req.user.id);
  if (!b) return res.status(404).json({ error: "Not found" });
  if (b.status !== "booked") return res.status(409).json({ error: "Cannot cancel after check-in" });
  b.status = "cancelled";
  const slot = db.slots.find((s) => s.id === b.slotId);
  if (slot) slot.booked = Math.max(0, slot.booked - 1);
  await notify(db, req.user.phone, `AnnaSetu: Token ${b.tokenNo} cancelled. You may book a new slot.`, "cancel");
  save(db);
  res.json({ ok: true });
});

app.get("/api/queue/:centreId", (req, res) => {
  const db = load();
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const list = db.bookings
    .filter((b) => b.centreId === req.params.centreId && b.date === date && b.status !== "cancelled")
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  res.json(list);
});

app.post("/api/checkin", auth, async (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.body.bookingId);
  if (!b) return res.status(404).json({ error: "Booking not found" });
  b.status = "checked_in";
  b.checkedInAt = nowIso();
  await notify(db, b.phone, `AnnaSetu: Token ${b.tokenNo} checked in at ${b.centreName}. Please proceed to weighment.`, "checkin");
  save(db);
  res.json(b);
});

app.post("/api/weigh", auth, async (req, res) => {
  const db = load();
  const b = db.bookings.find((x) => x.id === req.body.bookingId);
  if (!b) return res.status(404).json({ error: "Booking not found" });
  const net = Number(req.body.netQuintal);
  const faq = req.body.faq || "FAQ";
  const rate = Number(req.body.rate) || 2300;
  const amount = Math.round(net * rate);
  const w = {
    id: id("W"),
    bookingId: b.id,
    farmerId: b.farmerId,
    netQuintal: net,
    faq,
    rate,
    amount,
    receipt: "RCPT-" + b.tokenNo,
    t: nowIso(),
  };
  db.weighments.push(w);
  b.status = "weighed";
  const trip = {
    id: id("TR"),
    bookingId: b.id,
    centreId: b.centreId,
    mill: "Civil Supplies Mill – " + (db.centres.find((c) => c.id === b.centreId)?.district || "RR"),
    vehicle: "TS09 GD 4421",
    driver: "M. Naresh",
    status: "assigned",
    t: nowIso(),
  };
  db.trips.push(trip);
  const pay = {
    id: id("PAY"),
    bookingId: b.id,
    farmerId: b.farmerId,
    farmerName: b.farmerName,
    phone: b.phone,
    amount,
    bank: db.users.find((u) => u.id === b.farmerId)?.bank || "",
    status: "pending",
    t: nowIso(),
  };
  db.payments.push(pay);
  await notify(db, b.phone, `AnnaSetu: Weighed ${net}q at ₹${rate}/q. Receipt ${w.receipt}. Amount ₹${amount}. Payment pending DBT.`, "weigh");
  save(db);
  res.json({ weighment: w, trip, payment: pay });
});

app.get("/api/trips", auth, (_req, res) => {
  const db = load();
  res.json(
    db.trips.map((t) => ({
      ...t,
      booking: db.bookings.find((b) => b.id === t.bookingId),
    }))
  );
});

app.post("/api/trip-status", auth, async (req, res) => {
  const db = load();
  const t = db.trips.find((x) => x.id === req.body.tripId);
  if (!t) return res.status(404).json({ error: "Trip not found" });
  t.status = req.body.status;
  t.updatedAt = nowIso();
  const b = db.bookings.find((x) => x.id === t.bookingId);
  if (b && req.body.status === "lifted") b.status = "lifted";
  if (b && req.body.status === "delivered") b.status = "delivered";
  if (b) await notify(db, b.phone, `AnnaSetu: Transport update — lot ${b.tokenNo} is now ${t.status}.`, "transport");
  save(db);
  res.json(t);
});

app.get("/api/payments", auth, (_req, res) => {
  const db = load();
  res.json(db.payments);
});

app.post("/api/pay", auth, async (req, res) => {
  const db = load();
  const p = db.payments.find((x) => x.id === req.body.paymentId);
  if (!p) return res.status(404).json({ error: "Payment not found" });
  p.status = req.body.status || "paid";
  p.utr = req.body.utr || "UTRN" + Date.now().toString().slice(-10);
  p.paidAt = nowIso();
  const b = db.bookings.find((x) => x.id === p.bookingId);
  if (b && p.status === "paid") b.status = "paid";
  if (b) await notify(db, p.phone, `AnnaSetu: ₹${p.amount} credited. UTR ${p.utr}. Token ${b.tokenNo} complete.`, "payment");
  save(db);
  res.json(p);
});

app.get("/api/admin/overview", auth, (_req, res) => {
  const db = load();
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    farmers: db.users.filter((u) => u.role === "farmer").length,
    centres: db.centres.length,
    bookingsToday: db.bookings.filter((b) => b.date === today).length,
    waiting: db.bookings.filter((b) => ["booked", "checked_in"].includes(b.status)).length,
    weighed: db.weighments.length,
    pendingPay: db.payments.filter((p) => p.status === "pending").length,
    paid: db.payments.filter((p) => p.status === "paid").length,
    sms: db.sms.length,
    events: db.events.slice(0, 12),
    centresLive: db.centres,
  });
});

app.get("/api/sms", auth, (_req, res) => {
  res.json(load().sms.slice(0, 40));
});

app.post("/api/sms/test", auth, async (req, res) => {
  const db = load();
  const phone = req.body.phone || req.user.phone;
  const text = req.body.text || "AnnaSetu test SMS: your procurement alerts are active.";
  const result = await notify(db, phone, text, "test");
  save(db);
  res.json(result);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AnnaSetu running on http://localhost:${PORT}`);
});
