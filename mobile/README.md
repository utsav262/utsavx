# UtsavX mobile (customer app)

React Native CLI app for **ticket buyers only**, Android only. It talks to the same API as the website (`server/`). Organizer, staff and admin features are deliberately left out: the app never calls `/manager`, staff scan/sell or `/api/admin`, and organizer or admin accounts can't sign in. They're told to use the website instead.

## Flow

App opens on the splash, then **Welcome → Login / Register** if you're signed out. The tabs open only after sign-in; signing out goes back to Welcome.

| Tab / screen | What it does |
|---|---|
| Welcome / Login / Register | Brand art, sign in, create an account (live password checklist) |
| Home | Greeting, search, categories, upcoming-events carousel, popular cities, more events |
| Explore | Search plus filters (category, city, This Weekend / Next Weekend / This Month), infinite scroll |
| Event | Details, ticket types, quantity, add to cart, related events |
| Cart → Checkout | One order per event, Razorpay Checkout (UPI / cards / netbanking) in a WebView, then server-side verify |
| Tickets | Upcoming / past tickets; each ticket opens a pass with its QR code |
| Account | Profile and photo, change password, orders, notifications, help |

Sign-up always creates a `customer` account.

## Run it

1. Only if `USE_LOCAL_API` is on: start the API from the repo root with `npm run dev --prefix server`
2. Install: `cd mobile && npm install`
3. Start an Android emulator (or plug in a phone with USB debugging on)
4. `npm start` in one terminal, `npm run android` in another

Metro for this app runs on port **8082** (set in `package.json` and `android/gradle.properties`), so it can run next to another React Native project on the default 8081. If the phone was reconnected, run `adb reverse tcp:8082 tcp:8082`.

### Pointing the app at the API

By default the app (debug and release) talks to the deployed API, `https://utsavx.onrender.com/api/v1`, which is the same base URL as the manager app. You don't need a local server for that.

The free Render plan sleeps when idle, and the first request can take about a minute. The app pings `/health` during the splash so the server is usually awake by the time you sign in.

To use your own computer's API instead, set `USE_LOCAL_API = true` in `src/config.js`:

- **Emulator**: `http://10.0.2.2:5050/api/v1`.
- **Phone over USB**: `http://localhost:5050/api/v1`. `npm run android` runs `adb reverse tcp:5050 tcp:5050` for you; run it by hand if you reconnect the phone.

In development the sign-in screen has a link that fills in the seeded customer (`emma@utsavx.com` / `password123`).

### Payments

- With Razorpay keys on the server, Checkout opens Razorpay in a WebView. UPI app links are handed to the installed app.
- Without keys (local dev), the server completes orders as demo payments and tickets appear straight away.

## Brand, splash and icon

- Theme: dark navy with the logo's orange → magenta → purple gradient (`src/theme.js`).
- `src/assets/images/Splassh.png` is the full-screen splash; `icon.png` / `monochrome.png` are the source logos.
- `src/assets/brand/logo-mark.png` and `logo-full.png` are the logo cut out of `monochrome.png` with a transparent background.
- Native splash (logo on `#00011D`, shown while JS loads) comes from `react-native-bootsplash`. To regenerate it:
  `npx react-native-bootsplash generate src/assets/brand/logo-mark.png --platforms=android --background=00011D --logo-width=110`
- Launcher icons live in `android/app/src/main/res/mipmap-*`.

## Layout

```
src/
  App.js              providers + splash hand-off
  config.js           API URL, hold time, max tickets
  theme.js            dark UtsavX theme
  api/                fetch client + customer-only endpoints
  context/            AuthContext (customer-only session), CartContext (saved cart)
  navigation/         auth stack (signed out) / tabs + stack (signed in)
  screens/            one file per screen
  components/         ui kit, EventCards, TabBar, SplashScreen, AuthLayout, RazorpayCheckout, …
  lib/                formatting, event/ticket helpers, validation
```

## Checks

```sh
npm run lint
npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output /tmp/index.android.bundle
cd android && ./gradlew assembleDebug
```
