# AnnaSetu architecture (what you drew)

```
Web (laptop Chrome)
        \ 
         →  Central API (Node server.js)  →  Database (SQLite file annasetu.db)
        /
Mobile (PWA / later APK)
```

Same as your diagram. We use SQLite instead of MySQL so a first-year laptop can run it with `node server.js` and no extra install.

## Two modes (this is the truth)

### A. Laptop is ON (shared live database)
Phone and district both open the laptop URL.
One database. Token booked on phone appears on district screen.

### B. Laptop is OFF
Phone still works using the **on-device database** (`localStorage` / LocalAPI).
Farmer can login OTP, book, see token.

District head on another device **cannot** see that phone data until a central server is online again.
No app in the world syncs two devices if every computer is off and there is no cloud.

To have laptop-off + district access you must host `server.js` on a free cloud (Render / Railway) and put that URL in the app. Then the cloud is the “laptop that never sleeps”.

## APK
This environment cannot compile a signed Android APK (no Android SDK).
On your Android now:

Chrome → open the site → menu → **Add to Home screen**.
That is the installable app for SIH.

Real APK later on YOUR laptop with Android Studio: see BUILD-APK.md.

## SMS
Automatic SMS needs the Android gateway reachable from the API machine.
If Wi-Fi / Tailscale is down, OTP still shows on screen from the database.
