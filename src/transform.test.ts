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

   it("should support async/await!", async () => {
      const code = `
			async function test() {
				const x = await Promise.resolve(42);
				return x;
			}
			test();
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();

      const result = interpreter.evaluate(ast);
      expect(result).toBeInstanceOf(Promise);

      const value = await result;
      expect(value).toBe(42);
   });

   it("should handle for...of with array-like objects (NodeList)", () => {
      const code = `
			const arrayLike = { 0: 'a', 1: 'b', 2: 'c', length: 3 };
			const items = Array.from(arrayLike);
			const result = [];
			for (const item of items) {
				result.push(item);
			}
			result.join(',');
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter();
      const result = interpreter.evaluate(ast);
      expect(result).toBe("a,b,c");
   });

   it("should handle for...of with NodeList-like objects directly", () => {
      // Simulate NodeList-like object (plain object with numeric keys and length)
      const mockNodeList = {
         0: { href: "link1" },
         1: { href: "link2" },
         2: { href: "link3" },
         length: 3,
      };

      // Should work directly without Array.from()
      const code = `
			const result = [];
			for (const link of links) {
				result.push(link.href);
			}
			result.join(',');
		`;
      const ast = transformToES5(code);
      const interpreter = new Interpreter({ links: mockNodeList });
      const result = interpreter.evaluate(ast);
      expect(result).toBe("link1,link2,link3");
   });
});
