# JailJS Web Playground

Interactive web playground for testing JailJS sandboxed JavaScript execution.

## What It Does

A simple browser-based playground that demonstrates JailJS capabilities:

1. **Code Editor**: Textarea for writing ES5 JavaScript
2. **Execute Button**: Parses and runs code in sandboxed interpreter
3. **Result Display**: Shows execution results or errors
4. **Example Scripts**: Pre-built examples demonstrating ES5 features

## Features

- Clean UI built with Tailwind CSS v4
- Real-time code execution in sandboxed environment
- Example scripts: Fibonacci, Closures, Array methods, Object manipulation
- Error handling and display
- Keyboard shortcut (Ctrl+Enter / Cmd+Enter) to execute

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **TypeScript** - Type safety
- **JailJS** - Sandboxed JavaScript interpreter

## Usage

1. Open the playground in your browser
2. Write or select an example ES5 JavaScript code
3. Click "Execute" or press Ctrl+Enter (Cmd+Enter on Mac)
4. View the result in the output panel

## Security

All code runs through the JailJS interpreter in a controlled sandbox with limited globals:
- `console`, `Math`, `JSON`, `Date`, `Object`, `Array` are exposed
- No access to DOM, `window`, or other browser APIs
- Execution happens entirely in the interpreter (no `eval()`)
