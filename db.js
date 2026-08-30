const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DIR = process.env.ANNASETU_DB_DIR || path.join(__dirname, "data");
const FILE = path.join(DIR, "annasetu.db");

function id(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nowIso() {
  return new Date().toISOString();
}

function istParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t) => parts.find((p) => p.type === t).value;
  return { ymd: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")), minute: Number(g("minute")) };
}

function ensureHourlySlots(db) {
  const { ymd: today, hour, minute } = istParts();
  const centres = db.prepare("SELECT id, capacity, status FROM centres").all();
  const ins = db.prepare("INSERT INTO slots VALUES (?,?,?,?,?,?)");
  const exists = db.prepare("SELECT id FROM slots WHERE centre_id=? AND date=? AND window=?");
  for (let day = 0; day < 5; day++) {
    const d = new Date(`${today}T00:00:00+05:30`);
    d.setDate(d.getDate() + day);
    const date = d.toISOString().slice(0, 10);
    for (let h = 7; h < 17; h++) {
      const window = String(h).padStart(2, "0") + ":00–" + String(h + 1).padStart(2, "0") + ":00";
      for (const c of centres) {
        if (exists.get(c.id, date, window)) continue;
        let booked = c.status === "crowded" ? 8 : 2;
        if (day === 0 && (h < hour || (h === hour && minute >= 55))) booked = 0;
        ins.run(id("SL"), c.id, date, window, c.capacity || 18, booked);
      }
    }
  }
}

function connect() {
  let file = FILE;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = DELETE;");
    db.exec("PRAGMA foreign_keys = ON;");
    return afterSchema(db);
  } catch (e) {
    file = path.join("/tmp/annasetu-data", "annasetu.db");
    fs.mkdirSync("/tmp/annasetu-data", { recursive: true });
    const db = new DatabaseSync(file);
    db.exec("PRAGMA journal_mode = DELETE;");
    db.exec("PRAGMA foreign_keys = ON;");
    return afterSchema(db);
  }
}

function afterSchema(db) {
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      pin TEXT NOT NULL,
      village TEXT,
      district TEXT,
      aadhaar TEXT,
      land_acres REAL,
      crop TEXT,
      bank TEXT,
      ifsc TEXT,
      centre_id TEXT,
      vehicle TEXT,
      lang TEXT DEFAULT 'en'
    );
    CREATE TABLE IF NOT EXISTS centres (
      id TEXT PRIMARY KEY,
      name TEXT,
      mandal TEXT,
      district TEXT,
      lat REAL,
      lng REAL,
      capacity INTEGER,
      open_at TEXT,
      close_at TEXT,
      crop TEXT,
      status TEXT,
      wait_min INTEGER
    );
    CREATE TABLE IF NOT EXISTS slots (
      id TEXT PRIMARY KEY,
      centre_id TEXT,
      date TEXT,
      window TEXT,
      capacity INTEGER,
      booked INTEGER
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      farmer_name TEXT,
      phone TEXT,
      centre_id TEXT,
      centre_name TEXT,
      slot_id TEXT,
      date TEXT,
      window TEXT,
      qty REAL,
      token_no TEXT,
      status TEXT,
      changed_centre INTEGER DEFAULT 0,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS weighments (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      farmer_id TEXT,
      net_q REAL,
      faq TEXT,
      rate INTEGER,
      amount INTEGER,
      receipt TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      centre_id TEXT,
      mill TEXT,
      vehicle TEXT,
      driver TEXT,
      status TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT,
      farmer_id TEXT,
      farmer_name TEXT,
      phone TEXT,
      amount INTEGER,
      bank TEXT,
      status TEXT,
      utr TEXT,
      created_at TEXT,
      paid_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sms (
      id TEXT PRIMARY KEY,
      phone TEXT,
      text TEXT,
      kind TEXT,
      provider TEXT,
      ok INTEGER,
      detail TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      text TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS otps (
      phone TEXT PRIMARY KEY,
      otp TEXT,
      exp INTEGER
    );
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      farmer_id TEXT,
      farmer_name TEXT,
      phone TEXT,
      topic TEXT,
      message TEXT,
      status TEXT,
      created_at TEXT
    );
  `);
  return db;
}

function seed(db) {
  try {
  const n = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  const cN = db.prepare("SELECT COUNT(*) AS c FROM centres").get().c;
  if (n && cN) return;

  const centres = [
    ["C1", "Narsingi PPC", "Gandipet", "Rangareddy", 17.385, 78.339, 18, "07:00", "17:00", "Paddy", "open", 18],
    ["C2", "Shamshabad PPC", "Shamshabad", "Rangareddy", 17.24, 78.429, 20, "07:00", "17:00", "Paddy", "busy", 42],
    ["C3", "Medchal IKP", "Medchal", "Medchal-Malkajgiri", 17.63, 78.481, 16, "07:00", "16:30", "Paddy", "open", 14],
    ["C4", "Warangal IKP", "Hanamkonda", "Hanumakonda", 17.978, 79.594, 24, "06:30", "17:30", "Paddy", "open", 28],
    ["C5", "Siddipet PPC", "Siddipet", "Siddipet", 18.102, 78.852, 14, "07:00", "16:00", "Paddy", "crowded", 72],
    ["C6", "Nalgonda IKP", "Nalgonda", "Nalgonda", 17.057, 79.267, 18, "07:00", "17:00", "Paddy", "open", 16],
  ];
  if (!cN) {
    const insC = db.prepare(
      "INSERT OR IGNORE INTO centres VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
    );
    for (const c of centres) insC.run(...c);
  }

  const insU = db.prepare(
    "INSERT OR IGNORE INTO users (id,role,name,phone,pin,village,district,aadhaar,land_acres,crop,bank,ifsc,centre_id,vehicle,lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  insU.run("U-F1", "farmer", "Ravi Kumar", "9876543210", "1234", "Narsingi", "Rangareddy", "XXXX-XXXX-3210", 3.2, "Paddy", "SBI ****4412", "SBIN0001234", null, null, "en");
  insU.run("U-F2", "farmer", "Lakshmi Devi", "9123456780", "1234", "Shamshabad", "Rangareddy", "XXXX-XXXX-6780", 2.0, "Paddy", "Union ****8891", "UBIN0532100", null, null, "te");
  insU.run("U-C1", "centre", "Srinivas Rao", "9000000001", "1234", "", "Rangareddy", "", 0, "", "", "", "C1", null, "en");
  insU.run("U-T1", "transport", "M. Naresh", "9000000002", "1234", "", "Rangareddy", "", 0, "", "", "", null, "TS09 GD 4421", "en");
  insU.run("U-P1", "payment", "Ananya Reddy", "9000000003", "1234", "", "Rangareddy", "", 0, "", "", "", null, null, "en");
  insU.run("U-A1", "admin", "District Controller", "9000000004", "1234", "", "Rangareddy", "", 0, "", "", "", null, null, "en");
  insU.run("U-M1", "minister", "State Command", "9000000005", "1234", "", "Telangana", "", 0, "", "", "", null, null, "en");

  const ymd = (off) => {
    const d = new Date();
    d.setDate(d.getDate() + off);
    return d.toISOString().slice(0, 10);
  };
  const windows = ["07:00–09:00", "09:00–11:00", "11:00–13:00", "13:00–15:00", "15:00–17:00"];
  const insS = db.prepare("INSERT INTO slots VALUES (?,?,?,?,?,?)");
  for (const c of centres) {
    for (let day = 0; day < 5; day++) {
      for (const w of windows) {
        const booked = c[10] === "crowded" ? 12 : day === 0 ? 4 : 2;
        insS.run(id("SL"), c[0], ymd(day), w, c[6], booked);
      }
    }
  }

  const today = ymd(0);
  const slot = db.prepare("SELECT id FROM slots WHERE centre_id='C1' AND date=? AND window LIKE '09:00%'").get(today);
  const slotId = slot ? slot.id : db.prepare("SELECT id FROM slots LIMIT 1").get().id;

  const insB = db.prepare(
    "INSERT INTO bookings VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
  );
  insB.run("BK-RAVI", "U-F1", "Ravi Kumar", "9876543210", "C1", "Narsingi PPC", slotId, today, "09:00–11:00", 24, "1108", "booked", 0, nowIso());
  insB.run("BK-LAX", "U-F2", "Lakshmi Devi", "9123456780", "C1", "Narsingi PPC", slotId, today, "09:00–11:00", 18, "1105", "checked_in", 0, nowIso());
  insB.run("BK-PAID", "U-F2", "Lakshmi Devi", "9123456780", "C2", "Shamshabad PPC", slotId, today, "11:00–13:00", 20, "2214", "paid", 1, nowIso());

  db.prepare("INSERT INTO weighments VALUES (?,?,?,?,?,?,?,?,?)").run(
    "W1", "BK-PAID", "U-F2", 19.6, "FAQ", 2300, 45080, "RCPT-2214", nowIso()
  );
  db.prepare("INSERT INTO trips VALUES (?,?,?,?,?,?,?,?)").run(
    "TR1", "BK-PAID", "C2", "FCI / Civil Supplies Mill, Rangareddy", "TS09 GD 4421", "M. Naresh", "delivered", nowIso()
  );
  db.prepare("INSERT INTO payments VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(
    "PAY1", "BK-PAID", "U-F2", "Lakshmi Devi", "9123456780", 45080, "Union ****8891", "paid", "UTRN8823410091", nowIso(), nowIso()
  );
  db.prepare("INSERT INTO sms VALUES (?,?,?,?,?,?,?,?)").run(
    "SMS1", "9876543210", "AnnaSetu: Token 1108 confirmed at Narsingi PPC, 09:00–11:00. Arrive 15 min early.", "booking", "demo-outbox", 1, "seed", nowIso()
  );
  db.prepare("INSERT INTO events VALUES (?,?,?)").run(id("EV"), "Pitch database ready — 6 Telangana centres live.", nowIso());
  db.prepare("INSERT INTO events VALUES (?,?,?)").run(id("EV"), "Ravi Kumar holding token 1108 at Narsingi.", nowIso());
  db.prepare("INSERT INTO events VALUES (?,?,?)").run(id("EV"), "DBT ₹45,080 paid to Lakshmi Devi.", nowIso());
  ensureHourlySlots(db);
  } catch (e) {
    console.warn("seed skipped:", e.message);
  }
}

function reset() {
  const db = connect();
  db.exec(`
    DELETE FROM events; DELETE FROM sms; DELETE FROM payments;
    DELETE FROM trips; DELETE FROM weighments; DELETE FROM bookings;
    DELETE FROM slots; DELETE FROM centres; DELETE FROM users;
  `);
  seed(db);
  db.close();
}

function ensureDemoUsers(db) {
  try { db.exec("ALTER TABLE users ADD COLUMN active INTEGER DEFAULT 1"); } catch {}
  const rows = [
    ["U-F1", "farmer", "Ravi Kumar", "9876543210", "1234", "Narsingi", "Rangareddy", 1],
    ["U-F2", "farmer", "Lakshmi Devi", "9123456780", "1234", "Shamshabad", "Rangareddy", 1],
    ["U-F3", "farmer", "Suresh Yadav", "9001110001", "1234", "Medchal", "Medchal-Malkajgiri", 1],
    ["U-F4", "farmer", "Padma Reddy", "9001110002", "1234", "Warangal", "Hanumakonda", 1],
    ["U-F5", "farmer", "Imran Ali", "9001110003", "1234", "Siddipet", "Siddipet", 1],
    ["U-C1", "centre", "Srinivas Rao", "9000000001", "1234", "", "Rangareddy", 1],
    ["U-T1", "transport", "M. Naresh", "9000000002", "1234", "", "Rangareddy", 1],
    ["U-P1", "payment", "Ananya Reddy", "9000000003", "1234", "", "Rangareddy", 1],
    ["U-O1", "officer", "Kiran Teja", "9002220001", "1234", "", "Rangareddy", 1],
    ["U-O2", "officer", "Bhavani Devi", "9002220002", "1234", "", "Hanumakonda", 1],
    ["U-O3", "officer", "Praveen Goud", "9002220003", "1234", "", "Siddipet", 0],
    ["U-O4", "officer", "N. Fatima", "9002220004", "1234", "", "Nalgonda", 1],
    ["U-H1", "collector", "Collector Rangareddy", "9003330001", "1234", "", "Rangareddy", 1],
    ["U-H2", "collector", "Collector Hanumakonda", "9003330002", "1234", "", "Hanumakonda", 1],
    ["U-A1", "admin", "District Controller", "9000000004", "1234", "", "Rangareddy", 1],
    ["U-M1", "minister", "Minister Civil Supplies", "9000000005", "1234", "", "Telangana", 1],
  ];
  const ins = db.prepare("INSERT OR IGNORE INTO users (id,role,name,phone,pin,village,district,aadhaar,land_acres,crop,bank,ifsc,centre_id,vehicle,lang) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
  const up = db.prepare("UPDATE users SET role=?, name=?, pin=?, district=?, active=? WHERE phone=?");
  try { db.prepare("DELETE FROM users WHERE phone='9666939399'").run(); } catch {}
  for (const r of rows) {
    ins.run(r[0], r[1], r[2], r[3], r[4], r[5], r[6], "", 1, "Paddy", "", "", null, null, "en");
    try { up.run(r[1], r[2], r[4], r[6], r[7], r[3]); } catch {}
  }
}

module.exports = { connect, seed, reset, id, nowIso, FILE, ensureHourlySlots, istParts, ensureDemoUsers };
