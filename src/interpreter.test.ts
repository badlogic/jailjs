import { describe, expect, it } from "vitest";
import { Interpreter, type InterpreterOptions } from "./interpreter";
import { parse } from "./parser";

// Helper to maintain existing test API
class TestInterpreter extends Interpreter {
   constructor(globalEnv: Record<string, any> = {}, options: InterpreterOptions = {}) {
      super(globalEnv, { ...options, parse }); // Inject parser for eval() support
   }

   run(code: string): any {
      return this.evaluate(parse(code));
   }
}

describe("Interpreter - ES5 Smoke Tests", () => {
   describe("Literals", () => {
      it("should handle number literals", () => {
         const interp = new TestInterpreter();
         expect(interp.run("42")).toBe(42);
         expect(interp.run("3.14")).toBe(3.14);
         expect(interp.run("0")).toBe(0);
      });

      it("should handle string literals", () => {
         const interp = new TestInterpreter();
         expect(interp.run('"hello"')).toBe("hello");
         expect(interp.run("'world'")).toBe("world");
      });

      it("should handle boolean literals", () => {
         const interp = new TestInterpreter();
         expect(interp.run("true")).toBe(true);
         expect(interp.run("false")).toBe(false);
      });

      it("should handle null", () => {
         const interp = new TestInterpreter();
         expect(interp.run("null")).toBe(null);
      });

      it("should handle undefined", () => {
         const interp = new TestInterpreter();
         expect(interp.run("undefined")).toBe(undefined);
      });

      it("should handle regex literals", () => {
         const interp = new TestInterpreter();
         const result = interp.run("/test/gi");
         expect(result).toBeInstanceOf(RegExp);
         expect(result.source).toBe("test");
         expect(result.flags).toBe("gi");
      });
   });

   describe("Variables", () => {
      it("should declare and use var", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = 5; x")).toBe(5);
      });

      it("should handle var hoisting", () => {
         const interp = new TestInterpreter();
         expect(interp.run("x = 10; var x; x")).toBe(10);
      });

      it("should handle var function scoping", () => {
         const interp = new TestInterpreter();
         const result = interp.run(`
				function test() {
					if (true) {
						var x = 5;
					}
					return x;
				}
				test()
			`);
         expect(result).toBe(5);
      });
   });

   describe("Arithmetic Operations", () => {
      it("should handle basic arithmetic", () => {
         const interp = new TestInterpreter();
         expect(interp.run("2 + 3")).toBe(5);
         expect(interp.run("10 - 4")).toBe(6);
         expect(interp.run("3 * 7")).toBe(21);
         expect(interp.run("15 / 3")).toBe(5);
         expect(interp.run("10 % 3")).toBe(1);
      });

      it("should handle operator precedence", () => {
         const interp = new TestInterpreter();
         expect(interp.run("2 + 3 * 4")).toBe(14);
         expect(interp.run("(2 + 3) * 4")).toBe(20);
      });

      it("should handle unary operators", () => {
         const interp = new TestInterpreter();
         expect(interp.run("-5")).toBe(-5);
         expect(interp.run("+5")).toBe(5);
         expect(interp.run("!true")).toBe(false);
         expect(interp.run("!false")).toBe(true);
      });

      it("should handle increment/decrement", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = 5; x++")).toBe(5);
         expect(interp.run("var x = 5; ++x")).toBe(6);
         expect(interp.run("var x = 5; x--")).toBe(5);
         expect(interp.run("var x = 5; --x")).toBe(4);
      });
   });

   describe("Comparison and Logical Operations", () => {
      it("should handle comparison operators", () => {
         const interp = new TestInterpreter();
         expect(interp.run("5 > 3")).toBe(true);
         expect(interp.run("5 < 3")).toBe(false);
         expect(interp.run("5 >= 5")).toBe(true);
         expect(interp.run("5 <= 4")).toBe(false);
         expect(interp.run("5 == 5")).toBe(true);
         expect(interp.run("5 === 5")).toBe(true);
         expect(interp.run("5 != 4")).toBe(true);
         expect(interp.run('5 !== "5"')).toBe(true);
      });

      it("should handle logical operators", () => {
         const interp = new TestInterpreter();
         expect(interp.run("true && true")).toBe(true);
         expect(interp.run("true && false")).toBe(false);
         expect(interp.run("true || false")).toBe(true);
         expect(interp.run("false || false")).toBe(false);
      });

      it("should handle short-circuit evaluation", () => {
         const interp = new TestInterpreter();
         expect(interp.run("false && undefined.x")).toBe(false);
         expect(interp.run("true || undefined.x")).toBe(true);
      });
   });

   describe("Bitwise Operations", () => {
      it("should handle bitwise operators", () => {
         const interp = new TestInterpreter();
         expect(interp.run("5 & 3")).toBe(1);
         expect(interp.run("5 | 3")).toBe(7);
         expect(interp.run("5 ^ 3")).toBe(6);
         expect(interp.run("~5")).toBe(-6);
         expect(interp.run("5 << 1")).toBe(10);
         expect(interp.run("5 >> 1")).toBe(2);
         expect(interp.run("-5 >>> 1")).toBe(2147483645);
      });
   });

   describe("Objects", () => {
      it("should create and access objects", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {x: 5}; obj.x")).toBe(5);
         expect(interp.run('var obj = {x: 5}; obj["x"]')).toBe(5);
      });

      it("should modify object properties", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {x: 5}; obj.x = 10; obj.x")).toBe(10);
      });

      it("should handle nested objects", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {a: {b: 5}}; obj.a.b")).toBe(5);
      });

      it("should handle computed properties", () => {
         const interp = new TestInterpreter();
         expect(interp.run('var obj = {}; var key = "x"; obj[key] = 5; obj.x')).toBe(5);
      });
   });

   describe("Arrays", () => {
      it("should create and access arrays", () => {
         const interp = new TestInterpreter();
         expect(interp.run("[1, 2, 3][0]")).toBe(1);
         expect(interp.run("[1, 2, 3][2]")).toBe(3);
      });

      it("should modify array elements", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var arr = [1, 2, 3]; arr[1] = 5; arr[1]")).toBe(5);
      });

      it("should handle array methods", () => {
         const interp = new TestInterpreter();
         expect(interp.run("[1, 2, 3].length")).toBe(3);
         expect(interp.run('[1, 2, 3].join(",")')).toBe("1,2,3");
      });
   });

   describe("Functions", () => {
      it("should declare and call functions", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				function add(a, b) {
					return a + b;
				}
				add(2, 3)
			`),
         ).toBe(5);
      });

      it("should handle function expressions", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var add = function(a, b) {
					return a + b;
				};
				add(2, 3)
			`),
         ).toBe(5);
      });

      it("should handle closures", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				function makeCounter() {
					var count = 0;
					return function() {
						return ++count;
					};
				}
				var counter = makeCounter();
				counter(); counter(); counter()
			`),
         ).toBe(3);
      });

      it("should handle recursion", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				function factorial(n) {
					if (n <= 1) return 1;
					return n * factorial(n - 1);
				}
				factorial(5)
			`),
         ).toBe(120);
      });

      it("should handle arguments object", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				function sum() {
					var total = 0;
					for (var i = 0; i < arguments.length; i++) {
						total += arguments[i];
					}
					return total;
				}
				sum(1, 2, 3, 4)
			`),
         ).toBe(10);
      });

      it("should handle this context", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var obj = {
					value: 42,
					getValue: function() {
						return this.value;
					}
				};
				obj.getValue()
			`),
         ).toBe(42);
      });
   });

   describe("Control Flow", () => {
      it("should handle if/else", () => {
         const interp = new TestInterpreter();
         expect(interp.run("if (true) 1; else 2;")).toBe(1);
         expect(interp.run("if (false) 1; else 2;")).toBe(2);
      });

      it("should handle ternary operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("true ? 1 : 2")).toBe(1);
         expect(interp.run("false ? 1 : 2")).toBe(2);
      });

      it("should handle while loops", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var sum = 0;
				var i = 1;
				while (i <= 5) {
					sum += i;
					i++;
				}
				sum
			`),
         ).toBe(15);
      });

      it("should handle do-while loops", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var sum = 0;
				var i = 1;
				do {
					sum += i;
					i++;
				} while (i <= 5);
				sum
			`),
         ).toBe(15);
      });

      it("should handle for loops", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var sum = 0;
				for (var i = 1; i <= 5; i++) {
					sum += i;
				}
				sum
			`),
         ).toBe(15);
      });

      it("should handle for-in loops", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var obj = {a: 1, b: 2, c: 3};
				var keys = [];
				for (var key in obj) {
					keys.push(key);
				}
				keys.join(',')
			`),
         ).toBe("a,b,c");
      });

      it("should handle break", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var sum = 0;
				for (var i = 1; i <= 10; i++) {
					if (i > 5) break;
					sum += i;
				}
				sum
			`),
         ).toBe(15);
      });

      it("should handle continue", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var sum = 0;
				for (var i = 1; i <= 5; i++) {
					if (i === 3) continue;
					sum += i;
				}
				sum
			`),
         ).toBe(12);
      });

      it("should handle labeled statements", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var result = 0;
				outer: for (var i = 0; i < 3; i++) {
					for (var j = 0; j < 3; j++) {
						if (i === 1 && j === 1) break outer;
						result++;
					}
				}
				result
			`),
         ).toBe(4);
      });

      it("should handle switch statements", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var x = 2;
				var result;
				switch (x) {
					case 1:
						result = 'one';
						break;
					case 2:
						result = 'two';
						break;
					default:
						result = 'other';
				}
				result
			`),
         ).toBe("two");
      });

      it("should handle switch fall-through", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var x = 2;
				var result = '';
				switch (x) {
					case 1:
						result += 'a';
					case 2:
						result += 'b';
					case 3:
						result += 'c';
						break;
					default:
						result += 'd';
				}
				result
			`),
         ).toBe("bc");
      });
   });

   describe("Exception Handling", () => {
      it("should handle try/catch", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var result;
				try {
					throw new Error('test');
				} catch (e) {
					result = e.message;
				}
				result
			`),
         ).toBe("test");
      });

      it("should handle try/finally", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var result = 0;
				try {
					result = 1;
				} finally {
					result = 2;
				}
				result
			`),
         ).toBe(2);
      });

      it("should handle try/catch/finally", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var result = '';
				try {
					result += 'a';
					throw new Error('test');
					result += 'b';
				} catch (e) {
					result += 'c';
				} finally {
					result += 'd';
				}
				result
			`),
         ).toBe("acd");
      });
   });

   describe("Type Operations", () => {
      it("should handle typeof operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("typeof 5")).toBe("number");
         expect(interp.run('typeof "hello"')).toBe("string");
         expect(interp.run("typeof true")).toBe("boolean");
         expect(interp.run("typeof undefined")).toBe("undefined");
         expect(interp.run("typeof {}")).toBe("object");
         expect(interp.run("typeof []")).toBe("object");
         expect(interp.run("typeof null")).toBe("object");
      });

      it("should handle instanceof operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("[] instanceof Array")).toBe(true);
         expect(interp.run("({}) instanceof Object")).toBe(true); // Parentheses to avoid ambiguity
         expect(interp.run("5 instanceof Number")).toBe(false);
      });

      it("should handle in operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run('"x" in {x: 5}')).toBe(true);
         expect(interp.run('"y" in {x: 5}')).toBe(false);
         expect(interp.run("0 in [1, 2, 3]")).toBe(true);
      });

      it("should handle delete operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {x: 5}; delete obj.x; obj.x")).toBe(undefined);
         expect(interp.run('var obj = {x: 5}; delete obj.x; "x" in obj')).toBe(false);
      });

      it("should handle void operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("void 0")).toBe(undefined);
         expect(interp.run("void 5")).toBe(undefined);
      });
   });

   describe("Assignment Operators", () => {
      it("should handle compound assignment", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = 5; x += 3; x")).toBe(8);
         expect(interp.run("var x = 5; x -= 3; x")).toBe(2);
         expect(interp.run("var x = 5; x *= 3; x")).toBe(15);
         expect(interp.run("var x = 6; x /= 3; x")).toBe(2);
         expect(interp.run("var x = 5; x %= 3; x")).toBe(2);
      });

      it("should handle bitwise assignment", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = 5; x &= 3; x")).toBe(1);
         expect(interp.run("var x = 5; x |= 3; x")).toBe(7);
         expect(interp.run("var x = 5; x ^= 3; x")).toBe(6);
         expect(interp.run("var x = 5; x <<= 1; x")).toBe(10);
         expect(interp.run("var x = 5; x >>= 1; x")).toBe(2);
      });
   });

   describe("Comma Operator", () => {
      it("should handle comma operator", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = (1, 2, 3); x")).toBe(3);
         expect(interp.run("var a, b; a = 1, b = 2; b")).toBe(2);
      });
   });

   describe("new Operator", () => {
      it("should handle constructor calls", () => {
         const interp = new TestInterpreter();
         expect(interp.run("new Date(2020, 0, 1).getFullYear()")).toBe(2020);
         expect(interp.run("new Array(1, 2, 3).length")).toBe(3);
      });
   });

   describe("Scope and Hoisting", () => {
      it("should handle function declaration hoisting", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var result = test();
				function test() {
					return 42;
				}
				result
			`),
         ).toBe(42);
      });

      it("should handle nested scopes", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var x = 1;
				function outer() {
					var x = 2;
					function inner() {
						var x = 3;
						return x;
					}
					return inner() + x;
				}
				outer() + x
			`),
         ).toBe(6);
      });
   });

   describe("Callbacks to Native Functions", () => {
      it("should pass interpreted functions to native array methods", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var arr = [1, 2, 3];
				var result = arr.map(function(x) {
					return x * 2;
				});
				result.join(',')
			`),
         ).toBe("2,4,6");
      });

      it("should handle filter", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var arr = [1, 2, 3, 4, 5];
				var result = arr.filter(function(x) {
					return x > 2;
				});
				result.join(',')
			`),
         ).toBe("3,4,5");
      });

      it("should handle reduce", () => {
         const interp = new TestInterpreter();
         expect(
            interp.run(`
				var arr = [1, 2, 3, 4];
				arr.reduce(function(acc, x) {
					return acc + x;
				}, 0)
			`),
         ).toBe(10);
      });
   });

   describe("Security", () => {
      it("should block __proto__ access", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {}; obj.__proto__")).toBe(undefined);
      });

      it("should block constructor access", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {}; obj.constructor")).toBe(undefined);
      });

      it("should block prototype access", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var obj = {}; obj.prototype")).toBe(undefined);
      });

      it("should block Function constructor", () => {
         const interp = new TestInterpreter();
         expect(interp.run("Function")).toBe(undefined);
      });

      it("should re-interpret eval", () => {
         const interp = new TestInterpreter();
         expect(interp.run('eval("2 + 3")')).toBe(5);
      });

      it("should timeout on infinite loops", () => {
         const interp = new TestInterpreter({}, { maxOps: 1000 });
         expect(() => interp.run("while(true) {}")).toThrow("maximum operations exceeded");
      });
   });

   describe("Edge Cases", () => {
      it("should handle empty statements", () => {
         const interp = new TestInterpreter();
         expect(interp.run(";;; 42")).toBe(42);
      });

      it("should handle multiple statements", () => {
         const interp = new TestInterpreter();
         expect(interp.run("var x = 1; var y = 2; x + y")).toBe(3);
      });

      it("should handle empty programs", () => {
         const interp = new TestInterpreter();
         expect(interp.run("")).toBe(undefined);
      });

      it("should handle expression as final statement", () => {
         const interp = new TestInterpreter();
         expect(interp.run("1 + 1")).toBe(2);
      });
   });
});
