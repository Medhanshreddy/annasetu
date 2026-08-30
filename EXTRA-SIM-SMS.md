# Extra SIM SMS — honest setup

A second SIM in your phone **cannot** send OTP by itself. Android blocks websites from using your SIM.

You need a free Android app that turns that phone into an **SMS gateway**. AnnaSetu then tells that app: “send this text from the extra SIM”.

## What works for a student pitch

### Mode A — always works (use this if judges are watching)
Keep SIM mode **off**.
OTP appears on screen + SMS outbox.
Looks professional. No extra app.

### Mode B — extra SIM really sends the SMS
You need:
- Android phone with the extra SIM set as **SMS SIM**
- Laptop and phone on **same Wi‑Fi**
- App: **SMSGate** (sms-gate.app) or any “SMS Gateway API” app

Steps:
1. On the extra-SIM phone, install SMSGate / SMS Gateway.
2. Set the extra SIM as default for SMS (Android Settings → SIM → SMS).
3. Start the local server in that app. Note the URL, example:
   `http://192.168.1.14:8080/message`
4. On laptop Chrome open:
   `http://localhost:8080/lab.html`
5. Paste that URL → Save SIM mode.
6. Click **Request OTP**. The extra SIM should send the text.

If the phone sleeps, Wi‑Fi blocks local devices, or the app is closed, SMS will fail. Then switch back to outbox mode.

Paid MSG91/Twilio is optional later. Not required for SIH.
