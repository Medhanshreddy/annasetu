# AnnaSetu — iPhone + laptop (OTP only)

Apple does not allow a website or APK to silently send SMS from an iPhone SIM.
This project uses the honest Mode 2 that still uses YOUR number **9666939399**:

1. Farmer taps Send OTP on any device.
2. Your iPhone (SMS station) shows that message.
3. You tap **Send from iPhone** → Apple Messages opens, already filled.
4. You tap Send. The SMS leaves from SIM 9666939399 to the farmer.

Laptop district office and phone stay on the SAME server, so a token booked on phone appears on the laptop in about 4 seconds.

## Every time you demo

Laptop PowerShell:

```
cd "C:\Users\Murki Srihith\OneDrive\Desktop\Medhansh(Hackathon)\annasetu-sih26032\annasetu"
node server.js
```

Leave it open.

Laptop Chrome: http://localhost:8080

Find laptop IPv4 (`ipconfig`) example 192.168.1.8

iPhone Safari: http://192.168.1.8:8080
Same Wi-Fi. Add to Home Screen = the phone app.

## Logins — OTP only (no PIN screen)

| Who | Number | How |
|---|---|---|
| iPhone SMS station (you) | 9666939399 | Send OTP, use the 6 digits shown, then send farmer OTPs from Messages |
| Farmer Ravi | 9876543210 | Send OTP |
| District admin | 9000000004 | Send OTP |
| Centre | 9000000001 | Send OTP |

## APK note
APK is Android only. iPhone cannot install APK.
On iPhone use Safari → Share → Add to Home Screen.
That is the iPhone app.

## Files
- server.js — laptop server
- db.js — SQLite database
- public/ — website + phone UI
- START-HERE-IPHONE.md — this file
