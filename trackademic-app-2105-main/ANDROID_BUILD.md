# Building Trackademic for Android

This project uses **Capacitor** to package the web app as a native Android application. The layout and UI are unchanged—it runs as a WebView with your full web app inside.

## Prerequisites

- **Node.js** (v18+)
- **Android Studio** (for building the APK)
- **Java JDK 17** (usually installed with Android Studio)

## Build the Android APK

### 1. Build the web app and sync to Android

```bash
npm run android:build
```

This will:
- Build the Vite web app (`npm run build`)
- Copy assets into the Android project (`npx cap sync android`)

### 2. Open in Android Studio

```bash
npm run android:open
```

Or open the `android` folder manually in Android Studio.

### 3. Build the APK in Android Studio

1. Wait for Gradle sync to finish
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. When done, click **locate** in the notification to find the APK

The APK will be at:
`android/app/build/outputs/apk/debug/app-debug.apk`

### 4. Install on a device

- **Via USB:** Connect your Android phone, enable USB debugging, then in Android Studio click **Run** (green play button)
- **Share APK:** Copy `app-debug.apk` to your phone and open it to install (you may need to allow "Install from unknown sources")

## Build a release APK (for Play Store)

1. In Android Studio, go to **Build → Generate Signed Bundle / APK**
2. Create or select a keystore
3. Build a release APK or AAB (Android App Bundle recommended for Play Store)

## After making code changes

```bash
npm run android:build
```

Then run the app again from Android Studio. The updated web app will be bundled into the Android project.
