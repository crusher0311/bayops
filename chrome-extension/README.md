# BayOPS Parts Connector - Chrome Extension

Connect BayOPS repair orders with PartsTech for seamless parts ordering.

## Installation (Development)

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## How It Works

1. **Open BayOPS** and navigate to a repair order
2. **Click "Search Parts"** on a job - this opens PartsTech in a new tab
3. **Add parts to cart** on PartsTech as normal
4. **Extension tracks all parts** added and links them to the job
5. **Parts sync back to BayOPS** automatically
6. When the job is sold, click **"Order from PartsTech"** to complete the purchase

## Features

- **Session tracking**: Parts are organized by job/RO
- **No duplicates**: Extension knows which parts belong to which job
- **Persistent**: Cart data saved even if you close the PartsTech tab
- **One-click ordering**: When ready, trigger checkout directly

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker handling sessions and tab management
- `content-partstech.js` - Script injected into PartsTech to monitor cart
- `content-bayops.js` - Script injected into BayOPS to enable communication
- `popup.html/js` - Extension popup UI showing active sessions

## Required Icons

Add the following icon files to the `icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use any wrench/tool icon in BayOPS brand colors (blue/purple gradient).

## Notes

- This extension monitors PartsTech's cart using DOM observation
- If PartsTech changes their site structure, the cart parsing may need updates
- Once you have PartsTech Partner API access, this can be replaced with official integration
