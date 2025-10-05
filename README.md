# JailJS

JavaScript AST interpreter for sandboxed execution in browsers and Node.js.

[Read the "behind the scenes" blog post](https://mariozechner.at/posts/2025-10-05-jailjs/)

## Features

- **Complete ES5 Support**: Full implementation of all ES5 language features
- **ES6+ Transformation**: Optional tree-shakeable helper to transform modern JavaScript to ES5
- **Sandboxed Execution**: Run untrusted code in a controlled environment with custom globals
- **Tree-shakeable**: Separate parser from interpreter - parse ahead-of-time and bundle only the 10 KB interpreter
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

See the [example](example/) folder for complete demonstrations:

- **[web](example/web)** - Browser playground with Tailwind UI, demonstrates recursion, closures, array methods
- **[node](example/node)** - CLI demo showing sandboxed execution, timeout protection, and eval()
- **[chrome-extension](example/chrome-extension)** - Manifest V3 extension with Tampermonkey-style user scripts, DOM access in isolated world

## Default Environment

The interpreter exposes these globals by default (see [interpreter.ts:54-100](src/interpreter.ts#L54-L100)):

```typescript
// Safe built-ins
console, Math, Date, JSON, RegExp
Array, Object, String, Number, Boolean

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

Override by passing custom globals:

```typescript
const interpreter = new Interpreter({
  console: { log: (...args) => console.log('[Sandbox]', ...args) },
  Math: Math,
  // Only these globals will be available
});
```

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

Transform modern JavaScript to ES5 using the optional `transform` module:

```typescript
import { Interpreter } from '@mariozechner/jailjs';
import { transformToES5 } from '@mariozechner/jailjs/transform';

// Transform ES6+ to ES5 AST
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

**Options**:

```typescript
transformToES5(code, {
  targets: { ie: 11 },     // Browser targets (default: IE 11)
  typescript: true,        // Enable TypeScript support
  jsx: true                // Enable JSX support
});
```

The transform module uses `@babel/standalone` and is tree-shakeable - only include it if you need ES6+ support. Note: adds ~3 MB to bundle size.

## Security

- **Sandboxed**: Custom global environment, no access to host globals unless explicitly provided
- **Prototype pollution protection**: Blocks `__proto__`, `constructor.prototype` access
- **Timeout protection**: Optional operation counting with `maxOps`
- **eval() control**: Requires explicit parser injection, disabled by default

```typescript
const interpreter = new Interpreter({}, {
  maxOps: 100000,  // Prevent infinite loops
  parse: parse      // Enable eval() in sandboxed code
});
```

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

**ES5 Complete**:
- All operators, control flow, statements
- Functions, closures, recursion
- Objects, arrays, prototypes
- Variable hoisting (var)
- Proper `this` binding and `arguments`

**ES6+ via Transformation**:
- Arrow functions, classes, template literals
- `let`/`const`, destructuring, spread
- Default parameters, computed properties
- Async/await (basic support - return values may be incorrect)
- TypeScript and JSX (optional)

**Not Supported**:
- Generators (complex regenerator state machine)
- ES6 modules (use bundler instead)

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
