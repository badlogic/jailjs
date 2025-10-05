# JailJS

JavaScript AST interpreter for **isolated execution** in browsers and Node.js.

**Use cases**: Plugin systems, user scripts, controlled execution environments
**Not for**: Security sandboxing of untrusted code

[Read the "behind the scenes" blog post](https://mariozechner.at/posts/2025-10-05-jailjs/)

## Features

- **Complete ES5 Support**: Full implementation of all ES5 language features
- **ES6+ Transformation**: Optional Babel-based transform to ES5 AST
- **Scope Isolation**: Custom global environment, blocks `constructor`/`__proto__` on built-ins
- **Tree-shakeable**: Separate parser (~300 KB) from interpreter (~10 KB)
- **Universal**: Works in browsers and Node.js

## Installation

```bash
npm install @mariozechner/jailjs
```

## Quick Start

```typescript
import { Interpreter, parse } from '@mariozechner/jailjs';

const interpreter = new Interpreter();
const result = interpreter.evaluate(parse('2 + 2'));
console.log(result); // 4
```

## Examples

- **[web](example/web)** - Browser playground with ES6+ examples and security demos
- **[node](example/node)** - CLI demo with eval() and timeout protection
- **[chrome-extension](example/chrome-extension)** - Manifest V3 extension with user scripts

## API

### Basic Usage

```typescript
import { Interpreter, parse } from '@mariozechner/jailjs';

// With custom globals
const interpreter = new Interpreter({
  console: { log: (...args) => console.log('[Sandbox]', ...args) },
  myAPI: { getData: () => fetchData() }
}, {
  maxOps: 100000  // Operation limit for timeout protection (optional)
});

const ast = parse('myAPI.getData()');
const result = interpreter.evaluate(ast);
```

### ES6+ Transformation

```typescript
import { Interpreter } from '@mariozechner/jailjs';
import { transformToES5 } from '@mariozechner/jailjs/transform';

const code = `
  const double = (x) => x * 2;
  [1, 2, 3].map(double);
`;

const ast = transformToES5(code);
const result = new Interpreter().evaluate(ast);
console.log(result); // [2, 4, 6]
```

Supports: arrow functions, classes, template literals, destructuring, spread operators, async/await, TypeScript, JSX.

**Top-level await:** Wrap code in an async IIFE:

```typescript
const code = `
  (async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Done!');
  })();
`;
```

### Tree-shaking

Parse ahead-of-time to bundle only the interpreter (~10 KB):

```typescript
// Build-time
import { parse } from '@mariozechner/jailjs/parser';
const ast = parse(userScript);
fs.writeFileSync('script.ast.json', JSON.stringify(ast));

// Runtime (bundle only interpreter)
import { Interpreter } from '@mariozechner/jailjs';
const ast = JSON.parse(fs.readFileSync('script.ast.json'));
new Interpreter().evaluate(ast);
```

## Default Globals

```typescript
// Built-ins
console, Math, JSON, Date, RegExp

// Constructors (prototypes can be polluted!)
Array, Object, String, Number, Boolean

// ES6+ (for transformed code)
Symbol, Promise

// Errors
Error, TypeError, ReferenceError, SyntaxError, RangeError, EvalError, URIError

// Global functions
parseInt, parseFloat, isNaN, isFinite
encodeURI, encodeURIComponent, decodeURI, decodeURIComponent

// Blocked
Function: undefined  // Blocked to prevent eval-like behavior
eval: undefined      // Disabled unless you provide parser via options
```

## Security

⚠️ **JailJS is NOT a security sandbox**. It provides scope isolation for controlled environments, but:

- ❌ Prototype pollution is possible (`Array.prototype`, `Object.prototype`)
- ❌ No prototype method allowlisting
- ❌ Many escape vectors exist
- ❌ No memory or execution time limits (only basic operation counter)

**What is blocked**:
- `[].constructor` → `undefined` (on built-in types)
- `obj.__proto__` → `undefined`
- `Function()` → `undefined`
- Global scope (`window`, `globalThis`, etc.)

**For untrusted code**, use:
- [SandboxJS](https://github.com/nyariv/SandboxJS) - Prototype whitelisting and comprehensive security
- [isolated-vm](https://github.com/laverdet/isolated-vm) - V8 isolates for Node.js
- Web Workers or separate processes

JailJS gives you **tools to build isolation** (custom globals, operation limits, AST interpretation), but **cannot guarantee security**. You are responsible for validating use cases and layering additional protections.

## Supported Features

### ES5 (Native)
- ✅ All operators, control flow, functions, closures
- ✅ Objects, arrays, prototypes, `this` binding
- ✅ `try`/`catch`/`finally`, error handling
- ✅ Variable hoisting, `arguments`

### ES6+ (via Transform)
- ✅ Classes, arrow functions, template literals
- ✅ `let`/`const`, destructuring, spread
- ✅ Async/await, promises
- ✅ TypeScript, JSX (optional)

### Not Supported
- ❌ Generators (WIP)
- ❌ ES6 modules
- ❌ Proxies, Reflect, WeakRef
- ❌ SharedArrayBuffer, Atomics

## Performance

~10-100x slower than native JavaScript. Use `maxOps` for timeout protection.

## Development

```bash
npm install
npm run build
npm test
npm run dev      # Watch mode
```

## License

MIT
