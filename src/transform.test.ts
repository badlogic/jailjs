import { describe, expect, it } from "vitest";
import { Interpreter } from "./interpreter";
import { transformToES5 } from "./transform";

describe("ES6+ Transformation", () => {
   it("should transform arrow functions to ES5", () => {
      const code = `
			const double = (x) => x * 2;
			[1, 2, 3].map(double);
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toEqual([2, 4, 6]);
   });

   it("should transform classes to ES5", () => {
      const code = `
			class Calculator {
				constructor(initial = 0) {
					this.value = initial;
				}
				add(n) {
					this.value += n;
					return this.value;
				}
			}
			const calc = new Calculator(10);
			calc.add(5);
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(15);
   });

   it("should transform destructuring to ES5", () => {
      const code = `
			const [a, b, c] = [1, 2, 3];
			a + b + c;
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(6);
   });

   it("should transform spread operator to ES5", () => {
      const code = `
			function sum(...numbers) {
				return numbers.reduce(function(a, b) { return a + b; }, 0);
			}
			sum(1, 2, 3, 4);
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(10);
   });

   it("should transform default parameters to ES5", () => {
      const code = `
			function greet(name = 'World') {
				return 'Hello, ' + name;
			}
			greet();
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe("Hello, World");
   });

   it("should handle complex class with methods", () => {
      const code = `
			class Counter {
				constructor() {
					this.count = 0;
				}
				increment() {
					return ++this.count;
				}
				decrement() {
					return --this.count;
				}
			}
			const c = new Counter();
			c.increment();
			c.increment();
			c.decrement();
			c.count;
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe(1);
   });

   it("should NOT support async/await (documented limitation)", () => {
      const code = `
			async function test() {
				return 42;
			}
			test();
		`;
      // Transformation succeeds but creates complex regenerator code
      const ast = transformToES5(code);
      const interpreter = new Interpreter();

      // Execution will fail because regenerator-runtime uses Object.defineProperty
      expect(() => interpreter.evaluate(ast)).toThrow();
   });
});
