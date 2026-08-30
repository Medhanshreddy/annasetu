# What to run first

Do **not** build the APK first.

## 1. Database + website (required)
This is the brain. Phone and PC both talk to it.

```
cd annasetu
node server.js
```

PC Chrome: http://localhost:8080

That SQLite file `data/annasetu.db` is the database.

For laptop-off later: host the same folder on Render (CLOUD-FREE.md), then put the https URL in `public/config.js`:

```
window.ANNASETU_CLOUD = "https://YOUR-APP.onrender.com";
```

## 2. Phone without APK (today)
Same Wi-Fi as the laptop:
Chrome on Android → http://LAPTOP-IP:8080 → Add to Home screen.

If cloud URL is set, open that https link instead.

## 3. APK last (Android Studio on YOUR PC)
Only after step 1 works, and after config.js has the cloud URL if you want laptop-off.

See APK-STEPS.md.

This chat cannot compile a real .apk. A fake file will not install.
