import * as Babel from "@babel/standalone";
import type * as t from "@babel/types";

/**
 * Transform modern JavaScript (ES6+) to ES5 AST for interpreter execution
 *
 * This function uses Babel to transform modern JavaScript syntax to ES5,
 * then parses it into an AST. The resulting AST can be executed by the interpreter.
 *
 * @param code - Modern JavaScript code (ES6+, TypeScript, JSX, etc.)
 * @param options - Babel transformation options
 * @returns ES5 AST Program node
 *
 * @example
 * ```typescript
 * import { Interpreter } from '@mariozechner/jailjs';
 * import { transformToES5 } from '@mariozechner/jailjs/transform';
 *
 * const modernCode = `
 *   const double = (x) => x * 2;
 *   const numbers = [1, 2, 3];
 *   numbers.map(double);
 * `;
 *
 * const ast = transformToES5(modernCode);
 * const interpreter = new Interpreter();
 * const result = interpreter.evaluate(ast);
 * console.log(result); // [2, 4, 6]
 * ```
 */
export function transformToES5(
   code: string,
   options: {
      /**
       * Target environments (default: ES5-compatible)
       * Examples: { ie: 11 }, { chrome: 90 }, { node: '14' }
       */
      targets?: Record<string, string | number>;
      /**
       * Enable TypeScript syntax support (requires @babel/preset-typescript)
       */
      typescript?: boolean;
      /**
       * Enable JSX support (requires @babel/preset-react)
       */
      jsx?: boolean;
   } = {},
): t.Program {
   const presets: any[] = [
      [
         "env",
         {
            targets: options.targets || { ie: 11 },
            // Don't add polyfills, just transform syntax
            useBuiltIns: false,
         },
      ],
   ];

   if (options.typescript) {
      presets.push("typescript");
   }

   if (options.jsx) {
      presets.push("react");
   }

   try {
      const result = Babel.transform(code, {
         presets,
         filename: "script.js",
         ast: true,
         code: false,
      });

      if (!result?.ast?.program) {
         throw new Error("Babel transformation failed to produce an AST");
      }

      return result.ast.program as t.Program;
   } catch (error: any) {
      throw new Error(`Failed to transform code: ${error.message}`);
   }
}
