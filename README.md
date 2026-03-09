# QuickClaw

**The fastest way to install and run [OpenClaw](https://github.com/open-claw) on a Mac.**

QuickClaw is a native macOS app that handles everything — downloading, configuring, and launching OpenClaw — so you can go from zero to running in minutes with no terminal commands required.

Made by [GuyInGoldGlasses.com](https://guyingoldglasses.com)

---

## Download

Head to the [**Releases**](https://github.com/guyingoldglasses/QUICKCLAW/releases/latest) page and download **QuickClaw-1.0.0-arm64.dmg** (Apple Silicon) or the **.zip** if you prefer.

> **Note:** QuickClaw currently supports macOS on Apple Silicon (M1/M2/M3/M4). Intel Mac support is planned for a future release.

---

## What You Get

- **One-click installer** — A guided setup wizard walks you through every step. No terminal, no copy-pasting commands.
- **Built-in dashboard** — A local web-based command center for managing your OpenClaw instance, profiles, security, chat, and more.
- **Multi-install support** — Run OpenClaw on your internal drive, an external drive, or both. QuickClaw detects and manages all of them.
- **Automatic service management** — QuickClaw starts and stops the OpenClaw gateway and dashboard server for you, with health checks and graceful shutdown.
- **Desktop shortcut** — Creates a native macOS alias on your Desktop so you can launch with a double-click.

---

## Quick Start

### 1. Download and Install

1. Download the `.dmg` from [Releases](https://github.com/guyingoldglasses/QUICKCLAW/releases/latest).
2. Open the `.dmg` and drag **QuickClaw** into your **Applications** folder.
3. **First launch:** Double-click **`Open QuickClaw.command`** (included in the `.dmg`). This prepares QuickClaw for macOS and launches it. You only need to do this once — after that, open QuickClaw directly from Applications like any other app.

> **Why the extra step?** QuickClaw isn't signed with an Apple Developer certificate yet, so macOS blocks it by default. The launcher script handles this automatically — no Terminal needed.

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

## License

MIT — see [LICENSE](LICENSE) for details.

---

## Links

- [GuyInGoldGlasses.com](https://guyingoldglasses.com)
- [OpenClaw on GitHub](https://github.com/open-claw)
