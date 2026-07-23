# Bygg och publicera mobilapparna

Tömningskartan är en webbapp som paketeras till native iOS- och Android-appar
med [Capacitor](https://capacitorjs.com). Samma kod driver webben och båda
apparna. App-ID: `se.tomningskartan.app`.

## Snabbstart lokalt

```bash
npm install
npm run build            # bygg webbappen till dist/
npx cap sync             # kopiera in i android/ och ios/ + uppdatera plugins
npx cap open android     # öppna i Android Studio
npx cap open ios         # öppna i Xcode (kräver macOS)
```

I Android Studio / Xcode kör du appen på emulator eller ansluten enhet.
Efter varje `npm run build` kör `npx cap sync` för att uppdatera nativeprojekten.

## Android

### Debug-APK automatiskt (CI)

Workflowen `.github/workflows/android.yml` bygger en **installerbar debug-APK**
vid varje push. Hämta den under **Actions → Bygg Android-app → Artifacts →
tomningskartan-debug-apk**. Överför `app-debug.apk` till en Android-telefon och
installera (tillåt "okända källor"). Bra för att testa på riktig enhet utan
Play Store.

### Release-AAB för Google Play

1. Skapa en signeringsnyckel (engång):
   ```bash
   keytool -genkey -v -keystore tomningskartan.keystore \
     -alias tomningskartan -keyalg RSA -keysize 2048 -validity 10000
   ```
   Spara `.keystore`-filen och lösenorden säkert (tappar du dem kan du inte
   uppdatera appen).
2. Lägg signeringen i `android/app/build.gradle` under `android { ... }`:
   ```gradle
   signingConfigs {
     release {
       storeFile file(System.getenv("KEYSTORE_PATH") ?: "tomningskartan.keystore")
       storePassword System.getenv("KEYSTORE_PASSWORD")
       keyAlias System.getenv("KEY_ALIAS") ?: "tomningskartan"
       keyPassword System.getenv("KEY_PASSWORD")
     }
   }
   buildTypes {
     release { signingConfig signingConfigs.release }
   }
   ```
3. Bygg:
   ```bash
   npm run build && npx cap sync android
   cd android && ./gradlew bundleRelease
   ```
   Resultatet blir `android/app/build/outputs/bundle/release/app-release.aab`.
4. Ladda upp `.aab` i [Google Play Console](https://play.google.com/console)
   (engångsavgift 25 USD för utvecklarkonto).

## iOS

Kräver **macOS med Xcode** (kan köras på GitHub macOS-runner eller egen Mac).

1. `npm run build && npx cap sync ios && npx cap open ios`
2. I Xcode: välj projektet **App** → fliken **Signing & Capabilities** → välj
   ditt **Team** (Apple Developer Program, 99 USD/år). Xcode fixar
   provisioning automatiskt.
3. Lägg till en användarvänlig text för platsbehörighet i `ios/App/App/Info.plist`:
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Appen visar tömnings- och vattenplatser nära dig.</string>
   ```
4. **Product → Archive** → **Distribute App** → App Store Connect.
5. Fyll i appinfo i [App Store Connect](https://appstoreconnect.apple.com) och
   skicka in för granskning.

## Utvecklarkonton som krävs (av dig)

| Plattform | Konto | Kostnad |
|---|---|---|
| Android | Google Play Console | 25 USD engång |
| iOS | Apple Developer Program | 99 USD/år |

## Uppdatera apparna

Efter kodändringar: `npm run build && npx cap sync`, bygg om och ladda upp en
ny version (höj `versionCode`/`versionName` i `android/app/build.gradle` och
build-numret i Xcode).

## Behörigheter som redan är satta

- Android: `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
  (i `android/app/src/main/AndroidManifest.xml`).
- iOS: lägg till `NSLocationWhenInUseUsageDescription` enligt ovan.
