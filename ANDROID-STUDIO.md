# Make APK in Android Studio (same project, not a second app)

Web and APK should be THE SAME AnnaSetu folder.
Do not maintain two copies.

## Install on your laptop
1. Node.js (already if the website runs)
2. Android Studio: https://developer.android.com/studio
3. Open Android Studio once so it installs Android SDK / platform tools.

## In PowerShell, inside annasetu folder
```
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap copy
npx cap open android
```

Android Studio opens. Wait for Gradle.

Menu: Build → Build Bundle(s) / APK(s) → Build APK(s).
APK path is shown when it finishes. Copy that APK to the phone and install (allow unknown sources).

## Important
The APK shows the UI. Login still needs the laptop server running
(`node server.js`) on the same Wi-Fi unless you later host the server on the internet.

For college demo: laptop server + phone APK or phone Chrome is enough.
