# AnnaSetu — SIH26032

Farmer procurement platform for the Ministry of Consumer Affairs, Food & Public Distribution (DoCA).

Problem: long waits, no slot information, unclear procurement / payment status.

## What this prototype does
- Farmer registration and slot booking
- Live queue + centre token board
- Change centre **once** if crowded
- Weighment receipt
- Transport lift → mill delivery
- Payment officer DBT release
- District admin dashboard
- SMS outbox (real MSG91 / Twilio if keys exist)
- English / हिन्दी / తెలుగు
- Mobile-first PWA that looks like an Android app; also runs in desktop browser

## Run
```bash
cd annasetu
npm install
npm start
```
Open http://localhost:8080

## Demo logins (PIN 1234)
| Role | Phone |
|---|---|
| Farmer Ravi | 9876543210 |
| Centre staff (Narsingi) | 9000000001 |
| Transport | 9000000002 |
| Payment officer | 9000000003 |
| District admin | 9000000004 |

## Real SMS
Default mode stores every alert in the in-app outbox (judges can see the exact message).

To send live SMS:

```bash
export MSG91_AUTH_KEY=your_key
# or
export TWILIO_ACCOUNT_SID=...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM=+1...
npm start
```

## Suggested 4-minute demo path
1. Login as farmer → book Narsingi slot → show token + wait time
2. Switch language to తెలుగు
3. Login as centre → check-in → weigh
4. Login as transport → lift → deliver
5. Login as payment → release DBT
6. Farmer track screen + SMS outbox
7. Admin dashboard

Crop setting: **Telangana paddy MSP procurement** (Hyderabad-region centres).
