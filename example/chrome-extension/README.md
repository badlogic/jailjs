# JailJS Browser Extension Example (Manifest V3)

A Manifest V3 browser extension demonstrating how to use JailJS to execute sandboxed JavaScript in any web page, circumventing the pages Content Security Policy. Works with both Chrome and Firefox.

## What It Does

This extension demonstrates JailJS running in an isolated content script:

1. **Isolated Execution**: Code runs in the content script's isolated world, completely separate from the page's JavaScript context, while retaining access to the page's DOM.
2. **Sandboxed Interpreter**: Uses JailJS to interpret and execute ES5 JavaScript with full control over the environment
3. **DOM Access**: Sandboxed code can interact with the page DOM through the provided `document` object
4. **No eval()/new Function()/script**: Works on any page irrespective of its CSP (i.e. no `unsafe-eval`, `unsafe-inline`), as well as Manifest V3 extension context as well, where `eval()` and friends are also forbidden.

## How It Works

### Architecture

```
┌─────────────────┐
│   Side Panel    │  User writes JavaScript code
│   (sidepanel.ts)│
└────────┬────────┘
         │ chrome.runtime.sendMessage()
         ▼
┌─────────────────┐
│ Content Script  │  Runs in isolated world
│  (content.ts)   │  - Has DOM access
│                 │  - Page cannot access its globals
│  ┌───────────┐  │
│  │  JailJS   │  │  Interprets the code
│  │Interpreter│  │  - Sandboxed environment
│  └───────────┘  │  - Controlled globals (document, console)
└────────┬────────┘
         │ DOM manipulation
         ▼
┌─────────────────┐
│   Web Page DOM  │  Shared between page and content script
└─────────────────┘
```

### Example Use Cases

This pattern enables browser extensions to:
- Run user-provided JavaScript safely (like Tampermonkey/Greasemonkey)
- Execute untrusted code for testing/education
- Provide scripting capabilities with limited security risks
- Work around CSP restrictions in Manifest V3 extension code and web pages with strict CSP

## Building

```bash
# Build for both Chrome and Firefox
npm install
npm run build

# Build for Chrome only
npm run build:chrome

# Build for Firefox only
npm run build:firefox

# Development mode (Builds Chrome extension)
npm run dev
```

Output directories:
- `dist-chrome/` - Chrome extension
- `dist-firefox/` - Firefox extension

## Loading the Extension

### Chrome
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist-chrome/` directory

### Firefox
1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in the `dist-firefox/` directory

## Usage

1. Click the extension icon to open the side panel (Chrome) or sidebar (Firefox)
2. Write ES5 JavaScript code in the textarea
3. Click "Execute" to run the code in the sandboxed environment
4. View results and console output in the panel

## Files

- `src/background.ts` - Background script (opens side panel)
- `src/content.ts` - Content script with JailJS interpreter
- `src/sidepanel.ts` - Side panel UI for code input
- `static/manifest-chrome.json` - Chrome Manifest V3 configuration
- `static/manifest-firefox.json` - Firefox Manifest V3 configuration
- `static/sidepanel.html` - Side panel HTML

### Browser Compatibility

- Chrome/Edge: Uses `sidePanel` API (Manifest V3)
- Firefox: Uses `sidebar_action` API (Manifest V3)
- Both browsers: Service worker background script, content scripts with isolated world execution
