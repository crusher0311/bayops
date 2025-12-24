# BayOPS Parts & Labor Connector

Chrome extension for integrating BayOPS with PartsTech, ProDemand, AllData, and Identifix.

## Version 2.1.0

### Features

#### PartsTech Integration
- Auto-sync parts from PartsTech to BayOPS repair orders
- VIN pre-fill for vehicle context
- Real-time cart synchronization
- One-click ordering when ready

#### ProDemand Integration (NEW in v2.1.0)
- Deep link integration with vehicle pre-selection
- VIN auto-fill on ProDemand pages
- Login state detection with helpful guidance
- Labor time capture (experimental)

#### Other Labor Guides
- AllData support (content script ready)
- Identifix support (content script ready)

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## Usage

### Opening ProDemand from BayOPS
1. Open a repair order in BayOPS
2. In the Vehicle section, click "Open in ProDemand"
3. ProDemand opens and the VIN is copied to your clipboard
4. Log in to ProDemand if prompted
5. Paste the VIN in ProDemand's vehicle search (Ctrl+V / Cmd+V)
6. The extension will show a floating panel with:
   - Connection status
   - VIN fill button (auto-fills or copies to clipboard)
   - Labor capture button

### PartsTech Integration
1. Click the PartsTech button on any job in BayOPS
2. PartsTech opens with the VIN pre-filled
3. Add parts to your cart
4. Parts automatically sync back to BayOPS

## How ProDemand Integration Works

When you click "Open in ProDemand" from BayOPS:
1. ProDemand's main page opens in a new tab
2. The VIN is automatically copied to your clipboard
3. You can paste it directly in ProDemand's vehicle search

The Chrome extension provides additional features when you're on ProDemand:
- Detects if you're logged in or on the login page
- Shows a "Fill VIN" button that auto-fills VIN fields when detected
- Falls back to clipboard copy if auto-fill isn't possible
- Provides a "Capture Labor Times" button (experimental)

**Note:** ProDemand requires a valid subscription and login. The extension cannot bypass authentication.

## Files

- `manifest.json` - Extension configuration
- `background.js` - Background service worker
- `popup.html/js` - Extension popup UI
- `content-bayops.js` - BayOPS page integration
- `content-partstech.js` - PartsTech page integration
- `content-prodemand.js` - ProDemand page integration
- `content-alldata.js` - AllData page integration
- `content-identifix.js` - Identifix page integration

## Required Icons

Add the following icon files to the `icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

You can use any wrench/tool icon in BayOPS brand colors (blue/purple gradient).

## Security Notes

- No credentials are stored in the extension
- Uses browser's native password manager for login
- Session management handled by each service
- All communication stays within the browser

## Changelog

### v2.1.0
- Added ProDemand deep link integration
- Added login state detection for ProDemand
- Updated popup UI to show both PartsTech and ProDemand status
- Improved VIN auto-fill reliability

### v2.0.0
- Multi-service support (PartsTech, ProDemand, AllData, Identifix)
- Labor guide capture framework
- Unified popup interface

### v1.9.x
- PartsTech cart synchronization
- VIN pass-through
- Real-time sync to BayOPS

## Notes

- This extension monitors PartsTech's cart using DOM observation
- If PartsTech or ProDemand change their site structure, updates may be needed
- Once you have PartsTech Partner API access, this can be replaced with official integration
