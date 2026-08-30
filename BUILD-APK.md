# How AnnaSetu becomes a phone app

The website is already a PWA (Progressive Web App).

## For SIH demo (do this)
On Android Chrome: open http://YOUR-LAPTOP-IP:8080 → menu → **Add to Home screen** / **Install app**.
It opens full screen like an APK.

## Real Play Store APK (later, on your laptop)
Needs Android Studio. After Node app runs:

```
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init AnnaSetu in.gov.annasetu
npx cap add android
npx cap copy
npx cap open android
```

Then Build → Generate Signed Bundle / APK.

This sandbox cannot compile a signed Play Store APK.
