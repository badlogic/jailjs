// Check ES5 AST node coverage
const fs = require('fs');
const path = require('path');

// Read our interpreter source
const interpreterSource = fs.readFileSync(
  path.join(__dirname, '../src/interpreter.ts'),
  'utf-8'
);

// Extract all case statements from our switch
const caseMatches = interpreterSource.matchAll(/case '([^']+)':/g);
const handledNodes = new Set();
for (const match of caseMatches) {
  handledNodes.add(match[1]);
}

console.log('=== Nodes Handled by Interpreter ===');
console.log('Total:', handledNodes.size);
console.log(Array.from(handledNodes).sort().join('\n'));
console.log('\n');

// ES5 nodes that should be handled
// Based on: https://github.com/estree/estree/blob/master/es5.md
const es5Nodes = {
  // Programs and Statements
  'Program': true,
  'ExpressionStatement': true,
  'BlockStatement': true,
  'EmptyStatement': true,
  'DebuggerStatement': false, // Optional, not critical

  // Declarations
  'FunctionDeclaration': true,
  'VariableDeclaration': true,

  // Control Flow
  'ReturnStatement': true,
  'LabeledStatement': true,
  'BreakStatement': true,
  'ContinueStatement': true,
  'IfStatement': true,
  'SwitchStatement': true,
  'SwitchCase': true,
  'ThrowStatement': true,
  'TryStatement': true,
  'CatchClause': false, // Handled via TryStatement
  'WhileStatement': true,
  'DoWhileStatement': true,
  'ForStatement': true,
  'ForInStatement': true,
  'WithStatement': false, // Explicitly not supported (deprecated)

  // Expressions
  'ThisExpression': true,
  'ArrayExpression': true,
  'ObjectExpression': true,
  'ObjectProperty': false, // Handled in ObjectExpression
  'FunctionExpression': true,
  'UnaryExpression': true,
  'UpdateExpression': true,
  'BinaryExpression': true,
  'AssignmentExpression': true,
  'LogicalExpression': true,
  'MemberExpression': true,
  'ConditionalExpression': true,
  'CallExpression': true,
  'NewExpression': true,
  'SequenceExpression': true,

  // Patterns (ES5 only has Identifier)
  'Identifier': true,

  // Literals
  'StringLiteral': true,
  'NumericLiteral': true,
  'BooleanLiteral': true,
  'NullLiteral': true,
  'RegExpLiteral': true,

  // Babel-specific
  'Directive': true,
  'DirectiveLiteral': true,
  'SpreadElement': false, // ES6 but we support in objects
  'ObjectMethod': false, // Handled in ObjectExpression
  'ArrowFunctionExpression': false, // ES6 but we support
};

console.log('=== ES5 Coverage Analysis ===\n');

const required = Object.entries(es5Nodes).filter(([_, req]) => req).map(([name]) => name);
const missing = required.filter(node => !handledNodes.has(node));
const extra = Array.from(handledNodes).filter(node => !es5Nodes[node]);

console.log('Required ES5 nodes:', required.length);
console.log('Handled:', required.filter(n => handledNodes.has(n)).length);
console.log('\nMissing ES5 nodes:');
if (missing.length === 0) {
  console.log('  ✅ None! All required ES5 nodes are handled.');
} else {
  missing.forEach(node => console.log('  ❌', node));
}

console.log('\nExtra nodes (ES6+ or optional):');
if (extra.length > 0) {
  extra.forEach(node => console.log('  ℹ️ ', node));
}

console.log('\n=== Test Coverage Recommendations ===\n');

// Check which nodes we handle but might not test
const possiblyUntested = [
  'DebuggerStatement',
  'WithStatement',
  'SwitchCase'
];

console.log('Consider adding tests for:');
possiblyUntested.forEach(node => {
  if (handledNodes.has(node)) {
    console.log('  •', node);
  }
});

// Summary
console.log('\n=== Summary ===');
console.log(`Total nodes handled: ${handledNodes.size}`);
console.log(`Required ES5 nodes: ${required.length}`);
console.log(`Coverage: ${Math.round(required.filter(n => handledNodes.has(n)).length / required.length * 100)}%`);
if (missing.length === 0) {
  console.log('✅ Full ES5 coverage achieved!');
} else {
  console.log(`❌ Missing ${missing.length} required node(s)`);
}
