import { Interpreter, parse } from "@mariozechner/jailjs";
import { transformToES5 } from "@mariozechner/jailjs/transform";

const examples: Record<string, string> = {
   fibonacci: `var fibonacci = function(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

fibonacci(10)`,

   closure: `var makeCounter = function() {
  var count = 0;
  return function() {
    return ++count;
  };
};

var counter = makeCounter();
counter(); // 1
counter(); // 2
counter()  // 3`,

   array: `var numbers = [1, 2, 3, 4, 5];

var doubled = numbers.map(function(x) {
  return x * 2;
});

var evens = doubled.filter(function(x) {
  return x % 2 === 0;
});

evens.reduce(function(sum, x) {
  return sum + x;
}, 0)`,

   es6: `// ES6+ features transformed to ES5
class Counter {
  constructor(start = 0) {
    this.value = start;
  }

  increment() {
    return ++this.value;
  }
}

const counter = new Counter(10);
const numbers = [1, 2, 3];
const doubled = numbers.map(x => x * 2);
const [first, ...rest] = doubled;

JSON.stringify({
  counter: counter.increment(),
  first,
  rest,
  total: [...rest].reduce((a, b) => a + b, 0)
})`,

   async: `// Async/await transformed to ES5
async function fetchData(delay) {
  const result = await new Promise(resolve => {
    setTimeout(() => resolve({ value: 42 }), delay);
  });
  return result.value;
}

async function processData() {
  const x = await fetchData(100);
  const y = await fetchData(50);
  return { x, y, sum: x + y };
}

processData()`,

   danger: `// ⚠️ SECURITY DEMO: Prototype Pollution Attack
// This shows WHY JailJS is NOT safe for LLM/untrusted code!

// Malicious code pollutes Array.prototype:
Array.prototype.push = function(item) {
  alert('🚨 HIJACKED! Stealing: ' + item);
  return 0; // Break normal behavior
};

// Return something to show it "worked"
"Prototype polluted! Now click 'Test Attack' below..."`,
};

const codeTextarea = document.getElementById("code") as HTMLTextAreaElement;
const executeButton = document.getElementById("execute") as HTMLButtonElement;
const resultDiv = document.getElementById("result") as HTMLDivElement;
const resultContent = document.getElementById("result-content") as HTMLPreElement;

const interpreter = new Interpreter(
   {
      console: {
         log: (...args: any[]) => console.log("[Sandbox]", ...args),
      },
      Math: Math,
      JSON: JSON,
      Date: Date,
      Object: Object,
      Array: Array,
      setTimeout: setTimeout,
   },
   {
      parse: parse,
      maxOps: 1000000, // Prevent infinite loops
   },
);

const attackDemo = document.getElementById("attack-demo") as HTMLDivElement;
const testAttackButton = document.getElementById("test-attack") as HTMLButtonElement;

document.querySelectorAll(".example-btn").forEach((btn) => {
   btn.addEventListener("click", () => {
      const name = (btn as HTMLButtonElement).dataset.name;
      if (name && examples[name]) {
         codeTextarea.value = examples[name];
         codeTextarea.focus();

         // Show attack demo section only for the danger example
         if (name === "danger") {
            attackDemo.classList.remove("hidden");
         } else {
            attackDemo.classList.add("hidden");
         }
      }
   });
});

executeButton.addEventListener("click", async () => {
   const code = codeTextarea.value.trim();

   if (!code) {
      showResult("Please enter some code", false);
      return;
   }

   executeButton.disabled = true;
   executeButton.textContent = "Executing...";

   try {
      // Transform all code to ES5 (handles both ES5 and ES6+ input)
      const ast = transformToES5(code);
      const result = interpreter.evaluate(ast);

      // Handle promises (from async functions)
      if (result instanceof Promise) {
         const resolvedResult = await result;
         showResult(formatResult(resolvedResult), true);
      } else {
         showResult(formatResult(result), true);
      }
   } catch (error: any) {
      showResult(`Error: ${error.message}\n\n${error.stack || ""}`, false);
   } finally {
      executeButton.disabled = false;
      executeButton.textContent = "Execute";
   }
});

// Test Attack: Demonstrates how sandboxed code can affect the app's own code
testAttackButton.addEventListener("click", () => {
   // This is the APP'S OWN CODE (not in sandbox)
   // It will use the polluted Array.prototype from the sandboxed code

   const userData = ["user@example.com", "session-token-123", "api-key-secret"];

   // Normal app code trying to add data to an array
   userData.push("new-item");

   // The alert will show "HIJACKED! Stealing: new-item"
   // In a real attack, this would exfiltrate to an attacker's server

   alert(
      "If you saw the 'HIJACKED' alert, the attack succeeded! " +
         "The sandboxed code polluted Array.prototype, and now this app's OWN code " +
         "(running outside the sandbox) is compromised.",
   );
});

function formatResult(result: any): string {
   if (result === undefined) return "undefined";
   if (result === null) return "null";
   if (typeof result === "string") return result;
   if (typeof result === "object") {
      try {
         return JSON.stringify(result, null, 2);
      } catch {
         return String(result);
      }
   }
   return String(result);
}

function showResult(message: string, success: boolean) {
   resultDiv.classList.remove("hidden");
   resultContent.textContent = message;
   resultContent.className = success
      ? "font-mono text-sm text-green-700 whitespace-pre-wrap break-all"
      : "font-mono text-sm text-red-700 whitespace-pre-wrap break-all";
}

codeTextarea.addEventListener("keydown", (e) => {
   if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      executeButton.click();
   }
});
