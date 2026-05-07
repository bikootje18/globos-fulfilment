# Android TWA APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce an installable `app-release-signed.apk` that runs the Globos Fulfilment Vercel app full-screen on Android tablets, with no changes to the main frontend.

**Architecture:** Bubblewrap wraps the live Vercel PWA URL in a Trusted Web Activity (TWA). The APK is a thin Chrome shell — the React app, backend, and Supabase connections are unchanged. A single static `assetlinks.json` file is added to the frontend so Android removes the browser bar.

**Tech Stack:** Java JDK 17 (via Homebrew), `@bubblewrap/cli` (npm global), Android SDK (auto-downloaded by Bubblewrap on first run ~500 MB)

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create dir | `android-twa/` | Bubblewrap project root, lives next to `frontend/` |
| Auto-created by Bubblewrap | `android-twa/twa-manifest.json` | TWA config (app name, URL, icons, signing) |
| Auto-created by Bubblewrap | `android-twa/android/` | Generated Android Gradle project |
| Auto-created by Bubblewrap | `android-twa/globos.keystore` | APK signing key — **back this up** |
| Add to `.gitignore` | `android-twa/.gitignore` | Ignore build output and keystore from git |
| Create | `frontend/public/.well-known/assetlinks.json` | Domain verification file served by Vercel |

---

## Task 1: Install Java JDK 17

**Files:** none (system-level install)

- [ ] **Step 1: Check if Homebrew is installed**

```bash
brew --version
```

Expected: `Homebrew 4.x.x` — if not found, install from https://brew.sh first.

- [ ] **Step 2: Install OpenJDK 17**

```bash
brew install openjdk@17
```

This takes 1-3 minutes. Expected last line: `openjdk@17 17.x.x is installed`.

- [ ] **Step 3: Add JDK 17 to your PATH for this session**

```bash
export JAVA_HOME=$(brew --prefix openjdk@17)
export PATH="$JAVA_HOME/bin:$PATH"
```

- [ ] **Step 4: Make it permanent (add to ~/.zshrc)**

Open `~/.zshrc` and add these two lines at the bottom:
```bash
export JAVA_HOME=$(brew --prefix openjdk@17)
export PATH="$JAVA_HOME/bin:$PATH"
```

Then reload:
```bash
source ~/.zshrc
```

- [ ] **Step 5: Verify Java is working**

```bash
java -version
```

Expected output (versions may differ slightly):
```
openjdk version "17.x.x" 2023-xx-xx
OpenJDK Runtime Environment Homebrew ...
```

---

## Task 2: Install Bubblewrap CLI

**Files:** none (global npm package)

- [ ] **Step 1: Install Bubblewrap globally**

```bash
npm install -g @bubblewrap/cli
```

Expected last line: `added N packages`.

- [ ] **Step 2: Verify installation**

```bash
bubblewrap --version
```

Expected: prints a version number like `1.x.x`.

---

## Task 3: Confirm your Vercel domain

**Files:** none (lookup step)

- [ ] **Step 1: Open your Vercel dashboard**

Go to https://vercel.com/dashboard → open the Globos Fulfilment project → look at the "Domains" section.

You will see something like `globos-fulfilment-software.vercel.app` (or a custom domain if you added one).

- [ ] **Step 2: Note the exact domain**

Write it down — you will need it twice: once during `bubblewrap init` and once when creating `assetlinks.json`.

Call it `YOUR_VERCEL_DOMAIN` in the steps below. Example: `globos-fulfilment-biko.vercel.app`.

- [ ] **Step 3: Verify the manifest is reachable**

```bash
curl -s https://YOUR_VERCEL_DOMAIN/manifest.json | head -5
```

Expected: the first few lines of your manifest JSON (name, short_name, etc.). If this fails, the PWA is not deployed — check Vercel first.

---

## Task 4: Initialise the Bubblewrap project

**Files:**
- Create dir: `android-twa/`
- Auto-created: `android-twa/twa-manifest.json`, `android-twa/android/`, `android-twa/globos.keystore`

- [ ] **Step 1: Create the project directory**

Run from the repo root (`Globos fulfilment Software/`):
```bash
mkdir android-twa && cd android-twa
```

- [ ] **Step 2: Run bubblewrap init**

```bash
bubblewrap init --manifest https://YOUR_VERCEL_DOMAIN/manifest.json
```

Replace `YOUR_VERCEL_DOMAIN` with the domain from Task 3.

Bubblewrap reads the manifest and pre-fills many fields. It will then ask a series of prompts. Use these answers:

| Prompt | Answer |
|--------|--------|
| Domain being opened | `YOUR_VERCEL_DOMAIN` |
| Application name | `Globos Fulfilment` |
| Short name | `Fulfilment` |
| Application ID (package name) | `com.globos.fulfilment` |
| Application version | `1` |
| Application version code | `1` |
| Key path | `./globos.keystore` |
| Key password | choose a strong password, write it down |
| Key alias | `globos` |
| Key alias password | same as key password |
| Signing key distinguished name | press Enter to accept default or enter: `CN=Globos, O=Globos, C=NL` |

All other prompts: press Enter to accept defaults.

- [ ] **Step 3: Confirm project was created**

```bash
ls android-twa/
```

Expected: you see `twa-manifest.json`, `android/`, `globos.keystore` among the files.

On the first run Bubblewrap may also download the Android SDK (~500 MB). This is normal — let it finish.

---

## Task 5: Create the .gitignore for android-twa

**Files:**
- Create: `android-twa/.gitignore`

- [ ] **Step 1: Write the .gitignore**

Create the file `android-twa/.gitignore` with this content:

```
android/app/build/
android/.gradle/
android/local.properties
*.apk
```

Do NOT add `globos.keystore` to .gitignore — you want git to track that it exists. But you must back it up separately (see Task 8).

- [ ] **Step 2: Commit the Bubblewrap project skeleton**

Run from the repo root:
```bash
git add android-twa/
git commit -m "feat: add Bubblewrap TWA project skeleton"
```

---

## Task 6: Add assetlinks.json to the frontend

This file tells Android that your APK is authorised to open `YOUR_VERCEL_DOMAIN` without showing a browser bar.

**Files:**
- Create: `frontend/public/.well-known/assetlinks.json`

- [ ] **Step 1: Get the SHA-256 fingerprint of your signing key**

Run from `android-twa/`:
```bash
keytool -list -v -keystore globos.keystore -alias globos
```

Enter the keystore password when prompted.

In the output, find the line that reads:
```
SHA256: AA:BB:CC:DD:...
```

Copy the full fingerprint string (colons included). It is 95 characters long.

- [ ] **Step 2: Create the directory**

```bash
mkdir -p frontend/public/.well-known
```

- [ ] **Step 3: Create assetlinks.json**

Create `frontend/public/.well-known/assetlinks.json` with this content, replacing the fingerprint:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.globos.fulfilment",
    "sha256_cert_fingerprints": ["AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"]
  }
}]
```

Replace the placeholder fingerprint with the actual SHA-256 string from Step 1.

- [ ] **Step 4: Commit and push to trigger Vercel deploy**

```bash
git add frontend/public/.well-known/assetlinks.json
git commit -m "feat: add TWA assetlinks.json for Android domain verification"
git push
```

- [ ] **Step 5: Wait for Vercel to deploy (1-2 minutes), then verify**

```bash
curl -s https://YOUR_VERCEL_DOMAIN/.well-known/assetlinks.json
```

Expected: the JSON you just wrote is returned. If you get a 404, check that Vercel's `public/` directory is being served correctly (it always is by default with Vite).

---

## Task 7: Build the APK

**Files:**
- Auto-created: `android-twa/app-release-signed.apk`

- [ ] **Step 1: Run the build from android-twa/**

```bash
cd android-twa
bubblewrap build
```

This takes 3-8 minutes on first run (Gradle downloads dependencies). Expected last line:
```
✓ Build succeeded
```

- [ ] **Step 2: Locate the APK**

```bash
ls -lh app-release-signed.apk
```

Expected: a file around 1-3 MB. If the file is not in `android-twa/`, check `android-twa/android/app/build/outputs/apk/release/`.

- [ ] **Step 3: Verify APK metadata (optional but useful)**

```bash
bubblewrap validate
```

This checks that the live `assetlinks.json` matches your APK's signing key. Expected: `✓ Digital Asset Links verified`. If it fails, double-check the fingerprint in `assetlinks.json` against `keytool` output.

---

## Task 8: Install APK on tablet and verify

- [ ] **Step 1: Transfer the APK to the tablet**

**Option A — USB cable (faster):**
Connect tablet via USB. On the tablet, enable Developer Options:
- Settings → About tablet → tap "Build number" 7 times → go back → Developer Options → enable "USB Debugging"

`adb` is included with the Android SDK that Bubblewrap downloaded. Add it to your PATH:
```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
```

Then:
```bash
adb devices
```

Expected: one device listed. Then:
```bash
adb install android-twa/app-release-signed.apk
```

Expected: `Success`.

**Option B — file transfer (no cable needed):**
Send the APK via email, Google Drive, or AirDroid to the tablet. On the tablet, open the file — Android will ask to install it. You may need to enable "Install from unknown sources" in Settings → Security.

- [ ] **Step 2: Launch the app on the tablet**

Open "Globos Fulfilment" from the app drawer. Expected:
- Full-screen, no browser address bar
- Login screen appears
- The app behaves identically to the Vercel web app

- [ ] **Step 3: Verify the TWA is active (no browser bar)**

If a browser bar appears at the top, the `assetlinks.json` verification failed. Check:
1. `curl https://YOUR_VERCEL_DOMAIN/.well-known/assetlinks.json` returns correct JSON
2. The SHA-256 fingerprint in that file matches the one from `keytool`
3. The package name in `assetlinks.json` matches `com.globos.fulfilment`

- [ ] **Step 4: Commit any final tweaks**

```bash
git add -p
git commit -m "feat: android TWA APK — ready for tablet installation"
```

---

## Task 9: Back up the keystore

**This is critical — losing the keystore means you can never update the installed APK.**

- [ ] **Step 1: Copy keystore to a safe location**

```bash
cp android-twa/globos.keystore ~/Desktop/globos.keystore.backup
```

Then move this file to: iCloud Drive, a password manager attachment, or an external drive. Do NOT rely on git alone.

- [ ] **Step 2: Save the keystore password**

Store the keystore password in 1Password, Apple Keychain, or another password manager under the name "Globos Android Keystore".

- [ ] **Step 3: Document rebuild instructions**

When you need to rebuild the APK (icon change, app name change, etc.), run from `android-twa/`:
```bash
bubblewrap build
```

That's it. Vercel URL, package name, and signing key are all stored in `twa-manifest.json`.

---

## Recap: What was built

| Deliverable | Location |
|-------------|----------|
| Android TWA project | `android-twa/` |
| APK for tablets | `android-twa/app-release-signed.apk` |
| Domain verification file | `frontend/public/.well-known/assetlinks.json` |
| Signing key | `android-twa/globos.keystore` + backup |

**Update flow (no new APK needed):** Push changes to `frontend/` → Vercel deploys → tablets see new version automatically.

**When you DO need to rebuild APK:** App name, icon, or package name changes only.
