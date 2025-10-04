import type * as t from "@babel/types";

/**
 * Return value for control flow (return, break, continue)
 */
type ControlFlow =
   | { type: "return"; value: any }
   | { type: "break"; label?: string }
   | { type: "continue"; label?: string };

/**
 * Scope for variable storage
 */
interface Scope {
   parent: Scope | null;
   vars: Record<string, any>;
   type: "function" | "block";
}

/**
 * Interpreted function representation
 */
interface InterpretedFunction {
   __interpreted: true;
   params: t.Identifier[];
   body: t.BlockStatement | t.Expression;
   closure: Scope;
   name?: string;
}

/**
 * Complete ES5 JavaScript interpreter with sandboxing support
 */
export interface InterpreterOptions {
   maxOps?: number;
   /**
    * Optional parser function for eval() support.
    * If not provided, eval() will throw an error.
    * Signature: (code: string) => Program AST node
    */
   parse?: (code: string) => t.Program;
}

export class Interpreter {
   private globalScope: Scope;
   private opCount = 0;
   private maxOps: number;
   private parse?: (code: string) => t.Program;

   constructor(globalEnv: Record<string, any> = {}, options: InterpreterOptions = {}) {
      this.maxOps = options.maxOps || Infinity;
      this.parse = options.parse;

      this.globalScope = {
         parent: null,
         vars: {
            // ES5 built-ins
            console,
            Math,
            JSON,

            // Constructors (note: prototypes can be polluted - no protection)
            Date,
            RegExp,
            Array,
            Object,
            String,
            Number,
            Boolean,
            undefined: undefined,

            // Error types
            Error,
            TypeError,
            ReferenceError,
            SyntaxError,
            RangeError,
            EvalError,
            URIError,

            // Global functions
            parseInt,
            parseFloat,
            isNaN,
            isFinite,
            encodeURI,
            encodeURIComponent,
            decodeURI,
            decodeURIComponent,

            // ES6+ features needed for transformed code
            Symbol: typeof Symbol !== "undefined" ? Symbol : undefined,
            Promise: typeof Promise !== "undefined" ? Promise : undefined,

            // Block dangerous functions or re-interpret
            Function: undefined,
            eval: (code: string) => {
               if (!this.parse) {
                  throw new Error(
                     "eval() is not supported without a parser. Pass parse option to Interpreter constructor.",
                  );
               }
               return this.evaluate(this.parse(code));
            },

            // User-provided globals (override defaults)
            ...globalEnv,
         },
         type: "function",
      };
   }

   /**
    * Evaluate a pre-parsed AST
    */
   evaluate(ast: t.Program): any {
      this.opCount = 0;

      // Hoist function declarations and var declarations
      this.hoistDeclarations(ast.body, this.globalScope);

      return this.evalNode(ast, this.globalScope);
   }

   /**
    * Hoist function and var declarations to the top of their scope
    */
   private hoistDeclarations(statements: t.Statement[], scope: Scope): void {
      // First pass: hoist var declarations and function names
      for (const stmt of statements) {
         if (stmt.type === "FunctionDeclaration" && stmt.id) {
            // Hoist function declaration - create the function immediately
            scope.vars[stmt.id.name] = this.createFunction(stmt, scope);
         } else if (stmt.type === "VariableDeclaration" && stmt.kind === "var") {
            // Hoist var declarations (initialized to undefined)
            for (const decl of stmt.declarations) {
               if (decl.id.type === "Identifier") {
                  scope.vars[decl.id.name] = undefined;
               }
            }
         }
      }
   }

   /**
    * Create a new scope
    */
   private createScope(parent: Scope | null, type: "function" | "block" = "block"): Scope {
      return { parent, vars: {}, type };
   }

   /**
    * Get variable from scope chain
    */
   private getVar(scope: Scope | null, name: string): any {
      if (!scope) {
         throw new ReferenceError(`${name} is not defined`);
      }

      if (name in scope.vars) {
         return scope.vars[name];
      }

      if (scope.parent) {
         return this.getVar(scope.parent, name);
      }

      throw new ReferenceError(`${name} is not defined`);
   }

   /**
    * Set variable in scope chain
    */
   private setVar(scope: Scope | null, name: string, value: any): void {
      if (!scope) {
         throw new ReferenceError(`${name} is not defined`);
      }

      if (name in scope.vars) {
         scope.vars[name] = value;
         return;
      }

      if (scope.parent) {
         this.setVar(scope.parent, name, value);
         return;
      }

      // In non-strict mode, assignment to undefined variable creates a global
      // Since we hoisted all vars, if it's not found, it means we're setting
      // a hoisted var that exists in the scope (edge case for hoisting)
      scope.vars[name] = value;
   }

   /**
    * Declare variable with var semantics (function-scoped hoisting)
    */
   private declareVar(scope: Scope, name: string, value: any): void {
      // var is function-scoped, not block-scoped
      let targetScope = scope;
      while (targetScope.parent && targetScope.type === "block") {
         targetScope = targetScope.parent;
      }
      targetScope.vars[name] = value;
   }

   /**
    * Declare let/const variable (block-scoped)
    */
   private declareLet(scope: Scope, name: string, value: any): void {
      scope.vars[name] = value;
   }

   /**
    * Check operation count to prevent infinite loops
    */
   private checkOps(): void {
      if (++this.opCount > this.maxOps) {
         throw new Error("Execution timeout: maximum operations exceeded");
      }
   }

   /**
    * Main evaluation function - handles all AST node types
    */
   private evalNode(node: t.Node | null | undefined, scope: Scope): any {
      if (!node) return undefined;

      this.checkOps();

      switch (node.type) {
         // Program and statements
         case "Program": {
            let result: any;
            // Handle directives (e.g., "use strict", or top-level string literals)
            if (node.directives && node.directives.length > 0) {
               result = node.directives[node.directives.length - 1].value.value;
            }
            for (const stmt of node.body) {
               result = this.evalNode(stmt, scope);
            }
            return result;
         }

         case "ExpressionStatement":
            return this.evalNode(node.expression, scope);

         case "DirectiveLiteral":
            return node.value;

         case "BlockStatement": {
            const blockScope = this.createScope(scope, "block");
            let result: any;
            for (const stmt of node.body) {
               result = this.evalNode(stmt, blockScope);
            }
            return result;
         }

         case "EmptyStatement":
            return undefined;

         // Variable declarations
         case "VariableDeclaration": {
            for (const decl of node.declarations) {
               if (decl.id.type === "Identifier") {
                  if (node.kind === "var") {
                     // For var, only set the value if there's an initializer
                     // The variable is already hoisted
                     if (decl.init) {
                        const value = this.evalNode(decl.init, scope);
                        this.declareVar(scope, decl.id.name, value);
                     }
                     // If no init, the hoisted value (undefined or previously set) remains
                  } else {
                     // let/const always set the value
                     const value = decl.init ? this.evalNode(decl.init, scope) : undefined;
                     this.declareLet(scope, decl.id.name, value);
                  }
               } else {
                  // Destructuring (if transpiled, Babel should have converted it)
                  throw new Error("Destructuring not supported - use Babel to transpile to ES5");
               }
            }
            return undefined;
         }

         // Literals
         case "StringLiteral":
         case "NumericLiteral":
         case "BooleanLiteral":
            return node.value;

         case "NullLiteral":
            return null;

         case "RegExpLiteral":
            return new RegExp(node.pattern, node.flags);

         // Identifiers
         case "Identifier":
            return this.getVar(scope, node.name);

         case "ThisExpression":
            return this.getVar(scope, "this");

         // Expressions
         case "BinaryExpression": {
            const left = this.evalNode(node.left, scope);
            const right = this.evalNode(node.right, scope);

            switch (node.operator) {
               case "+":
                  return left + right;
               case "-":
                  return left - right;
               case "*":
                  return left * right;
               case "/":
                  return left / right;
               case "%":
                  return left % right;
               case "**":
                  return left ** right;
               case "==":
                  return left === right;
               case "!=":
                  return left !== right;
               case "===":
                  return left === right;
               case "!==":
                  return left !== right;
               case "<":
                  return left < right;
               case ">":
                  return left > right;
               case "<=":
                  return left <= right;
               case ">=":
                  return left >= right;
               case "<<":
                  return left << right;
               case ">>":
                  return left >> right;
               case ">>>":
                  return left >>> right;
               case "&":
                  return left & right;
               case "|":
                  return left | right;
               case "^":
                  return left ^ right;
               case "in":
                  return left in right;
               case "instanceof": {
                  // Handle instanceof for both native and interpreted functions
                  if ((right as any).__interpreted) {
                     // Right side is an interpreted function - check prototype chain
                     const proto = (right as any).prototype;
                     if (!proto) return false;

                     let obj = left;
                     while (obj != null) {
                        if (obj === proto) return true;
                        obj = Object.getPrototypeOf(obj);
                     }
                     return false;
                  }
                  // Native instanceof
                  return left instanceof right;
               }
               default:
                  throw new Error(`Unknown binary operator: ${node.operator}`);
            }
         }

         case "LogicalExpression": {
            const left = this.evalNode(node.left, scope);
            if (node.operator === "&&") {
               return left ? this.evalNode(node.right, scope) : left;
            }
            if (node.operator === "||") {
               return left ? left : this.evalNode(node.right, scope);
            }
            throw new Error(`Unknown logical operator: ${node.operator}`);
         }

         case "UnaryExpression": {
            if (node.operator === "delete") {
               if (node.argument.type === "MemberExpression") {
                  const obj = this.evalNode(node.argument.object, scope);
                  const prop = node.argument.computed
                     ? this.evalNode(node.argument.property, scope)
                     : (node.argument.property as t.Identifier).name;
                  return delete obj[prop];
               }
               return true;
            }

            const arg = this.evalNode(node.argument, scope);
            switch (node.operator) {
               case "!":
                  return !arg;
               case "-":
                  return -arg;
               case "+":
                  return +arg;
               case "~":
                  return ~arg;
               case "typeof":
                  // Handle interpreted functions
                  if (arg && (arg as any).__interpreted) {
                     return "function";
                  }
                  return typeof arg;
               case "void":
                  return undefined;
               default:
                  throw new Error(`Unknown unary operator: ${node.operator}`);
            }
         }

         case "UpdateExpression": {
            const argNode = node.argument;
            let obj: any;
            let prop: any;

            if (argNode.type === "Identifier") {
               const oldValue = this.getVar(scope, argNode.name);
               const newValue = node.operator === "++" ? oldValue + 1 : oldValue - 1;
               this.setVar(scope, argNode.name, newValue);
               return node.prefix ? newValue : oldValue;
            }

            if (argNode.type === "MemberExpression") {
               obj = this.evalNode(argNode.object, scope);
               prop = argNode.computed
                  ? this.evalNode(argNode.property, scope)
                  : (argNode.property as t.Identifier).name;
               const oldValue = obj[prop];
               const newValue = node.operator === "++" ? oldValue + 1 : oldValue - 1;
               obj[prop] = newValue;
               return node.prefix ? newValue : oldValue;
            }

            throw new Error("Invalid update expression target");
         }

         case "AssignmentExpression": {
            const value = this.evalNode(node.right, scope);

            if (node.left.type === "Identifier") {
               if (node.operator === "=") {
                  this.setVar(scope, node.left.name, value);
               } else {
                  const oldValue = this.getVar(scope, node.left.name);
                  const newValue = this.applyAssignmentOperator(oldValue, value, node.operator);
                  this.setVar(scope, node.left.name, newValue);
               }
               return value;
            }

            if (node.left.type === "MemberExpression") {
               const obj = this.evalNode(node.left.object, scope);
               const prop = node.left.computed
                  ? this.evalNode(node.left.property, scope)
                  : (node.left.property as t.Identifier).name;

               if (node.operator === "=") {
                  // Store value directly (interpreted functions will be handled by CallExpression)
                  obj[prop] = value;
               } else {
                  const oldValue = obj[prop];
                  obj[prop] = this.applyAssignmentOperator(oldValue, value, node.operator);
               }
               return value;
            }

            throw new Error("Invalid assignment target");
         }

         case "SequenceExpression": {
            let result: any;
            for (const expr of node.expressions) {
               result = this.evalNode(expr, scope);
            }
            return result;
         }

         case "ConditionalExpression": {
            const test = this.evalNode(node.test, scope);
            return test ? this.evalNode(node.consequent, scope) : this.evalNode(node.alternate, scope);
         }

         // Member access
         case "MemberExpression": {
            const obj = this.evalNode(node.object, scope);
            const prop = node.computed ? this.evalNode(node.property, scope) : (node.property as t.Identifier).name;

            // Block prototype pollution via __proto__
            if (prop === "__proto__") {
               return undefined;
            }

            // Block modification of built-in constructors (but allow user functions)
            if (prop === "constructor" && obj !== null && obj !== undefined) {
               const isBuiltIn = [Object, Array, String, Number, Boolean, Function, RegExp, Date, Error].includes(
                  obj.constructor,
               );
               if (isBuiltIn) {
                  return undefined;
               }
            }

            return obj[prop];
         }

         // Function calls
         case "CallExpression": {
            const callee = this.evalNode(node.callee, scope);
            const args = node.arguments.map((arg) => this.evalNode(arg, scope));

            // Determine 'this' context
            let thisContext: any;
            if (node.callee.type === "MemberExpression") {
               thisContext = this.evalNode(node.callee.object, scope);
            }

            // Native function
            if (typeof callee === "function" && !(callee as any).__interpreted) {
               // Wrap interpreted function arguments for callbacks
               const wrappedArgs = args.map((arg) => {
                  if (arg && (arg as any).__interpreted) {
                     return (...callArgs: any[]) => this.callFunction(arg, callArgs, scope);
                  }
                  return arg;
               });
               return thisContext !== undefined ? callee.call(thisContext, ...wrappedArgs) : callee(...wrappedArgs);
            }

            // Interpreted function
            return this.callFunction(callee, args, scope, thisContext);
         }

         case "NewExpression": {
            const constructorFunc = this.evalNode(node.callee, scope);
            const args = node.arguments.map((arg) => this.evalNode(arg, scope));

            // Handle interpreted functions used as constructors
            if (constructorFunc && (constructorFunc as any).__interpreted) {
               // Create new instance with prototype chain
               const instance = Object.create((constructorFunc as any).prototype || {});
               // Call constructor with instance as 'this'
               const result = this.callFunction(constructorFunc, args, scope, instance);
               // If constructor returns an object, use that; otherwise use instance
               return result !== undefined && typeof result === "object" ? result : instance;
            }

            // Native constructor - wrap interpreted function arguments
            const wrappedArgs = args.map((arg) => {
               if (arg && (arg as any).__interpreted) {
                  return (...callArgs: any[]) => this.callFunction(arg, callArgs, scope);
               }
               return arg;
            });
            return new constructorFunc(...wrappedArgs);
         }

         // Object and array literals
         case "ObjectExpression": {
            const obj: any = {};
            for (const prop of node.properties) {
               if (prop.type === "ObjectProperty") {
                  const key =
                     prop.key.type === "Identifier" && !prop.computed ? prop.key.name : this.evalNode(prop.key, scope);
                  obj[key] = this.evalNode(prop.value, scope);
               } else if (prop.type === "SpreadElement") {
                  const spreadObj = this.evalNode(prop.argument, scope);
                  Object.assign(obj, spreadObj);
               } else if (prop.type === "ObjectMethod") {
                  const key =
                     prop.key.type === "Identifier" && !prop.computed ? prop.key.name : this.evalNode(prop.key, scope);
                  obj[key] = this.createFunction(prop, scope);
               }
            }
            return obj;
         }

         case "ArrayExpression": {
            return node.elements.map((el) => (el ? this.evalNode(el, scope) : undefined));
         }

         case "SpreadElement": {
            throw new Error("SpreadElement should be handled by parent node");
         }

         // Functions
         case "FunctionDeclaration": {
            // Function is already hoisted, nothing to do here
            return undefined;
         }

         case "FunctionExpression":
         case "ArrowFunctionExpression": {
            return this.createFunction(node, scope);
         }

         // Control flow
         case "IfStatement": {
            const test = this.evalNode(node.test, scope);
            if (test) {
               return this.evalNode(node.consequent, scope);
            }
            if (node.alternate) {
               return this.evalNode(node.alternate, scope);
            }
            return undefined;
         }

         case "SwitchStatement": {
            const discriminant = this.evalNode(node.discriminant, scope);
            const switchScope = this.createScope(scope, "block");
            let matched = false;
            let result: any;

            for (const cas of node.cases) {
               if (!matched && cas.test) {
                  const testValue = this.evalNode(cas.test, switchScope);
                  matched = discriminant === testValue;
               } else if (!matched && !cas.test) {
                  // Default case
                  matched = true;
               }

               if (matched) {
                  try {
                     for (const stmt of cas.consequent) {
                        result = this.evalNode(stmt, switchScope);
                     }
                  } catch (e) {
                     if (typeof e === "object" && e !== null && (e as ControlFlow).type === "break") {
                        if (!(e as ControlFlow & { label?: string }).label) {
                           break;
                        }
                     }
                     throw e;
                  }
               }
            }

            return result;
         }

         case "SwitchCase": {
            // SwitchCase is never evaluated directly; it's handled by SwitchStatement
            throw new Error("SwitchCase should be handled by SwitchStatement");
         }

         case "WhileStatement": {
            let result: any;
            while (this.evalNode(node.test, scope)) {
               try {
                  result = this.evalNode(node.body, scope);
               } catch (e) {
                  if (typeof e === "object" && e !== null) {
                     if ((e as ControlFlow).type === "break") {
                        if (!(e as ControlFlow & { label?: string }).label) break;
                     } else if ((e as ControlFlow).type === "continue") {
                        if (!(e as ControlFlow & { label?: string }).label) continue;
                     }
                  }
                  throw e;
               }
            }
            return result;
         }

         case "DoWhileStatement": {
            let result: any;
            do {
               try {
                  result = this.evalNode(node.body, scope);
               } catch (e) {
                  if (typeof e === "object" && e !== null) {
                     if ((e as ControlFlow).type === "break") {
                        if (!(e as ControlFlow & { label?: string }).label) break;
                     } else if ((e as ControlFlow).type === "continue") {
                        if (!(e as ControlFlow & { label?: string }).label) continue;
                     }
                  }
                  throw e;
               }
            } while (this.evalNode(node.test, scope));
            return result;
         }

         case "ForStatement": {
            const forScope = this.createScope(scope, "block");
            if (node.init) this.evalNode(node.init, forScope);

            let result: any;
            while (!node.test || this.evalNode(node.test, forScope)) {
               try {
                  result = this.evalNode(node.body, forScope);
               } catch (e) {
                  if (typeof e === "object" && e !== null) {
                     if ((e as ControlFlow).type === "break") {
                        if (!(e as ControlFlow & { label?: string }).label) break;
                     } else if ((e as ControlFlow).type === "continue") {
                        if (!(e as ControlFlow & { label?: string }).label) {
                           if (node.update) this.evalNode(node.update, forScope);
                           continue;
                        }
                     }
                  }
                  throw e;
               }
               if (node.update) this.evalNode(node.update, forScope);
            }
            return result;
         }

         case "ForInStatement": {
            const forScope = this.createScope(scope, "block");
            const obj = this.evalNode(node.right, forScope);
            let result: any;

            for (const key in obj) {
               // Declare loop variable
               if (node.left.type === "VariableDeclaration") {
                  const decl = node.left.declarations[0];
                  if (decl.id.type === "Identifier") {
                     if (node.left.kind === "var") {
                        this.declareVar(forScope, decl.id.name, key);
                     } else {
                        this.declareLet(forScope, decl.id.name, key);
                     }
                  }
               } else if (node.left.type === "Identifier") {
                  this.setVar(forScope, node.left.name, key);
               }

               try {
                  result = this.evalNode(node.body, forScope);
               } catch (e) {
                  if (typeof e === "object" && e !== null) {
                     if ((e as ControlFlow).type === "break") {
                        if (!(e as ControlFlow & { label?: string }).label) break;
                     } else if ((e as ControlFlow).type === "continue") {
                        if (!(e as ControlFlow & { label?: string }).label) continue;
                     }
                  }
                  throw e;
               }
            }
            return result;
         }

         case "BreakStatement": {
            throw { type: "break", label: node.label?.name } as ControlFlow;
         }

         case "ContinueStatement": {
            throw { type: "continue", label: node.label?.name } as ControlFlow;
         }

         case "ReturnStatement": {
            throw {
               type: "return",
               value: node.argument ? this.evalNode(node.argument, scope) : undefined,
            } as ControlFlow;
         }

         case "LabeledStatement": {
            try {
               return this.evalNode(node.body, scope);
            } catch (e) {
               if (typeof e === "object" && e !== null) {
                  const cf = e as ControlFlow & { label?: string };
                  if ((cf.type === "break" || cf.type === "continue") && cf.label === node.label.name) {
                     if (cf.type === "break") return undefined;
                     // For continue with label, re-throw without label
                     throw { type: "continue" } as ControlFlow;
                  }
               }
               throw e;
            }
         }

         // Exception handling
         case "ThrowStatement": {
            const error = this.evalNode(node.argument, scope);
            throw error;
         }

         case "TryStatement": {
            let result: any;
            let caughtError: any = null;

            try {
               result = this.evalNode(node.block, scope);
            } catch (error) {
               // Control flow statements (break/continue/return) should not be caught by user code
               // Re-throw them immediately without executing the catch handler
               if (
                  typeof error === "object" &&
                  error !== null &&
                  ((error as ControlFlow).type === "break" ||
                     (error as ControlFlow).type === "continue" ||
                     (error as ControlFlow).type === "return")
               ) {
                  throw error;
               }

               caughtError = error;

               if (node.handler) {
                  const catchScope = this.createScope(scope, "block");
                  if (node.handler.param && node.handler.param.type === "Identifier") {
                     catchScope.vars[node.handler.param.name] = error;
                  }
                  try {
                     result = this.evalNode(node.handler.body, catchScope);
                     caughtError = null;
                  } catch (catchError) {
                     caughtError = catchError;
                  }
               }
            } finally {
               if (node.finalizer) {
                  this.evalNode(node.finalizer, scope);
               }

               if (caughtError !== null) {
                  // biome-ignore lint/correctness/noUnsafeFinally: valid here
                  throw caughtError;
               }
            }

            return result;
         }

         // With statement (deprecated but part of ES5)
         case "WithStatement": {
            throw new Error("with statement is not supported");
         }

         // Directives (e.g., "use strict")
         case "Directive":
            return undefined;

         default:
            throw new Error(`Unhandled node type: ${node.type}`);
      }
   }

   /**
    * Apply compound assignment operators
    */
   private applyAssignmentOperator(left: any, right: any, operator: string): any {
      switch (operator) {
         case "+=":
            return left + right;
         case "-=":
            return left - right;
         case "*=":
            return left * right;
         case "/=":
            return left / right;
         case "%=":
            return left % right;
         case "<<=":
            return left << right;
         case ">>=":
            return left >> right;
         case ">>>=":
            return left >>> right;
         case "&=":
            return left & right;
         case "|=":
            return left | right;
         case "^=":
            return left ^ right;
         default:
            throw new Error(`Unknown assignment operator: ${operator}`);
      }
   }

   /**
    * Create an interpreted function
    */
   private createFunction(
      node: t.FunctionDeclaration | t.FunctionExpression | t.ArrowFunctionExpression | t.ObjectMethod,
      closureScope: Scope,
   ): InterpretedFunction {
      const func: any = {
         __interpreted: true,
         params: node.params.filter((p): p is t.Identifier => p.type === "Identifier"),
         body: node.body,
         closure: closureScope,
         name: "id" in node && node.id ? node.id.name : undefined,
      };

      // Add prototype property for regular functions (not arrow functions)
      if (node.type !== "ArrowFunctionExpression") {
         func.prototype = {};
      }

      // Add Function.prototype methods: call, apply, bind
      func.call = (thisArg: any, ...args: any[]) => {
         return this.callFunction(func, args, closureScope, thisArg);
      };

      func.apply = (thisArg: any, args: any[] = []) => {
         return this.callFunction(func, args, closureScope, thisArg);
      };

      func.bind = (thisArg: any, ...boundArgs: any[]) => {
         const boundFunc: any = {
            __interpreted: true,
            params: func.params,
            body: func.body,
            closure: closureScope,
            name: func.name,
            __boundThis: thisArg, // Store bound this
            __boundArgs: boundArgs, // Store bound arguments
            __originalFunc: func, // Store original function
         };

         // Bound functions also need call/apply/bind
         boundFunc.call = (_: any, ...args: any[]) => {
            return this.callFunction(func, [...boundArgs, ...args], closureScope, thisArg);
         };
         boundFunc.apply = (_: any, args: any[] = []) => {
            return this.callFunction(func, [...boundArgs, ...args], closureScope, thisArg);
         };
         boundFunc.bind = (newThisArg: any, ...newBoundArgs: any[]) => {
            // Bind to the already-bound thisArg, ignore newThisArg
            return func.bind(thisArg, ...boundArgs, ...newBoundArgs);
         };

         return boundFunc;
      };

      return func;
   }

   /**
    * Call an interpreted function
    */
   private callFunction(func: any, args: any[], _callerScope: Scope, thisContext?: any): any {
      if (!func || !func.__interpreted) {
         throw new TypeError("Value is not a function");
      }

      // Handle bound functions
      if (func.__boundThis !== undefined) {
         // Use bound this and prepend bound arguments
         thisContext = func.__boundThis;
         args = [...(func.__boundArgs || []), ...args];
         func = func.__originalFunc || func;
      }

      const funcScope = this.createScope(func.closure, "function");

      // Bind function name for named function expressions
      // ES5 spec: "The Identifier in a FunctionExpression can be referenced from
      // inside the FunctionExpression's FunctionBody"
      if (func.name) {
         funcScope.vars[func.name] = func;
      }

      // Hoist declarations in function body
      if (func.body.type === "BlockStatement") {
         this.hoistDeclarations(func.body.body, funcScope);
      }

      // Bind parameters
      for (let i = 0; i < func.params.length; i++) {
         funcScope.vars[func.params[i].name] = args[i];
      }

      // Add 'arguments' object
      funcScope.vars.arguments = args;

      // Add 'this' binding
      funcScope.vars.this = thisContext;

      try {
         if (func.body.type === "BlockStatement") {
            this.evalNode(func.body, funcScope);
            return undefined;
         }
         // Arrow function with expression body
         return this.evalNode(func.body, funcScope);
      } catch (e) {
         if (typeof e === "object" && e !== null && (e as ControlFlow).type === "return") {
            return (e as ControlFlow & { value: any }).value;
         }
         throw e;
      }
   }
}
