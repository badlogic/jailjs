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
      console.log("[JailJS] Executing code:", message.code);

      try {
         // Parse and execute the code
         const ast = parse(message.code);
         const result = interpreter.evaluate(ast);

         console.log("[JailJS] Execution result:", result);
         sendResponse({ success: true, result: result });
      } catch (error: any) {
         console.error("[JailJS] Execution error:", error);
         sendResponse({
            success: false,
            error: error.message,
            stack: error.stack,
         });
      }
   }

   return true; // Keep channel open for async response
});
