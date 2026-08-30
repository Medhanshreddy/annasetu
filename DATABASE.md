# Database (already implemented)

File on your laptop:

`annasetu/data/annasetu.db`

This one SQLite file stores:

- users / login numbers
- OTP codes
- login sessions
- centres and slots
- tokens / bookings
- weighment, transport, payments
- SMS outbox

Phone and laptop stay in sync **only if both open the same laptop server**.

Automatic SMS from iPhone SIM is not possible (Apple rule).
Automatic SMS from the **server** is possible with MSG91 later:

```
set MSG91_AUTH_KEY=your_key
node server.js
```

Until then OTP is created in the database and shown after Send OTP.
