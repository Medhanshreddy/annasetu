const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "data", "db.json");

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const DEFAULT = {
  users: [],
  centres: [],
  slots: [],
  bookings: [],
  weighments: [],
  trips: [],
  payments: [],
  sms: [],
  events: [],
};

const DEMO_USERS = [
  { id: "U-F1", role: "farmer", name: "Ravi Kumar", phone: "9876543210", pin: "1234", village: "Narsingi", district: "Rangareddy", aadhaar: "XXXX-XXXX-3210", landAcres: 3.2, crop: "Paddy", bank: "SBI ****4412", ifsc: "SBIN0001234", lang: "en" },
  { id: "U-F2", role: "farmer", name: "Lakshmi Devi", phone: "9123456780", pin: "1234", village: "Shamshabad", district: "Rangareddy", aadhaar: "XXXX-XXXX-6780", landAcres: 2.0, crop: "Paddy", bank: "Union ****8891", ifsc: "UBIN0532100", lang: "te" },
  { id: "U-C1", role: "centre", name: "Srinivas Rao", phone: "9000000001", pin: "1234", centreId: "C1", lang: "en" },
  { id: "U-T1", role: "transport", name: "M. Naresh", phone: "9000000002", pin: "1234", vehicle: "TS09 GD 4421", lang: "en" },
  { id: "U-P1", role: "payment", name: "Payment Officer", phone: "9000000003", pin: "1234", lang: "en" },
  { id: "U-A1", role: "admin", name: "District Admin", phone: "9000000004", pin: "1234", district: "Rangareddy", lang: "en" },
];

function ensureDemoUsers(db) {
  if (!Array.isArray(db.users)) db.users = [];
  for (const demo of DEMO_USERS) {
    const i = db.users.findIndex((u) => u.phone === demo.phone);
    if (i >= 0) db.users[i] = { ...db.users[i], ...demo };
    else db.users.push({ ...demo });
  }
  return db;
}

function load() {
  let db;
  try {
    db = JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    db = structuredClone(DEFAULT);
  }
  ensureDemoUsers(db);
  return db;
}

function save(db) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

function seedIfEmpty() {
  const db = load();
  if (db.users.length) return db;

  const centres = [
    { id: "C1", name: "Narsingi PPC", mandal: "Gandipet", district: "Rangareddy", lat: 17.385, lng: 78.339, capacityPerSlot: 18, open: "07:00", close: "17:00", crop: "Paddy", status: "open", waitMin: 22 },
    { id: "C2", name: "Shamshabad PPC", mandal: "Shamshabad", district: "Rangareddy", lat: 17.240, lng: 78.429, capacityPerSlot: 20, open: "07:00", close: "17:00", crop: "Paddy", status: "busy", waitMin: 48 },
    { id: "C3", name: "Medchal IKP Centre", mandal: "Medchal", district: "Medchal–Malkajgiri", lat: 17.630, lng: 78.481, capacityPerSlot: 16, open: "07:00", close: "16:30", crop: "Paddy", status: "open", waitMin: 15 },
    { id: "C4", name: "Warangal IKP Centre", mandal: "Hanamkonda", district: "Hanumakonda", lat: 17.978, lng: 79.594, capacityPerSlot: 24, open: "06:30", close: "17:30", crop: "Paddy", status: "open", waitMin: 30 },
    { id: "C5", name: "Siddipet PPC", mandal: "Siddipet", district: "Siddipet", lat: 18.102, lng: 78.852, capacityPerSlot: 14, open: "07:00", close: "16:00", crop: "Paddy", status: "crowded", waitMin: 75 },
    { id: "C6", name: "Nalgonda IKP Centre", mandal: "Nalgonda", district: "Nalgonda", lat: 17.057, lng: 79.267, capacityPerSlot: 18, open: "07:00", close: "17:00", crop: "Paddy", status: "open", waitMin: 18 },
  ];

  const users = [
    { id: "U-F1", role: "farmer", name: "Ravi Kumar", phone: "9876543210", pin: "1234", village: "Narsingi", district: "Rangareddy", aadhaar: "XXXX-XXXX-3210", landAcres: 3.2, crop: "Paddy", bank: "SBI ****4412", ifsc: "SBIN0001234", lang: "en" },
    { id: "U-F2", role: "farmer", name: "Lakshmi Devi", phone: "9123456780", pin: "1234", village: "Shamshabad", district: "Rangareddy", aadhaar: "XXXX-XXXX-6780", landAcres: 2.0, crop: "Paddy", bank: "Union ****8891", ifsc: "UBIN0532100", lang: "te" },
    { id: "U-C1", role: "centre", name: "Srinivas Rao", phone: "9000000001", pin: "1234", centreId: "C1", lang: "en" },
    { id: "U-T1", role: "transport", name: "M. Naresh", phone: "9000000002", pin: "1234", vehicle: "TS09 GD 4421", lang: "en" },
    { id: "U-P1", role: "payment", name: "Payment Officer", phone: "9000000003", pin: "1234", lang: "en" },
    { id: "U-A1", role: "admin", name: "District Admin", phone: "9000000004", pin: "1234", district: "Rangareddy", lang: "en" },
  ];

  const today = new Date();
  const ymd = (d) => d.toISOString().slice(0, 10);
  const dates = [0, 1, 2, 3].map((n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return ymd(d);
  });
  const windows = ["07:00-09:00", "09:00-11:00", "11:00-13:00", "13:00-15:00", "15:00-17:00"];

  const slots = [];
  for (const c of centres) {
    for (const date of dates) {
      for (const w of windows) {
        const booked = c.status === "crowded" ? Math.min(c.capacityPerSlot, 13) : Math.floor(Math.random() * 6);
        slots.push({
          id: id("SL"),
          centreId: c.id,
          date,
          window: w,
          capacity: c.capacityPerSlot,
          booked,
        });
      }
    }
  }

  const todayStr = ymd(today);
  const slotC1 = slots.find((s) => s.centreId === "C1" && s.date === todayStr && s.window === "09:00-11:00");
  const slotC2 = slots.find((s) => s.centreId === "C2" && s.date === todayStr && s.window === "11:00-13:00");

  const bookings = [
    {
      id: "BK-DEMO-RAVI",
      farmerId: "U-F1",
      farmerName: "Ravi Kumar",
      phone: "9876543210",
      centreId: "C1",
      centreName: "Narsingi PPC",
      slotId: slotC1 ? slotC1.id : slots[0].id,
      date: todayStr,
      window: "09:00-11:00",
      qtyQuintal: 24,
      tokenNo: "1108",
      status: "booked",
      changedCentre: false,
      createdAt: nowIso(),
      queuePos: 3,
    },
    {
      id: "BK-DEMO-LAX",
      farmerId: "U-F2",
      farmerName: "Lakshmi Devi",
      phone: "9123456780",
      centreId: "C1",
      centreName: "Narsingi PPC",
      slotId: slotC1 ? slotC1.id : slots[0].id,
      date: todayStr,
      window: "09:00-11:00",
      qtyQuintal: 18,
      tokenNo: "1105",
      status: "checked_in",
      changedCentre: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      queuePos: 1,
    },
    {
      id: "BK-DEMO-DONE",
      farmerId: "U-F2",
      farmerName: "Lakshmi Devi",
      phone: "9123456780",
      centreId: "C2",
      centreName: "Shamshabad PPC",
      slotId: slotC2 ? slotC2.id : slots[1].id,
      date: todayStr,
      window: "11:00-13:00",
      qtyQuintal: 20,
      tokenNo: "2214",
      status: "paid",
      changedCentre: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      queuePos: 4,
    },
  ];
  if (slotC1) slotC1.booked = Math.max(slotC1.booked, 6);

  const weighments = [
    {
      id: "W-DEMO-1",
      bookingId: "BK-DEMO-DONE",
      farmerId: "U-F2",
      netQuintal: 19.6,
      faq: "FAQ",
      rate: 2300,
      amount: 45080,
      receipt: "RCPT-2214",
      t: new Date(Date.now() - 80000000).toISOString(),
    },
  ];
  const trips = [
    {
      id: "TR-DEMO-1",
      bookingId: "BK-DEMO-DONE",
      centreId: "C2",
      mill: "Civil Supplies Mill – Rangareddy",
      vehicle: "TS09 GD 4421",
      driver: "M. Naresh",
      status: "delivered",
      t: new Date(Date.now() - 70000000).toISOString(),
    },
  ];
  const payments = [
    {
      id: "PAY-DEMO-1",
      bookingId: "BK-DEMO-DONE",
      farmerId: "U-F2",
      farmerName: "Lakshmi Devi",
      phone: "9123456780",
      amount: 45080,
      bank: "Union ****8891",
      status: "paid",
      utr: "UTRN8823410091",
      paidAt: new Date(Date.now() - 60000000).toISOString(),
      t: new Date(Date.now() - 65000000).toISOString(),
    },
  ];
  const sms = [
    { id: "SMS-1", phone: "9876543210", text: "AnnaSetu: Token 1108 booked at Narsingi PPC today 09:00-11:00. Arrive 15 min early.", kind: "booking", t: nowIso(), provider: "demo-outbox", ok: true, detail: "pitch seed" },
    { id: "SMS-2", phone: "9123456780", text: "AnnaSetu: ₹45080 credited. UTR UTRN8823410091. Token 2214 complete.", kind: "payment", t: nowIso(), provider: "demo-outbox", ok: true, detail: "pitch seed" },
  ];

  db.centres = centres;
  db.users = users;
  db.slots = slots;
  db.bookings = bookings;
  db.weighments = weighments;
  db.trips = trips;
  db.payments = payments;
  db.sms = sms;
  db.events = [
    { t: nowIso(), text: "Pitch data ready: Ravi token 1108 waiting at Narsingi." },
    { t: nowIso(), text: "Lakshmi Devi paid ₹45,080 DBT (UTR UTRN8823410091)." },
    { t: nowIso(), text: "Siddipet PPC marked crowded — farmers can change centre once." },
  ];
  save(db);
  return db;
}

module.exports = { load, save, seedIfEmpty, id, nowIso, FILE };
