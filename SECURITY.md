# Security Policy

## Overview

JailJS provides **code isolation**, not comprehensive security sandboxing. It creates a controlled execution environment for JavaScript code but should not be relied upon as the sole security mechanism for running untrusted code.

## Threat Model

### What JailJS Protects Against

✅ **Accidental scope leakage** - User code cannot accidentally access your application's variables or functions
✅ **Basic script isolation** - Multiple scripts can run with separate global scopes
✅ **Unintentional infinite loops** - `maxOps` prevents runaway execution
✅ **Direct global access** - No access to `window`, `process`, or other host globals unless explicitly provided

### What JailJS Does NOT Protect Against

❌ **Determined attackers** - Advanced techniques may bypass isolation
❌ **Prototype pollution** - Built-in objects are shared by reference and can be mutated
❌ **Resource exhaustion** - No limits on memory allocation, object creation, or stack depth
❌ **Side-channel attacks** - Timing attacks or other indirect information leakage
❌ **Supply chain attacks** - Dependencies in transformed code are not validated

## Known Vulnerabilities

### 1. Shared Built-in Objects

Built-in objects like `Math`, `Object`, `Array` are passed by reference:

```javascript
// Malicious code can mutate shared objects
const interpreter = new Interpreter({ Math, Array });
interpreter.evaluate(parse(`
  Math.random = () => 0.5;  // Affects all code
  Array.prototype.push = () => {};  // Breaks all arrays
`));
```

**Mitigation**: Freeze or clone built-ins before passing:
```javascript
const safeMath = Object.freeze({ ...Math });
const interpreter = new Interpreter({ Math: safeMath });
```

### 2. No Prototype Whitelist

Any method on any prototype can be accessed:

```javascript
// Can access any prototype method
interpreter.evaluate(parse(`
  [].constructor.prototype.forEach = null;  // Breaks all arrays
`));
```

**Mitigation**: Minimize provided globals. Don't provide `Object`, `Array`, etc. unless required.

### 3. Simple Operation Counter

The `maxOps` counter is easily defeated:

```javascript
// Creates many objects but few operations
const malicious = `
  let obj = {};
  for (let i = 0; i < 1000000; i++) {
    obj[i] = new Array(1000000);  // Memory exhaustion
  }
`;
```

**Mitigation**: Run in web workers or separate processes with system-level resource limits.

### 4. No Timeout on Async Code

`maxOps` only counts synchronous operations:

```javascript
// Async code bypasses maxOps
const interpreter = new Interpreter({ setTimeout }, { maxOps: 1000 });
interpreter.evaluate(parse(`
  async function infiniteLoop() {
    while (true) await Promise.resolve();
  }
  infiniteLoop();
`));
```

**Mitigation**: Implement your own timeout mechanism for async code.

## Security Recommendations

### 1. Defense in Depth

Never rely on JailJS alone for security. Layer multiple protections:

```javascript
// Layer 1: JailJS isolation
const interpreter = new Interpreter(
  { /* minimal globals */ },
  { maxOps: 100000 }
);

// Layer 2: Web Worker isolation
const worker = new Worker('sandbox-worker.js');
worker.postMessage({ code: userCode });

// Layer 3: CSP headers
// Content-Security-Policy: script-src 'self'

// Layer 4: Rate limiting
// Limit executions per user/IP

// Layer 5: Monitoring
// Log all executed code and errors
```

### 2. Minimize Attack Surface

Only provide what's absolutely necessary:

```javascript
// ❌ BAD: Too many globals
const interpreter = new Interpreter({
  Math, Object, Array, JSON, console, setTimeout, fetch
});

// ✅ GOOD: Minimal globals
const interpreter = new Interpreter({
  console: { log: (...args) => log('[Sandbox]', ...args) },
  // Only custom APIs your scripts need
  myAPI: {
    getData: () => safeFetchData()
  }
});
```

### 3. Freeze Built-ins

Prevent mutation of shared objects:

```javascript
const safeBuiltins = {
  Math: Object.freeze({ ...Math }),
  JSON: Object.freeze({
    parse: JSON.parse.bind(JSON),
    stringify: JSON.stringify.bind(JSON)
  }),
  console: Object.freeze({
    log: console.log.bind(console)
  })
};

const interpreter = new Interpreter(safeBuiltins);
```

### 4. Validate and Sanitize

Pre-process code before execution:

```javascript
// Check for suspicious patterns
const dangerous = /(__proto__|constructor\.prototype|Function\(|eval\()/;
if (dangerous.test(userCode)) {
  throw new Error('Suspicious code detected');
}

// Parse and validate AST
const ast = parse(userCode);
// Walk AST to check for forbidden patterns

// Then execute
interpreter.evaluate(ast);
```

### 5. Run in Isolated Contexts

Use system-level isolation when possible:

```javascript
// Web Worker (browsers)
const worker = new Worker('sandbox-worker.js');
worker.postMessage({ code: userCode });

// Child Process (Node.js)
const { fork } = require('child_process');
const child = fork('sandbox-process.js');
child.send({ code: userCode });
child.kill(5000); // Timeout

// VM with resource limits (Node.js)
const { VM } = require('vm2');
const vm = new VM({ timeout: 1000, sandbox: {} });
vm.run(userCode);
```

## Alternative Solutions

For mission-critical security, consider these alternatives:

### Stricter Sandboxes
- **[SandboxJS](https://github.com/nyariv/SandboxJS)** - Prototype whitelist, execution quota, audit mode
- **[VM2](https://github.com/patriksimek/vm2)** - Hardened VM for Node.js (archived, use with caution)
- **[isolated-vm](https://github.com/laverdet/isolated-vm)** - V8 isolates for Node.js

### Separate Engines
- **[QuickJS](https://bellard.org/quickjs/)** - Lightweight JavaScript engine
- **[Duktape](https://duktape.org/)** - Embeddable JavaScript engine
- **[Deno](https://deno.land/)** - Secure runtime with explicit permissions

### System-Level Isolation
- **Web Workers** - Separate thread in browsers
- **iframes with sandbox** - DOM isolation
- **Docker containers** - Full process isolation
- **Cloud Functions** - Serverless execution

## Reporting Security Issues

If you discover a security vulnerability in JailJS:

1. **Do NOT open a public issue**
2. Email the maintainer directly with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work on a fix.

## Security Best Practices Summary

1. ✅ Always set `maxOps` to prevent infinite loops
2. ✅ Minimize provided globals to only what's needed
3. ✅ Freeze or clone built-in objects before passing
4. ✅ Layer additional security (workers, CSP, rate limits)
5. ✅ Monitor and log all executed code
6. ✅ Validate code before execution when possible
7. ✅ Use system-level isolation for untrusted code
8. ❌ Never rely on JailJS alone for critical security
9. ❌ Never run adversarial code without additional protection
10. ❌ Never trust user input without validation

## Version Support

Only the latest version receives security updates. Please upgrade regularly.
