# HeatShield AI

HeatShield AI is a standalone TanStack Start + React application for hyperlocal heat intelligence.

## Requirements
- Node.js 20+ recommended
- npm
- Android Studio + Android SDK for APK builds

## Install
```bash
npm install
```

## Environment
Copy `.env.example` to `.env`.

- `VITE_GOOGLE_MAPS_BROWSER_KEY`: optional browser key for Google Maps. Without it, the app uses the built-in canvas renderer.
- `VITE_GOOGLE_MAPS_TRACKING_ID`: optional Google Maps channel.
- `FORTYGUARD_API_KEY`: optional server-only key. Without it, the app uses deterministic simulated readings.

Do not put `FORTYGUARD_API_KEY` in a `VITE_*` variable.

## Local development
```bash
npm run dev
```
Open http://localhost:5173

## Production build
```bash
npm run build
npm run preview
```

The application contains local browser authentication and does not require a hosted authentication provider or database.

## Android
Install Android Studio and ensure the Android SDK, platform tools, and a compatible JDK are installed.

```bash
npm run android:sync
npx cap open android
```

For a debug APK on Windows:
```bash
npm run android:build
```

The debug APK is normally produced at:
`android/app/build/outputs/apk/debug/app-debug.apk`

The Android shell is standalone, but live FortyGuard data and Google Maps remain optional external services. The app falls back to local data and its canvas map when those services are unavailable.
