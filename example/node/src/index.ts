import { Interpreter, parse } from "@mariozechner/jailjs";

console.log("JailJS - Node.js Example");
console.log("========================\n");

// Create interpreter with custom globals
const interpreter = new Interpreter(
   {
      console: {
         log: (...args: any[]) => console.log("[Sandbox]", ...args),
      },
      Math: Math,
      JSON: JSON,
   },
   {
      parse: parse,
      maxOps: 100000,
   },
);

// Example 1: Fibonacci
console.log("1. Fibonacci (recursive):");
const fibCode = `
var fibonacci = function(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};
fibonacci(10)
`;
const fibResult = interpreter.evaluate(parse(fibCode));
console.log(`   fibonacci(10) = ${fibResult}\n`);

// Example 2: Closure
console.log("2. Closure (counter):");
const closureCode = `
var makeCounter = function() {
  var count = 0;
  return function() {
    return ++count;
  };
};

var counter = makeCounter();
var results = [];
results.push(counter());
results.push(counter());
results.push(counter());
results
`;
const closureResult = interpreter.evaluate(parse(closureCode));
console.log(`   Results: ${JSON.stringify(closureResult)}\n`);

// Example 3: Array methods
console.log("3. Array methods (map, filter, reduce):");
const arrayCode = `
var numbers = [1, 2, 3, 4, 5];
var doubled = numbers.map(function(x) { return x * 2; });
var evens = doubled.filter(function(x) { return x % 2 === 0; });
evens.reduce(function(sum, x) { return sum + x; }, 0)
`;
const arrayResult = interpreter.evaluate(parse(arrayCode));
console.log(`   Sum of doubled evens: ${arrayResult}\n`);

// Example 4: Execution timeout
console.log("4. Execution timeout protection:");
try {
   const infiniteLoop = "while(true) {}";
   interpreter.evaluate(parse(infiniteLoop));
} catch (error: any) {
   console.log(`   ✓ Caught infinite loop: ${error.message}\n`);
}

// Example 5: Sandboxed eval
console.log("5. Sandboxed eval():");
const evalCode = `
var code = '2 + 2';
eval(code)
`;
const evalResult = interpreter.evaluate(parse(evalCode));
console.log(`   eval('2 + 2') = ${evalResult}\n`);

console.log("All examples completed successfully!");
