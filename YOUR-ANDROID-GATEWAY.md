# Your Android SMS setup

- Sending SIM: 6309752008
- Gateway: http://100.123.155.56:8080/send-sms
- First test receive number: 9666939399
- OTP always shown on screen AND sent through the Android phone when the laptop can reach that URL

## Must be true at send time
1. Simple SMS Gateway app is OPEN on the Android.
2. Laptop can open that URL (same Wi-Fi, or Tailscale on BOTH devices).
3. Android SMS permission granted to the app.
4. 6309752008 is the SMS SIM.

If Wi-Fi is different and Tailscale is off, the laptop cannot see 100.123.155.56 and SMS will fail. OTP still appears on screen so login works.
