import { parse as babelParse } from "@babel/parser";
import type * as t from "@babel/types";

/**
 * Parse JavaScript code into an AST
 *
 * This is a thin wrapper around @babel/parser that configures it
 * for ES5 script parsing. Users can import this to parse code,
 * or use their own parser and pass the AST to the interpreter.
 *
 * @param code - JavaScript code to parse
 * @returns Babel AST Program node
 */
export function parse(code: string): t.Program {
   try {
      const ast = babelParse(code, {
         sourceType: "script",
         plugins: [],
      });
      return ast.program;
   } catch (parseError: any) {
      throw new Error(`Parse error: ${parseError.message}`);
   }
}
