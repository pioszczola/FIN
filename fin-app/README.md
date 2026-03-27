# FIN — Personal Finance App

React Native (Expo) app for tracking assets and expenses with multi-currency support.

## Features

- Google Sign-In + Apple Sign-In
- Assets in any currency, auto-converted to PLN via ECB rates
- Expenses with "done" toggle — done expenses are excluded from balance calculation
- Real-time sync via Firebase Firestore

---

## Setup Guide

### Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. "fin-app") → Continue
3. Disable Google Analytics if not needed → **Create project**

### Step 2 — Add an iOS App

1. In your project, click the **iOS icon** (</>) to add an app
2. iOS bundle ID: `com.fin.app`
3. Download `GoogleService-Info.plist` (you'll need values from it later)
4. Skip the remaining steps in the wizard

### Step 3 — Enable Authentication

1. Go to **Authentication** → **Get started**
2. Enable **Google**:
   - Toggle it on
   - Set a support email
   - Click **Save**
   - Note the **Web client ID** (you'll need it)
3. Enable **Apple**:
   - Toggle it on → Save
   - (Apple Sign-In requires an Apple Developer account for production builds)

### Step 4 — Enable Firestore

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in production mode** → select a region close to you → **Enable**
3. Go to **Rules** tab and replace with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**

### Step 5 — Get Firebase Config

1. Go to **Project settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click your iOS app
3. You'll see `firebaseConfig` — copy each value

### Step 6 — Configure the App

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=          # apiKey from firebaseConfig
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=      # authDomain from firebaseConfig
EXPO_PUBLIC_FIREBASE_PROJECT_ID=       # projectId from firebaseConfig
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=   # storageBucket from firebaseConfig
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID= # messagingSenderId from firebaseConfig
EXPO_PUBLIC_FIREBASE_APP_ID=           # appId from firebaseConfig

# From Authentication → Sign-in method → Google → Web SDK configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=      # Web client ID

# From GoogleService-Info.plist → CLIENT_ID field
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=      # iOS client ID
```

### Step 7 — Run the App

```bash
npm install
npx expo start
```

Press `i` to open in iOS Simulator or scan the QR code with Expo Go.

---

## Production Build (iOS)

For a production build with Apple Sign-In working:

1. You need an Apple Developer account
2. Run: `npx expo prebuild` then build with Xcode or EAS Build
3. Apple Sign-In must be configured in your Apple Developer portal

## Tech Stack

- **Expo SDK 55** + **Expo Router** (file-based navigation)
- **Firebase** (Auth + Firestore)
- **Frankfurter API** (ECB exchange rates, no API key required)
- **TypeScript**
