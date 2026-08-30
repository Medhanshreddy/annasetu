# Real APK — only on YOUR Windows laptop with Android Studio

This chat cannot produce a working .apk. Any file named apk from here would be dummy and will not install. Build it locally.

## What the APK talks to
The APK is the same website wrapped. It calls the API in `public/config.js` → `ANNASETU_CLOUD`.

1. First host the server (Render) and get `https://something.onrender.com`
2. Put that URL in `public/config.js`
3. Then build the APK
4. Phone and website both hit that URL → one database → synced
5. If you build APK **before** setting the cloud URL, the APK will look at localhost on the phone and fail. Set the URL first.

## Install Android Studio (once)
1. https://developer.android.com/studio
2. Install. Open it. Finish SDK setup. Accept licenses.
3. Install Node.js LTS if not already.

## In the annasetu folder
```
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init AnnaSetu in.gov.annasetu --web-dir public
npx cap add android
npx cap copy
npx cap open android
```

Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s).
APK path is shown in a popup. Copy to phone. Allow install from this source.

## Notifications on the phone
Browser banners work when the PWA/APK is open and you tapped Enable phone banners.
True background push needs Firebase later. For SIH, in-app + banner while open is enough.

## Test the APK
1. Cloud URL opens in Chrome and works.
2. APK opens the same screens.
3. Book a token in APK.
4. Open the same cloud URL on laptop as Collector.
5. Token appears. If not, config.js URL is wrong or APK was built before you set it.
