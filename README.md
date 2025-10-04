# JailJS

Lightweight JavaScript AST interpreter for **isolated execution** in browsers and Node.js.

**🎯 Optimized for**: Plugin systems, user scripts, browser extensions with limited API surface
**⚠️ Not for**: Untrusted adversarial code (use [SandboxJS](https://github.com/nyariv/SandboxJS), isolated-vm, or separate processes)

[Read the "behind the scenes" blog post](https://mariozechner.at/posts/2025-10-05-jailjs/)

## Features

- **Complete ES5 Support**: Full implementation of all ES5 language features
- **ES6+ Transformation**: Optional tree-shakeable helper to transform modern JavaScript to ES5
- **Scope Isolation**: Custom global environment, frozen built-ins (Math/JSON/console)
- **Tree-shakeable**: Separate parser from interpreter - parse ahead-of-time and bundle only ~10 KB
- **Universal**: Works in browsers and Node.js

**Security Model**: Provides **isolation**, not comprehensive sandboxing. See [Security](#security) for limitations.

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

See the [example](example/) folder for complete demonstrations:

- **[web](example/web)** - Browser playground , demonstrates recursion, closures, array methods
- **[node](example/node)** - CLI demo showing sandboxed execution, timeout protection, and eval()
- **[chrome-extension](example/chrome-extension)** - Manifest V3 extension with Tampermonkey-style user scripts, DOM access in isolated world

## Default Environment

The interpreter exposes these globals by default, with **frozen built-ins** to prevent mutation:

```typescript
// Frozen built-ins (cannot be modified by sandboxed code)
console: { log, error, warn, info, debug }  // Frozen copy
Math: { ...all Math methods }              // Frozen copy
JSON: { parse, stringify }                 // Frozen copy

// Constructors (⚠️ prototypes can still be polluted)
Date, RegExp, Array, Object, String, Number, Boolean

// ES6+ features (for transformed code)
Symbol, Promise

// Error types
Error, TypeError, ReferenceError, SyntaxError, RangeError, EvalError, URIError

// Global functions
parseInt, parseFloat, isNaN, isFinite
encodeURI, encodeURIComponent, decodeURI, decodeURIComponent

// Blocked by default
Function: undefined  // Blocked to prevent sandbox escape
eval: (code) => ...  // Re-implemented through interpreter (requires parser injection)
```

Override or extend by passing custom globals:

```typescript
// Replace frozen built-ins with custom implementations
const interpreter = new Interpreter({
  console: { log: (...args) => myLogger('[Sandbox]', ...args) },
  Math: Math, // Pass original (mutable) Math if needed
});

// Add new globals (frozen by default is safer)
const interpreter = new Interpreter({
  document: Object.freeze(document), // Freeze to prevent mutation
  myAPI: Object.freeze({
    getData: () => safeFetchData()
  })
});
```

**Security Note**: While `Math`, `JSON`, and `console` are frozen by default, constructor prototypes (like `Array.prototype`) can still be polluted. For mission-critical security, use a whitelist-based sandbox like [SandboxJS](https://github.com/nyariv/SandboxJS).

## Tree-shaking for Smaller Bundles

The parser (`@babel/parser`) is ~300 KB. For smaller bundles, parse scripts ahead-of-time and bundle only the interpreter:

```typescript
// Build-time: Parse and save AST
import { parse } from '@mariozechner/jailjs/parser';
const ast = parse(userScript);
fs.writeFileSync('script.ast.json', JSON.stringify(ast));

// Runtime: Bundle only interpreter (~10 KB minified)
import { Interpreter } from '@mariozechner/jailjs';
const ast = JSON.parse(fs.readFileSync('script.ast.json'));
const interpreter = new Interpreter();
interpreter.evaluate(ast);
```

Bundle size: **10 KB** (interpreter only) vs **310 KB** (interpreter + parser)

## ES6+ Transformation

Transform modern JavaScript to ES5 using the optional `transform` module. Supports classes, async/await, arrow functions, destructuring, spread operators, and more.

### Arrow Functions & Template Literals

```typescript
import { Interpreter } from '@mariozechner/jailjs';
import { transformToES5 } from '@mariozechner/jailjs/transform';

const code = `
  const arrow = (x) => x * 2;
  const numbers = [1, 2, 3];
  const doubled = numbers.map(arrow);
  \`Result: \${doubled.join(', ')}\`
`;

const ast = transformToES5(code);
const interpreter = new Interpreter();
const result = interpreter.evaluate(ast);
console.log(result); // "Result: 2, 4, 6"
```

### Classes

```typescript
const code = `
  class Counter {
    constructor(start = 0) {
      this.value = start;
    }

    increment() {
      return ++this.value;
    }
  }

  const counter = new Counter(10);
  counter.increment(); // 11
`;

const ast = transformToES5(code);
const result = interpreter.evaluate(ast);
console.log(result); // 11
```

### Async/Await

```typescript
const code = `
  async function fetchData() {
    const result = await Promise.resolve(42);
    return result * 2;
  }

  fetchData(); // Returns Promise
`;

const ast = transformToES5(code);
const result = interpreter.evaluate(ast);
result.then(value => console.log(value)); // 84
```

### Destructuring & Spread

```typescript
const code = `
  const [first, ...rest] = [1, 2, 3, 4];
  const obj = { a: 1, b: 2, ...{ c: 3 } };
  ({ a: first, b: rest[0], c: obj.c })
`;

const ast = transformToES5(code);
const result = interpreter.evaluate(ast);
console.log(result); // { a: 1, b: 2, c: 3 }
```

**Transform Options**:

```typescript
transformToES5(code, {
  targets: { ie: 11 },     // Browser targets (default: IE 11)
  typescript: true,        // Enable TypeScript support
  jsx: true                // Enable JSX support
});
```

**Supported ES6+ Features**:
- ✅ Arrow functions, classes, template literals
- ✅ `let`/`const`, destructuring, spread operators
- ✅ Default parameters, computed properties
- ✅ Async/await (full support via regenerator)
- ✅ TypeScript and JSX (optional)

The transform module uses `@babel/standalone` and is tree-shakeable - only include it if you need ES6+ support. Note: adds ~3 MB to bundle size.

## Security

⚠️ **Important**: JailJS provides **isolation**, not complete security. It is suitable for:
- Running user scripts with limited access to your application's APIs
- Isolating untrusted code from your main execution context
- Providing a restricted JavaScript environment for extensions/plugins

**It is NOT suitable for**:
- Running adversarial code from untrusted sources
- Production security sandboxing without additional layers
- Environments where a determined attacker could cause harm

### What JailJS Provides

✅ **Scope isolation**: Custom global environment, no access to host globals unless explicitly provided
✅ **Basic prototype protection**: Blocks direct `__proto__` and `constructor.prototype` access
✅ **Operation limits**: Optional operation counting with `maxOps` to prevent infinite loops
✅ **eval() control**: Requires explicit parser injection, disabled by default
✅ **Custom built-ins**: Override or limit standard JavaScript APIs

### Known Limitations

❌ **Prototype pollution possible**: Constructor prototypes (like `Array.prototype`) can still be mutated
❌ **No prototype whitelist**: Any method on built-in prototypes can be accessed
❌ **No advanced jailbreak protection**: Determined attackers may find bypass techniques
❌ **No memory limits**: Can allocate unlimited objects/arrays until system limits
❌ **Simple operation counter**: `maxOps` is a basic counter, not a comprehensive execution quota

### What's Protected by Default

✅ **Frozen built-ins**: `Math`, `JSON`, and `console` are frozen and cannot be mutated
✅ **Function constructor blocked**: `Function()` is `undefined` to prevent code execution
✅ **eval() sandboxed**: When enabled, `eval()` runs through the interpreter

### Recommendations for Safer Use

```typescript
// 1. Set operation limits (important!)
const interpreter = new Interpreter({}, {
  maxOps: 100000,  // Prevent infinite loops
  parse: parse     // Only if you need eval()
});

// 2. Freeze custom globals you provide
const interpreter = new Interpreter({
  document: Object.freeze(document), // Prevent mutation
  myAPI: Object.freeze({
    getData: () => safeFetchData()
  })
});

// 3. Minimize provided globals - only give what's needed
const interpreter = new Interpreter({
  // Minimal set - defaults are already frozen
  // Don't add Array, Object unless required
});

// 4. For production, layer additional security:
// - Run in web workers or separate processes
// - Use Content Security Policy (CSP) headers
// - Implement rate limiting and resource quotas
// - Monitor and log all executed code
```

### Comparison with SandboxJS

JailJS is **lightweight and simple**, while [SandboxJS](https://github.com/nyariv/SandboxJS) is **more secure but complex**:

| Feature | JailJS | SandboxJS |
|---------|--------|-----------|
| **Frozen built-ins** | ✅ Math, JSON, console | ✅ Configurable |
| **Prototype whitelist** | ❌ No whitelist | ✅ Full whitelist system |
| **Execution quota** | ⚠️ Simple counter | ✅ BigInt quota + hooks |
| **Audit mode** | ❌ No | ✅ Reports all API access |
| **Jailbreak tests** | ❌ No | ✅ Comprehensive suite |
| **eval/Function sandbox** | ✅ Re-interpret eval | ✅ Recursive sandboxing |
| **Bundle size** | 🎯 ~10 KB | ~larger |
| **Complexity** | 🎯 Low | Higher |

**When to use JailJS**:
- ✅ Plugin systems with trusted code
- ✅ User scripts with limited API surface
- ✅ Size-constrained environments
- ✅ Simple isolation needs

**When to use SandboxJS**:
- ✅ Untrusted third-party code
- ✅ Need prototype access control
- ✅ Require audit/compliance reporting
- ✅ Mission-critical security

**Other alternatives**:
- [isolated-vm](https://github.com/laverdet/isolated-vm) - V8 isolates for Node.js
- [QuickJS](https://bellard.org/quickjs/) - Separate JavaScript engine
- Web Workers or separate processes for true isolation

### To Match SandboxJS Security

To make JailJS as secure as SandboxJS, we would need:

**1. Prototype Whitelist System** (biggest gap)
```typescript
// SandboxJS approach: check every prototype access
const whitelist = new Map([
  [Array.prototype, new Set(['push', 'pop', 'map', 'filter'])],
  [Object.prototype, new Set(['hasOwnProperty', 'toString'])],
]);
// Throw error if accessing non-whitelisted method
```

**2. Execution Quota with Hooks**
```typescript
// SandboxJS approach: BigInt ticks + callback
const sandbox = new Interpreter({}, {
  executionQuota: 1000000n,
  onQuotaReached: (ticks) => {
    // Allow user to decide: continue or abort
    return confirm('Continue execution?');
  }
});
```

**3. Audit Mode**
```typescript
// SandboxJS approach: track all API access
const report = Interpreter.audit(code);
// Returns: { globals: Set(['Math', 'Array']), prototypes: {...} }
```

**4. Jailbreak Prevention Tests**
- Test against `[].filter.constructor` escapes
- Test against prototype chain climbing
- Test against Function constructor reconstruction

**Contributions welcome!** If you need these features, consider:
- Using SandboxJS (production-ready, maintained)
- Contributing to JailJS (help us add these features)
- Implementing your own prototype checks on top of JailJS

## API

### `Interpreter`

```typescript
class Interpreter {
  constructor(
    globalEnv?: Record<string, any>,
    options?: {
      maxOps?: number;
      parse?: (code: string) => Program;
    }
  );

  evaluate(ast: Program): any;
}
```

### `parse`

```typescript
function parse(code: string): Program;
```

### `transformToES5`

```typescript
function transformToES5(
  code: string,
  options?: {
    targets?: Record<string, string | number>;
    typescript?: boolean;
    jsx?: boolean;
  }
): Program;
```

## Supported Features

### Native ES5 Support (Zero Dependencies)
- ✅ All operators, control flow, statements
- ✅ Functions, closures, recursion
- ✅ Objects, arrays, prototypes
- ✅ Variable hoisting (var)
- ✅ Proper `this` binding and `arguments`
- ✅ `try`/`catch`/`finally`, `throw`
- ✅ `typeof`, `instanceof`, `in`, `delete`

### ES6+ via Transformation (See [ES6+ Transformation](#es6-transformation))
- ✅ Classes, arrow functions, template literals
- ✅ `let`/`const`, destructuring, spread operators
- ✅ Default parameters, computed properties
- ✅ Async/await (full support)
- ✅ TypeScript and JSX (optional)

### Not Supported
- ❌ Generators (work in progress)
- ❌ ES6 modules (use bundler instead)
- ❌ Proxies, Reflect, WeakRef
- ❌ SharedArrayBuffer, Atomics

## Performance

Execution is ~10-100x slower than native JavaScript. Use `maxOps` for timeout protection on untrusted code.

## Development

```bash
npm install
npm run build
npm test
npm run dev      # Watch mode for core + examples
```

## License

MIT
