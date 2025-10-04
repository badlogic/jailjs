/**
 * ⚠️ SECURITY TEST SUITE - READ THIS FIRST ⚠️
 *
 * This test suite demonstrates KNOWN vulnerabilities and protections in JailJS.
 * It is NOT a comprehensive security test suite.
 *
 * PURPOSE:
 * - Show which attacks ARE prevented (constructor escapes, __proto__ access)
 * - Show which attacks are NOT prevented (prototype pollution)
 * - Document the security model for users
 *
 * WHAT THIS DOES NOT COVER:
 * - There are MANY undiscovered attack vectors
 * - New JavaScript features may introduce new escapes
 * - Timing attacks, side-channels, and other exotic vectors
 * - Attacks via provided globals (depends on what you pass in)
 *
 * SECURITY MODEL:
 * JailJS provides ISOLATION, not comprehensive sandboxing.
 *
 * ✅ PROTECTED AGAINST:
 * - Constructor chain escapes ([].constructor.constructor)
 * - __proto__ access
 * - Direct globalThis/window/self access
 *
 * ❌ NOT PROTECTED AGAINST:
 * - Prototype pollution (if you provide Array/Object)
 * - Mutation of provided globals
 * - Resource exhaustion (use maxOps)
 * - Many other attack vectors
 *
 * FOR UNTRUSTED/ADVERSARIAL CODE:
 * Use SandboxJS (https://github.com/nyariv/SandboxJS) or isolated environments
 * (Web Workers, separate processes, sandboxed iframes).
 *
 * FOR LLM-GENERATED CODE:
 * Layer JailJS inside sandboxed iframes with minimal API surface.
 * See LLM-SECURITY.md for detailed guidance.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Interpreter } from "./interpreter";
import { parse } from "./parser";

describe("Security - Sandbox Limitations", () => {
   let originalArrayPush: typeof Array.prototype.push;

   beforeEach(() => {
      // Save original methods before each test
      originalArrayPush = Array.prototype.push;
   });

   afterEach(() => {
      // Restore prototypes after each test
      if (typeof Array.prototype.push !== "function") {
         Array.prototype.push = originalArrayPush;
      }
      delete (Array.prototype as any).HIJACKED;
      delete (Object.prototype as any).polluted;
   });

   it("VULNERABILITY: Array.prototype pollution affects host environment", () => {
      const interpreter = new Interpreter(
         {
            Array: Array,
         },
         { parse },
      );

      // Sandboxed code pollutes Array.prototype
      interpreter.evaluate(
         parse(`
         Array.prototype.HIJACKED = true;
      `),
      );

      // Host code creates a new array - it's affected!
      const hostArray: any[] = [];
      expect((hostArray as any).HIJACKED).toBe(true);

      // Clean up immediately to prevent vitest from breaking
      delete (Array.prototype as any).HIJACKED;
   });

   it("VULNERABILITY: Array.prototype method can be replaced with string", () => {
      const interpreter = new Interpreter(
         {
            Array: Array,
         },
         { parse },
      );

      // Sandboxed code replaces push with a string marker
      interpreter.evaluate(
         parse(`
         Array.prototype.push = "REPLACED";
      `),
      );

      // Host code sees the replacement
      const hostArray: any = [];
      expect(hostArray.push).toBe("REPLACED");
      expect(typeof hostArray.push).toBe("string");

      // Restore immediately to prevent vitest from breaking
      Array.prototype.push = originalArrayPush;
   });

   it("VULNERABILITY: Object.prototype pollution affects all objects", () => {
      const interpreter = new Interpreter(
         {
            Object: Object,
         },
         { parse },
      );

      interpreter.evaluate(
         parse(`
         Object.prototype.polluted = "compromised";
      `),
      );

      const hostObj = {};
      expect((hostObj as any).polluted).toBe("compromised");

      // Clean up immediately
      delete (Object.prototype as any).polluted;
   });

   it("VULNERABILITY: Built-in Array is available even if not explicitly provided", () => {
      const interpreter = new Interpreter({}, { parse });

      // Array constructor is available from built-ins
      const result = interpreter.evaluate(
         parse(`
         var arr = [];
         arr instanceof Array;
      `),
      );

      expect(result).toBe(true);
   });

   it("VULNERABILITY: Providing Array enables prototype pollution", () => {
      const interpreter = new Interpreter(
         {
            Array: Array,
         },
         { parse },
      );

      // With Array provided, can pollute it
      interpreter.evaluate(
         parse(`
         Array.prototype.malicious = "pwned";
      `),
      );

      // Host is affected
      const hostArray: any = [];
      expect(hostArray.malicious).toBe("pwned");

      // Clean up
      delete (Array.prototype as any).malicious;
   });

   describe("PROTECTION: Constructor Chain Escapes", () => {
      it("should block [].constructor access", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            arr.constructor;
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block [].constructor.constructor via array literal", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         expect(() => {
            interpreter.evaluate(
               parse(`
               var F = [].constructor.constructor;
               F;
            `),
            );
         }).toThrow(/Cannot read properties of undefined/);
      });

      it("should block constructor via string concatenation", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            var prop = 'const' + 'ructor';
            arr[prop];
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block constructor via computed property", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            var key = 'constructor';
            arr[key];
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block constructor on objects", () => {
         const interpreter = new Interpreter(
            {
               Object: Object,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var obj = {};
            obj.constructor;
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block constructor on strings", () => {
         const interpreter = new Interpreter(
            {
               String: String,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var str = "test";
            str.constructor;
         `),
         );

         expect(result).toBeUndefined();
      });
   });

   describe("PROTECTION: __proto__ Access", () => {
      it("should block __proto__ access", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            arr.__proto__;
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block __proto__ via computed property", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            arr['__proto__'];
         `),
         );

         expect(result).toBeUndefined();
      });

      it("should block __proto__ via string concatenation", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         const result = interpreter.evaluate(
            parse(`
            var arr = [];
            var key = '__pro' + 'to__';
            arr[key];
         `),
         );

         expect(result).toBeUndefined();
      });
   });

   describe("PROTECTION: Global Object Access", () => {
      it("should not have globalThis in scope", () => {
         const interpreter = new Interpreter({}, { parse });

         expect(() => {
            interpreter.evaluate(
               parse(`
               globalThis;
            `),
            );
         }).toThrow(/globalThis is not defined/);
      });

      it("should not have window in scope", () => {
         const interpreter = new Interpreter({}, { parse });

         expect(() => {
            interpreter.evaluate(
               parse(`
               window;
            `),
            );
         }).toThrow(/window is not defined/);
      });

      it("should not have self in scope", () => {
         const interpreter = new Interpreter({}, { parse });

         expect(() => {
            interpreter.evaluate(
               parse(`
               self;
            `),
            );
         }).toThrow(/self is not defined/);
      });

      it("should return undefined for 'this' in function context", () => {
         const interpreter = new Interpreter({}, { parse });

         const result = interpreter.evaluate(
            parse(`
            var getThis = function() {
               return this;
            };
            getThis();
         `),
         );

         expect(result).toBeUndefined();
      });
   });

   describe("PROTECTION: Reflection APIs Not Available", () => {
      it("should not have Reflect in scope", () => {
         const interpreter = new Interpreter({}, { parse });

         expect(() => {
            interpreter.evaluate(
               parse(`
               Reflect;
            `),
            );
         }).toThrow(/Reflect is not defined/);
      });

      it("should not have Proxy in scope by default", () => {
         const interpreter = new Interpreter({}, { parse });

         expect(() => {
            interpreter.evaluate(
               parse(`
               Proxy;
            `),
            );
         }).toThrow(/Proxy is not defined/);
      });
   });

   describe("LIMITATION: Prototype Pollution Still Possible", () => {
      it("KNOWN ISSUE: Can pollute Array.prototype properties", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         interpreter.evaluate(
            parse(`
            Array.prototype.evil = "still works";
         `),
         );

         const hostArray: any = [];
         expect(hostArray.evil).toBe("still works");

         // Clean up
         delete (Array.prototype as any).evil;
      });

      it("KNOWN ISSUE: Can pollute Object.prototype properties", () => {
         const interpreter = new Interpreter(
            {
               Object: Object,
            },
            { parse },
         );

         interpreter.evaluate(
            parse(`
            Object.prototype.evil = "still works";
         `),
         );

         const hostObj: any = {};
         expect(hostObj.evil).toBe("still works");

         // Clean up
         delete (Object.prototype as any).evil;
      });

      it("KNOWN ISSUE: Can replace prototype methods with non-functions", () => {
         const interpreter = new Interpreter(
            {
               Array: Array,
            },
            { parse },
         );

         interpreter.evaluate(
            parse(`
            Array.prototype.push = "HIJACKED";
         `),
         );

         const hostArray: any = [];
         expect(hostArray.push).toBe("HIJACKED");

         // Restore
         Array.prototype.push = originalArrayPush;
      });
   });
});
