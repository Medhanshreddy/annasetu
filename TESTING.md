# Launch checks (2026-08-30)

Automated (`node test-api.js` against running server):

- health
- farmer login / bad pin
- OTP request + verify
- centres
- farmer booking visible
- farmer notifications API
- district login
- live queue + realtime rollup
- website HTML
- farmer SMS outbox removed from UI

Manual checklist:

- Farmer register + OTP login
- Book slot
- Gate pass shows a real QR image
- Track trail updates after district changes status
- Farmer More has App notifications, not SMS outbox
- Centre live board check-in / weigh
- Enable phone banners on More
