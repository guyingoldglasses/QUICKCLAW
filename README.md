# ⚡ QuickClaw

One-click OpenClaw installer for macOS. Get your AI agent running in under 5 minutes.

## What's Included

| File | What it does |
|------|-------------|
| `QuickClaw Install.command` | Interactive installer — sets up Node.js, OpenClaw, Dashboard, Antfarm, and all launcher scripts |
| `QuickClaw Launch.command` | Quick launcher — finds your install (local or SSD) and starts everything |
| `QuickClaw Doctor.command` | Health check — diagnoses issues with your installation |

## Quick Start

1. Download this folder
2. Double-click **QuickClaw Install.command**
3. Follow the prompts (choose Mac or SSD, enter API keys, pick your model)
4. Say **yes** when asked to launch — the dashboard opens automatically!

**Already installed?** Double-click **QuickClaw Launch.command** — it finds your install automatically.

## What Gets Installed

- **Node.js 22** (portable via fnm — doesn't touch your system)
- **OpenClaw** (latest version)
- **Antfarm** (multi-agent workflow orchestration)
- **Command Center Dashboard** (web-based management UI)
- **Launcher scripts** (Start, Stop, Update, Backup — all double-clickable)

## Install Options

### Local Mac
Installs to `~/OpenClaw`. Good for Mac Mini or Mac Studio always-on setups.

### External SSD
Installs to `/Volumes/YOUR_DRIVE/OpenClaw`. Fully portable — plug into any Mac and run. Includes safe eject in the Stop script.

## Requirements

- macOS 13+ (Ventura or newer recommended)
- Internet connection (for initial install)
- An API key from [Anthropic](https://console.anthropic.com) or [OpenAI](https://platform.openai.com)
- Optional: Telegram bot token from [@BotFather](https://t.me/BotFather)

## After Installation

Your install folder will contain:
```
OpenClaw/
├── Start OpenClaw.command    ← Launch everything
├── Stop OpenClaw.command     ← Shut down safely (+ eject SSD)
├── Update OpenClaw.command   ← Update to latest
├── Backup OpenClaw.command   ← Backup your configs
├── oc                        ← Terminal shortcut
├── workspace/                ← Bot files, skills, memory
├── dashboard/                ← Web dashboard
├── env/                      ← Portable Node.js
└── backups/                  ← Your backups
```

All launcher scripts auto-detect their install location — you can move the folder or rename your SSD and everything still works.

## Dashboard

After starting, your browser opens automatically to the Command Center:
- Monitor your bot's status, costs, and activity
- Manage skills, memory, API keys
- View live logs and cron jobs
- Run security audits
- Control Antfarm workflows

## VPS Installation

For DigitalOcean/Linux VPS setup, see the text guide at:
https://guyingoldglasses.com/install

## Troubleshooting

Double-click **QuickClaw Doctor.command** to run a full diagnostic.

Dashboard not opening? The server needs a few seconds to start — the launcher waits automatically and retries. If it still doesn't open, check the terminal output for the dashboard URL.

## Links

- [OpenClaw Docs](https://docs.openclaw.ai)
- [Antfarm](https://antfarm.cool)
- [QuickClaw Guide](https://guyingoldglasses.com/install)
