/**
 * shortcuts.js — Create a desktop shortcut (Finder alias) for QuickClaw on macOS.
 */

const { exec } = require('child_process');
const path = require('path');
const os = require('os');

/**
 * Create a Finder alias on the user's Desktop pointing to the QuickClaw app.
 *
 * On macOS, Finder aliases are preferred over symlinks because:
 *   - They show the app icon correctly
 *   - They survive the target app being moved/updated
 *   - They feel native to macOS users
 *
 * @param {string} appPath — full path to QuickClaw.app (or the dev Electron binary)
 * @returns {Promise<void>}
 */
function createDesktopShortcut(appPath) {
  return new Promise((resolve, reject) => {
    // Determine the actual .app bundle path
    // In production: /Applications/QuickClaw.app
    // In dev:        /path/to/node_modules/electron/dist/Electron.app
    let targetPath = appPath;

    // Walk up to find the .app bundle
    const parts = appPath.split(path.sep);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].endsWith('.app')) {
        targetPath = parts.slice(0, i + 1).join(path.sep);
        break;
      }
    }

    const desktop = path.join(os.homedir(), 'Desktop');
    const aliasName = 'QuickClaw';

    // Use AppleScript to create a proper Finder alias
    const script = `
      tell application "Finder"
        try
          -- Remove existing alias if present
          set desktopFolder to (path to desktop folder) as alias
          try
            delete (file "${aliasName}" of desktopFolder)
          end try

          -- Create new alias
          make alias file to (POSIX file "${targetPath}" as alias) at desktopFolder
          set name of result to "${aliasName}"
        end try
      end tell
    `;

    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout, stderr) => {
      if (err) {
        // Fallback: create a symlink (works but doesn't show the app icon)
        const symlinkPath = path.join(desktop, 'QuickClaw');
        try {
          const fs = require('fs');
          try { fs.unlinkSync(symlinkPath); } catch { /* ok */ }
          fs.symlinkSync(targetPath, symlinkPath);
          resolve();
        } catch (e2) {
          reject(new Error(`Could not create shortcut: ${e2.message}`));
        }
        return;
      }
      resolve();
    });
  });
}

module.exports = { createDesktopShortcut };
