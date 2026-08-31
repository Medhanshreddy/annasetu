(function () {
  const KEY = "annasetu_db_v3";
  function now() { return new Date().toISOString(); }
  function nid(p) { return p + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function today() { return new Date().toISOString().slice(0, 10); }

  function seed() {
    const ymd = today();
    const centres = [
      { id: "C1", name: "Narsingi PPC", mandal: "Gandipet", district: "Rangareddy", lat: 17.385, lng: 78.339, capacity: 18, open_at: "07:00", close_at: "17:00", status: "open", wait_min: 18, waitMin: 18, waiting: 2, fill: 22, predicted: 16, heat: 28 },
      { id: "C2", name: "Shamshabad PPC", mandal: "Shamshabad", district: "Rangareddy", lat: 17.24, lng: 78.429, capacity: 20, open_at: "07:00", close_at: "17:00", status: "busy", wait_min: 42, waitMin: 42, waiting: 6, fill: 48, predicted: 38, heat: 61 },
      { id: "C3", name: "Medchal IKP", mandal: "Medchal", district: "Medchal-Malkajgiri", lat: 17.63, lng: 78.481, capacity: 16, open_at: "07:00", close_at: "16:30", status: "open", wait_min: 14, waitMin: 14, waiting: 1, fill: 18, predicted: 12, heat: 20 },
      { id: "C4", name: "Warangal IKP", mandal: "Hanamkonda", district: "Hanumakonda", lat: 17.978, lng: 79.594, capacity: 24, open_at: "06:30", close_at: "17:30", status: "open", wait_min: 28, waitMin: 28, waiting: 3, fill: 30, predicted: 24, heat: 36 },
      { id: "C5", name: "Siddipet PPC", mandal: "Siddipet", district: "Siddipet", lat: 18.102, lng: 78.852, capacity: 14, open_at: "07:00", close_at: "16:00", status: "crowded", wait_min: 72, waitMin: 72, waiting: 11, fill: 82, predicted: 70, heat: 88 },
      { id: "C6", name: "Nalgonda IKP", mandal: "Nalgonda", district: "Nalgonda", lat: 17.057, lng: 78.267, capacity: 18, open_at: "07:00", close_at: "17:00", status: "open", wait_min: 16, waitMin: 16, waiting: 2, fill: 20, predicted: 14, heat: 24 },
    ];
    const users = [
      { id: "U-F1", role: "farmer", name: "Ravi Kumar", phone: "9876543210", pin: "1234", village: "Narsingi", district: "Rangareddy", bank: "SBI ****4412" },
      { id: "U-F2", role: "farmer", name: "Lakshmi Devi", phone: "9123456780", pin: "1234", village: "Shamshabad", district: "Rangareddy", bank: "Union ****8891" },
      { id: "U-C1", role: "centre", name: "Srinivas Rao", phone: "9000000001", pin: "1234", centre_id: "C1" },
      { id: "U-T1", role: "transport", name: "M. Naresh", phone: "9000000002", pin: "1234", vehicle: "TS09 GD 4421" },
      { id: "U-P1", role: "payment", name: "Ananya Reddy", phone: "9000000003", pin: "1234" },
      { id: "U-A1", role: "admin", name: "District Controller", phone: "9000000004", pin: "1234" },
      { id: "U-M1", role: "minister", name: "State Command", phone: "9000000005", pin: "1234" },
    ];
    const slots = [];
    for (const c of centres) {
      for (let d = 0; d < 4; d++) {
        const dt = new Date(); dt.setDate(dt.getDate() + d);
        const date = dt.toISOString().slice(0, 10);
        ["07:00-09:00", "09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00"].forEach((w) => {
          slots.push({ id: nid("SL"), centreId: c.id, centre_id: c.id, date, window: w, capacity: c.capacity, booked: c.status === "crowded" ? 9 : 3, left: c.status === "crowded" ? 5 : c.capacity - 3 });
        });
      }
    }
    const slotC1 = slots.find((s) => s.centreId === "C1" && s.date === ymd && s.window.startsWith("09:00")) || slots[0];
    return {
      users,
      centres,
      slots,
      bookings: [
        { id: "BK-RAVI", farmerId: "U-F1", farmer_id: "U-F1", farmerName: "Ravi Kumar", farmer_name: "Ravi Kumar", phone: "9876543210", centreId: "C1", centre_id: "C1", centreName: "Narsingi PPC", centre_name: "Narsingi PPC", slotId: slotC1.id, date: ymd, window: "09:00-11:00", qtyQuintal: 24, tokenNo: "1108", token_no: "1108", status: "booked", changedCentre: false, createdAt: now() },
        { id: "BK-LAX", farmerId: "U-F2", farmerName: "Lakshmi Devi", phone: "9123456780", centreId: "C1", centreName: "Narsingi PPC", slotId: slotC1.id, date: ymd, window: "09:00-11:00", qtyQuintal: 18, tokenNo: "1105", status: "checked_in", changedCentre: false, createdAt: now() },
      ],
      weighments: [],
      trips: [],
      payments: [{ id: "PAY1", bookingId: "BK-OLD", farmer_id: "U-F2", farmer_name: "Lakshmi Devi", phone: "9123456780", amount: 45080, bank: "Union ****8891", status: "paid", utr: "UTRN8823410091", created_at: now() }],
      sms: [{ id: "SMS1", phone: "9876543210", text: "AnnaSetu: Token 1108 at Narsingi 09:00-11:00", kind: "booking", created_at: now() }],
      events: [{ id: "EV1", text: "On-device database ready", created_at: now() }],
      tickets: [],
      otps: {},
      sessionUserId: null,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const db = seed();
    save(db);
    return db;
  }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

  function pubUser(u) {
    if (!u) return null;
    const { pin, ...rest } = u;
    return rest;
  }

  window.LocalAPI = {
    reset() { localStorage.removeItem(KEY); },
    async handle(path, method, body, token) {
      const db = load();
      const user = db.users.find((u) => u.id === db.sessionUserId) || null;

      if (path === "/api/health") return { ok: true, db: "on-device", otp: "local" };
      if (path === "/api/login" && method === "POST") {
        const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
        const u = db.users.find((x) => x.phone === phone && x.pin === String(body.pin || ""));
        if (!u) throw new Error("Invalid phone or PIN");
        db.sessionUserId = u.id;
        save(db);
        return { token: "LOCAL-" + u.id, user: pubUser(u) };
      }
      if (path === "/api/register" && method === "POST") {
        const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
        if (!body.name || !phone || !body.pin) throw new Error("Name, phone, PIN required");
        if (db.users.find((x) => x.phone === phone)) throw new Error("Phone already registered");
        const u = { id: nid("U"), role: "farmer", name: body.name, phone, pin: String(body.pin), village: body.village || "", district: body.district || "Rangareddy", bank: "" };
        db.users.push(u);
        db.sessionUserId = u.id;
        db.events.unshift({ id: nid("EV"), text: "Farmer registered " + u.name, created_at: now() });
        save(db);
        return { token: "LOCAL-" + u.id, user: pubUser(u) };
      }
      if (path === "/api/otp/request" && method === "POST") {
        const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
        if (phone.length !== 10) throw new Error("Enter 10-digit mobile");
        let u = db.users.find((x) => x.phone === phone);
        if (!u) {
          u = { id: nid("U"), role: "farmer", name: "Farmer " + phone.slice(-4), phone, pin: "1234", village: "", district: "Rangareddy" };
          db.users.push(u);
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        db.otps[phone] = { otp, exp: Date.now() + 5 * 60 * 1000 };
        db.sms.unshift({ id: nid("SMS"), phone, text: "AnnaSetu OTP " + otp + " (valid 5 min). Generated on this device.", kind: "otp", created_at: now() });
        save(db);
        return { ok: true, otp, mode: "on-device" };
      }
      if (path === "/api/otp/verify" && method === "POST") {
        const phone = String(body.phone || "").replace(/\D/g, "").slice(-10);
        const row = db.otps[phone];
        if (!row || row.exp < Date.now() || row.otp !== String(body.otp || "").trim()) throw new Error("Invalid or expired OTP");
        const u = db.users.find((x) => x.phone === phone);
        delete db.otps[phone];
        db.sessionUserId = u.id;
        save(db);
        return { token: "LOCAL-" + u.id, user: pubUser(u) };
      }
      if (path === "/api/centres") return db.centres;
      if (path === "/api/slots") {
        const cid = new URL("http://x" + path + (body && body._query ? body._query : "")).searchParams?.get?.("centreId");
        return db.slots.filter((s) => !cid || s.centreId === cid);
      }
      if (path === "/api/smart") {
        const ranked = [...db.centres].sort((a, b) => (a.predicted || 99) - (b.predicted || 99));
        return { centres: db.centres, best: ranked[0], ranked, mspRate: 2300 };
      }
      if (path.startsWith("/api/msp")) {
        const q = Number((path.split("qty=")[1] || 24));
        return { qty: q, rate: 2300, amount: Math.round(q * 2300) };
      }
      if (path.startsWith("/api/queue/")) {
        const cid = path.split("/")[3] || "C1";
        return db.bookings.filter((b) => b.centreId === cid && b.status !== "cancelled");
      }

      if (path === "/api/me") return pubUser(user);
      if (path === "/api/book" && method === "POST") {
        if (!user || user.role !== "farmer") throw new Error("Farmers only");
        if (db.bookings.find((b) => b.farmerId === user.id && ["booked", "checked_in", "weighed"].includes(b.status))) throw new Error("You already have an active token");
        const slot = db.slots.find((s) => s.id === body.slotId) || db.slots[0];
        const centre = db.centres.find((c) => c.id === slot.centreId);
        const tokenNo = String(1000 + db.bookings.length + 8);
        const bk = { id: nid("BK"), farmerId: user.id, farmerName: user.name, phone: user.phone, centreId: centre.id, centreName: centre.name, slotId: slot.id, date: slot.date, window: slot.window, qtyQuintal: Number(body.qtyQuintal) || 20, tokenNo, status: "booked", changedCentre: false, createdAt: now() };
        db.bookings.push(bk);
        db.sms.unshift({ id: nid("SMS"), phone: user.phone, text: "Token " + tokenNo + " at " + centre.name, kind: "booking", created_at: now() });
        save(db);
        return bk;
      }
      if (path === "/api/my-booking") {
        if (!user) return null;
        const list = db.bookings.filter((b) => b.farmerId === user.id);
        const active = list.find((b) => !["paid", "cancelled"].includes(b.status)) || list[0] || null;
        if (!active) return null;
        return { ...active, ahead: 2, waitMin: 18, weigh: db.weighments.find((w) => w.bookingId === active.id) || null, payment: db.payments.find((p) => p.bookingId === active.id) || null, trip: db.trips.find((t) => t.bookingId === active.id) || null };
      }
      if (path === "/api/change-centre" && method === "POST") {
        const bk = db.bookings.find((b) => b.id === body.bookingId);
        if (!bk) throw new Error("No booking");
        if (bk.status !== "booked") throw new Error("Cannot change after check-in at the gate");
        const slot = db.slots.find((s) => s.id === body.newSlotId);
        const centre = db.centres.find((c) => c.id === slot.centreId);
        bk.slotId = slot.id; bk.centreId = centre.id; bk.centreName = centre.name; bk.date = slot.date; bk.window = slot.window; bk.changedCentre = true; bk.tokenNo = String(2000 + db.bookings.length);
        save(db);
        return bk;
      }
      if (path === "/api/cancel" && method === "POST") {
        const bk = db.bookings.find((b) => b.id === body.bookingId);
        if (bk) bk.status = "cancelled";
        save(db);
        return { ok: true };
      }
      if (path === "/api/checkin" && method === "POST") {
        const bk = db.bookings.find((b) => b.id === body.bookingId);
        if (bk) bk.status = "checked_in";
        save(db);
        return { ok: true };
      }
      if (path === "/api/weigh" && method === "POST") {
        const bk = db.bookings.find((b) => b.id === body.bookingId);
        const net = Number(body.netQuintal || 21);
        const amount = Math.round(net * 2300);
        db.weighments.push({ id: nid("W"), bookingId: bk.id, netQuintal: net, amount, receipt: "RCPT-" + bk.tokenNo });
        db.trips.push({ id: nid("TR"), bookingId: bk.id, vehicle: "TS09 GD 4421", mill: "Civil Supplies Mill", status: "assigned" });
        db.payments.push({ id: nid("PAY"), bookingId: bk.id, farmer_name: bk.farmerName, phone: bk.phone, amount, status: "pending", bank: "" });
        bk.status = "weighed";
        save(db);
        return { ok: true, amount };
      }
      if (path === "/api/trips") return db.trips.map((t) => ({ ...t, booking: db.bookings.find((b) => b.id === t.bookingId) }));
      if (path === "/api/trip-status" && method === "POST") {
        const t = db.trips.find((x) => x.id === body.tripId);
        if (t) t.status = body.status;
        const bk = t && db.bookings.find((b) => b.id === t.bookingId);
        if (bk && (body.status === "lifted" || body.status === "delivered")) bk.status = body.status;
        save(db);
        return { ok: true };
      }
      if (path === "/api/payments") return db.payments;
      if (path === "/api/pay" && method === "POST") {
        const p = db.payments.find((x) => x.id === body.paymentId);
        if (p) { p.status = "paid"; p.utr = "UTRN" + Date.now().toString().slice(-8); }
        save(db);
        return { ok: true, utr: p && p.utr };
      }
      if (path === "/api/centre-status" && method === "POST") {
        const c = db.centres.find((x) => x.id === body.centreId);
        if (c) { c.status = body.status; c.manual = true; }
        save(db);
        return { ok: true };
      }
      if (path === "/api/scan" && method === "POST") {
        const tok = String(body.tokenNo || body.token || "").trim();
        const bk = db.bookings.find((b) => String(b.tokenNo) === tok);
        if (!bk) throw new Error("Token not found");
        return bk;
      }
      if (path === "/api/tickets" && method === "GET") return db.tickets;
      if (path === "/api/tickets" && method === "POST") {
        db.tickets.unshift({ id: nid("TK"), farmer_name: user?.name, phone: user?.phone, topic: body.topic, message: body.message, status: "open", created_at: now() });
        save(db);
        return { ok: true };
      }
      if (path === "/api/tickets/close" && method === "POST") {
        const t = db.tickets.find((x) => x.id === body.id);
        if (t) t.status = "closed";
        save(db);
        return { ok: true };
      }
      if (path === "/api/admin/overview" || path === "/api/command") {
        return {
          farmers: db.users.filter((u) => u.role === "farmer").length,
          centres: db.centres.length,
          bookingsToday: db.bookings.length,
          waiting: db.bookings.filter((b) => ["booked", "checked_in"].includes(b.status)).length,
          paidAmt: db.payments.filter((p) => p.status === "paid").reduce((a, p) => a + (p.amount || 0), 0),
          pendingAmt: db.payments.filter((p) => p.status === "pending").reduce((a, p) => a + (p.amount || 0), 0),
          ticketsOpen: db.tickets.filter((t) => t.status === "open").length,
          byStatus: ["booked", "checked_in", "weighed", "paid"].map((s) => ({ status: s, n: db.bookings.filter((b) => b.status === s).length })),
          centresLive: db.centres,
          centres: db.centres,
          recentPay: db.payments.slice(0, 8),
          events: db.events,
          tickets: db.tickets,
        };
      }
      if (path === "/api/sms") return db.sms;
      if (path === "/api/sms/test" && method === "POST") {
        db.sms.unshift({ id: nid("SMS"), phone: user?.phone, text: "AnnaSetu test alert (on-device)", kind: "test", created_at: now() });
        save(db);
        return { ok: true };
      }
      throw new Error("Unknown API " + path);
    },
  };
})();
