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
O
```bash
export MSG91_AUTH_KEY=your_key
# or
export TWILIO_ACCOUNT_SID=...
export TWILIO_AUTH_TOKEN=...
export TWILIO_FROM=+1...
npm start
```
Crop setting: **Telangana paddy MSP procurement** (Hyderabad-region centres).
