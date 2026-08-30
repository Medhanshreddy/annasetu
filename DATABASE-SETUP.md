# Database first — then APK

You were right to reject “Add to Home screen” as the product. That is only a shortcut.
The real product is:

```
Phone APK  ──►  one AnnaSetu server  ──►  one database file
PC website ──►         same server    ──►  same file
```

50 farmers can log in. They all hit **one** server and **one** `annasetu.db`.
Do not copy the project to 50 phones as 50 databases.

---

## What the database is

File:

`annasetu/data/annasetu.db`

It is SQLite. No MySQL install. `node server.js` opens it.

Inside: users, OTP, sessions, centres, slots, bookings, queue, payments, notifications.

50 logins is fine for SIH. Thousands of writes per second is not the goal.

---

## Step 1 — run the database (do this first, every time)

On the PC:

```
cd path\to\annasetu
node server.js
```

Leave this window open. If it closes, the phone and the website have nothing to talk to.

PC browser: http://localhost:8080

Find the PC IPv4 (`ipconfig` → Wireless LAN → IPv4). Example `192.168.1.8`.

Phone Chrome can open `http://192.168.1.8:8080` only to **test**. That is not your APK.

---

## Step 2 — point the future APK at that server

Edit `annasetu/public/config.js`:

Same Wi-Fi as the PC (demo in lab):

```
window.ANNASETU_CLOUD = "http://192.168.1.8:8080";
```

Use **your** IP, not this example.

Laptop off / outside Wi-Fi: host `server.js` on Render first, then:

```
window.ANNASETU_CLOUD = "https://your-app.onrender.com";
```

Save the file. This URL is baked into the APK when you build. If you change the URL later, build the APK again.

---

## Step 3 — build the APK on YOUR PC (Android Studio)

This environment cannot output a working `.apk`. You build it once Step 1 works.

```
cd path\to\annasetu
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap copy
npx cap open android
```

Android Studio → Build → Build APK(s).
Install that APK on the phone.

Phone and PC now use the same database **if** `config.js` URL is the running server.

---

## What TO do

- One `node server.js` only.
- One `data/annasetu.db` only.
- Same Wi-Fi for PC + phones while using a LAN IP.
- Keep the server window open during the demo.
- After Render URL exists, put it in `config.js` then rebuild APK.

## What NOT to do

- Do not treat “Add to Home screen” as the app (you already decided this).
- Do not install 50 copies of the project folder as 50 databases.
- Do not build the APK before `config.js` has a real server URL.
- Do not shut the PC if the APK still points at `192.168.x.x`.
- Do not edit `data/db.json` — that file is leftover. Live data is `annasetu.db`.
- Do not expect SMS to replace the database. Login PIN / on-screen OTP is enough.

---

## 50 users

They all call `/api/login`, `/api/book`, `/api/queue`.
SQLite + Node on a laptop handles that for a judging room.
If two people book the last slot, the second gets “Slot full”. That is correct.
