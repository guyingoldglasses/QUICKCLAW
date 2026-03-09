# QuickClaw

**The fastest way to install and run [OpenClaw](https://github.com/open-claw) on a Mac.**

QuickClaw is a native macOS app that handles everything — downloading, configuring, and launching OpenClaw — so you can go from zero to running in minutes with no terminal commands required.

Made by [GuyInGoldGlasses.com](https://guyingoldglasses.com)

---

## Install

**&#9889; [Click here for the Install Guide](https://guyingoldglasses.github.io/QUICKCLAW/)** — a visual walkthrough that takes you through the three steps to get QuickClaw running.

Or if you prefer the quick version:

1. Download **[QuickClaw-1.0.0-arm64.dmg](https://github.com/guyingoldglasses/QUICKCLAW/releases/latest/download/QuickClaw-1.0.0-arm64.dmg)** from Releases.
2. Open the `.dmg` and drag **QuickClaw** to **Applications**.
3. Open **Terminal**, paste `xattr -cr /Applications/QuickClaw.app` and press Enter.
4. Open **QuickClaw** from Applications. Done!

> **Note:** QuickClaw currently supports macOS on Apple Silicon (M1/M2/M3/M4). Intel Mac support is planned for a future release.

> **About the Terminal step:** If QuickClaw is signed and notarized (the default download), you can skip step 3 — just drag to Applications and open. If macOS blocks the app (this can happen if the signing certificate has expired or you're building from source), use the terminal command in step 3. This is safe and simply removes the macOS quarantine flag. QuickClaw is open-source — you can always verify the code yourself.

### 2. Run the Setup Wizard

When QuickClaw launches for the first time, the setup wizard appears automatically:

1. **Choose a location** — Pick where to install OpenClaw (your Mac's internal drive or an external drive).
2. **Fresh or Migrate** — Start fresh, or migrate existing OpenClaw data if you have it.
3. **Sit back** — QuickClaw handles the rest: checking your system, installing Homebrew and Git if needed, downloading OpenClaw, setting up the dashboard, and configuring everything.

You'll see a real-time progress display with a terminal log so you always know what's happening.

### 3. Use the Dashboard

Once installation finishes, QuickClaw launches the dashboard in your browser at `http://localhost:3000` (or the next available port). From there you can manage profiles, configure integrations, browse files, and more.

Every time you open QuickClaw after the first install, it goes straight to the dashboard — no setup needed.

---

## How It Works

QuickClaw is an Electron app with three main pieces:

1. **Installer** — A 10-step automated process that checks your system, installs prerequisites (Homebrew, Git, Node.js), downloads OpenClaw, and configures everything.
2. **Process Manager** — Starts the OpenClaw gateway and the Express.js dashboard server, monitors their health, and handles clean shutdown.
3. **State Detector** — Scans your Mac and connected drives for existing QuickClaw installations, tracks their health, and lets you switch between them.

---

## Project Structure

```
├── electron/               # Electron main process modules
│   ├── main.js             # App lifecycle and window management
│   ├── installer.js        # 10-step installation engine
│   ├── process-manager.js  # Service spawning and monitoring
│   ├── state-detector.js   # Installation discovery across drives
│   ├── preload.js          # Secure IPC bridge
│   └── shortcuts.js        # macOS desktop shortcut creation
├── installer-ui/           # Setup wizard frontend
│   └── index.html          # Single-page app (dark theme, animated)
├── dashboard-files/        # Express.js dashboard (bundled at build)
│   ├── server.js           # Dashboard API server
│   ├── routes/             # API route modules
│   ├── lib/                # Shared helpers and state
│   └── public/             # Dashboard frontend (React SPA)
├── build/                  # Build configuration
│   └── entitlements.mac.plist
├── assets/                 # App icon
├── package.json            # Dependencies and build config
└── QuickClaw_Stop.command  # Fallback stop script
```

---

## Building from Source

If you want to build QuickClaw yourself:

```bash
# Clone the repo
git clone https://github.com/guyingoldglasses/QUICKCLAW.git
cd QUICKCLAW

# Install dependencies
npm install

# Install dashboard dependencies
cd dashboard-files && npm install && cd ..

# Run in development mode
npm start

# Build the .dmg and .zip
npm run dist
```

**Requirements:** Node.js 18+, npm, macOS.

---

## Upgrading from the Script-Based Version

If you previously used the shell-script version of QuickClaw (with `.command` files and `START_HERE.html`), your existing OpenClaw data is fully compatible. When the QuickClaw app detects an existing installation, it will offer to migrate your data so nothing is lost.

---

## Open-Source Continuity

QuickClaw is MIT-licensed and designed to work forever, even if the original developer account or signing certificate becomes unavailable. Here's what happens in different scenarios:

**If the app is signed (normal download):** Just drag to Applications and open. No terminal needed.

**If the signing certificate expires or is unavailable:** macOS will block the app with a "damaged" or "unidentified developer" warning. To fix this, open Terminal and run:

```
xattr -cr /Applications/QuickClaw.app
```

Then open QuickClaw normally. This is a one-time step that tells macOS the app is safe.

**If you're building from source:** Clone the repo, run `npm install` and `npm run dist`, then use the same `xattr -cr` command above on the built app.

The `xattr -cr` command is harmless — it simply removes the macOS quarantine flag that Apple adds to downloaded files. QuickClaw's full source code is available in this repo for anyone to audit.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Links

- [GuyInGoldGlasses.com](https://guyingoldglasses.com)
- [OpenClaw on GitHub](https://github.com/open-claw)
