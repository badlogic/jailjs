// Content script - runs in isolated world with JailJS interpreter
import { Interpreter, parse } from "@mariozechner/jailjs";

console.log("[JailJS] Content script loaded in isolated world");

// Create interpreter with safe DOM access
const interpreter = new Interpreter(
   {
      // Expose controlled DOM
      document: document,
      window: window,

      // Safe console
      console: {
         log: (...args: any[]) => console.log("[Sandbox]", ...args),
         error: (...args: any[]) => console.error("[Sandbox]", ...args),
         warn: (...args: any[]) => console.warn("[Sandbox]", ...args),
      },

      // Timers
      setTimeout: setTimeout.bind(window),
      setInterval: setInterval.bind(window),
      clearTimeout: clearTimeout.bind(window),
      clearInterval: clearInterval.bind(window),

      // Utilities
      Math: Math,
      JSON: JSON,
      Date: Date,
   },
   {
      // Inject parser for eval() support
      parse: parse,
   },
);

console.log("[JailJS] Interpreter initialized with parser");

// Listen for code execution requests from side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
   if (message.type === "EXECUTE_CODE") {
      const mode = message.mode || "jailjs";
      console.log(`[${mode}] Executing code:`, message.code);

      try {
         let result: any;

         if (mode === "jailjs") {
            // JailJS sandboxed execution
            const ast = parse(message.code);
            result = interpreter.evaluate(ast);
         } else if (mode === "eval") {
            // Native eval() - may be blocked by CSP
            // biome-ignore lint/security/noGlobalEval: Intentional for demonstration purposes
            result = eval(message.code);
         } else if (mode === "script") {
            // Inject <script> into page context
            const script = document.createElement("script");
            script.textContent = `
               (function() {
                  try {
                     const __result = ${message.code};
                     document.body.dataset.__extensionResult = JSON.stringify(__result);
                  } catch (e) {
                     document.body.dataset.__extensionError = e.message;
                  }
               })();
            `;
            document.documentElement.appendChild(script);
            script.remove();

            // Read result from page context
            if (document.body.dataset.__extensionError) {
               const error = document.body.dataset.__extensionError;
               delete document.body.dataset.__extensionError;
               throw new Error(error);
            }

            result = document.body.dataset.__extensionResult
               ? JSON.parse(document.body.dataset.__extensionResult)
               : undefined;
            delete document.body.dataset.__extensionResult;
         }

         console.log(`[${mode}] Execution result:`, result);
         sendResponse({ success: true, result: result });
      } catch (error: any) {
         console.error(`[${mode}] Execution error:`, error);
         sendResponse({
            success: false,
            error: error.message,
            stack: error.stack,
         });
      }
   }

   return true; // Keep channel open for async response
});
