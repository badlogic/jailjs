# JailJS Node.js Example

Command-line demonstration of JailJS sandboxed JavaScript execution in Node.js.

## What It Does

Demonstrates key JailJS features through 5 examples:

1. **Fibonacci (Recursive)** - Shows function recursion support
2. **Closure (Counter)** - Demonstrates closures and private state
3. **Array Methods** - Shows map, filter, reduce operations
4. **Execution Timeout** - Demonstrates infinite loop protection with `maxOps`
5. **Sandboxed eval()** - Shows how eval() works with parser injection

## Running

```bash
# Install dependencies
npm install

# Build and run
npm start
```

## Features

- Custom global environment (console, Math, JSON)
- Execution timeout protection (100,000 operations max)
- Parser injection for `eval()` support
- Error handling demonstration

## Output Example

```
JailJS - Node.js Example
========================

1. Fibonacci (recursive):
   fibonacci(10) = 55

2. Closure (counter):
   Results: [1,2,3]

3. Array methods (map, filter, reduce):
   Sum of doubled evens: 30

4. Execution timeout protection:
   ✓ Caught infinite loop: Execution timeout: maximum operations exceeded

5. Sandboxed eval():
   eval('2 + 2') = 4

All examples completed successfully!
```
