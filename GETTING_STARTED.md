# Getting Started with QuickClaw

This guide walks you through everything from downloading QuickClaw to having OpenClaw fully running on your Mac.

---

## Before You Start

**What you need:**
- A Mac with Apple Silicon (M1, M2, M3, or M4)
- macOS 12 (Monterey) or later
- At least 5 GB of free disk space
- An internet connection (for downloading OpenClaw during setup)

**What you don't need:**
- No terminal or command-line experience
- No pre-installed software — QuickClaw handles Homebrew, Git, and Node.js for you

---

## Step 1: Download QuickClaw

Go to the [Releases page](https://github.com/guyingoldglasses/QUICKCLAW/releases/latest) and download **QuickClaw-1.0.0-arm64.dmg**.

Once downloaded, double-click the `.dmg` file. A window will appear showing the QuickClaw app icon and an arrow pointing to your Applications folder. Drag **QuickClaw** to **Applications** to install it.

---

## Step 2: Open QuickClaw for the First Time

For the very first launch, double-click **`Open QuickClaw.command`** — this file is included in the `.dmg` alongside the app. It prepares QuickClaw for macOS and launches it automatically.

> **What does this do?** Because QuickClaw isn't signed with an Apple Developer certificate yet, macOS blocks it by default. The launcher script clears that block so the app runs normally. You only need to do this once — after that, open QuickClaw directly from Applications or Spotlight (`Cmd + Space` → type "QuickClaw") like any other app.

If macOS asks you to confirm opening the `.command` file, click **Open**.

---

## Step 3: The Setup Wizard

On first launch, QuickClaw opens the setup wizard — a dark-themed window that guides you through installation.

### Choose Where to Install

You'll see a grid of available locations:

- **This Mac** — Installs OpenClaw on your internal drive (in your home folder). Best for most users.
- **External Drives** — If you have external drives connected, they'll appear here too. Great if you want to keep OpenClaw on a portable drive.

Click the location you want and hit **Continue**.

### Fresh Install or Migrate

- **Fresh Install** — Starts completely clean. Choose this if you've never used OpenClaw before.
- **Migrate Existing Data** — If you previously used the command-line version of QuickClaw or already have OpenClaw data, this option preserves your existing configuration, profiles, and files.

### Watch It Go

After you confirm, QuickClaw runs through 10 automated steps:

1. Checking your system (macOS version, disk space)
2. Installing or detecting Homebrew
3. Installing or detecting Git
4. Detecting Node.js
5. Downloading OpenClaw
6. Installing OpenClaw
7. Setting up the dashboard
8. Configuring OpenClaw
9. Registering the installation
10. Done!

Each step shows a green checkmark when complete. A terminal window at the bottom shows detailed logs if you're curious about what's happening under the hood. The whole process typically takes 3–10 minutes depending on your internet speed and whether prerequisites are already installed.

---

## Step 4: The Dashboard

Once setup finishes, QuickClaw automatically launches the dashboard in your default browser. This is your command center for managing OpenClaw.

The dashboard runs locally at `http://localhost:3000` (or the next available port if 3000 is in use). From here you can:

- View system status and health information
- Manage profiles
- Configure security settings
- Browse and manage files
- Set up integrations (OpenAI, FTP, email, and more)
- Chat interface
- Check for updates

---

## Day-to-Day Usage

After the first-time setup, using QuickClaw is simple:

1. **Open QuickClaw** — Double-click the app (or the Desktop shortcut if you created one).
2. **Dashboard opens automatically** — QuickClaw detects your existing installation, starts the services, and opens the dashboard.
3. **When you're done** — Just close the QuickClaw app. It gracefully stops all services for you.

That's it. No commands to type, no servers to manage manually.

---

## Managing Multiple Installations

QuickClaw supports running OpenClaw in more than one location. For example, you might have one installation on your Mac and another on an external drive.

When QuickClaw detects multiple installations, it shows a **picker screen** where you can choose which one to launch. You can also:

- **Launch** any healthy installation
- **Forget** an installation you no longer need (this doesn't delete files, just removes it from QuickClaw's list)
- **Rescan** to find installations QuickClaw might have missed

If an external drive with an installation is unplugged, QuickClaw will let you know and give you the option to reconnect it or forget that installation.

---

## Creating a Desktop Shortcut

After installation, QuickClaw can create a macOS alias on your Desktop for quick access. You'll see the option on the completion screen. The shortcut works just like any other app — double-click it to launch QuickClaw.

---

## Troubleshooting

**QuickClaw won't open (macOS blocks it / says "damaged")**
Make sure you used the **Open QuickClaw.command** launcher for the first launch. If you skipped that step, you can still fix it by double-clicking the `.command` file now (re-open the `.dmg` if needed). Alternatively, open Terminal and run: `xattr -cr /Applications/QuickClaw.app`

**Installation fails at a step**
Check the terminal log at the bottom of the installer window for specific error messages. Common causes: no internet connection, insufficient disk space, or a corporate firewall blocking downloads.

**Dashboard doesn't open in the browser**
Try navigating to `http://localhost:3000` manually. If that doesn't work, ports 3001–3005 may be in use instead — check the QuickClaw window for the actual port number.

**External drive installation not detected**
Make sure the drive is mounted and accessible in Finder. Then try the "Rescan" option in QuickClaw's manager screen.

---

## Uninstalling

To remove QuickClaw:

1. Quit QuickClaw if it's running.
2. Delete **QuickClaw** from your Applications folder.
3. Optionally delete the OpenClaw data from wherever you installed it (check `~/.quickclaw-installs.json` for locations).
4. Optionally remove the Desktop shortcut if you created one.

---

## Getting Help

- Visit [GuyInGoldGlasses.com](https://guyingoldglasses.com) for updates and support
- Open an [issue on GitHub](https://github.com/guyingoldglasses/QUICKCLAW/issues) if you run into a bug
