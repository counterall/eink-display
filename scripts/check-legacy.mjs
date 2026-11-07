// Fails the build if a legacy chunk contains syntax that Safari 9 / Chrome 49
// cannot parse. Generic "ES5 only" checkers are too strict here: Safari 9
// supports template literals, computed keys, shorthand properties and for-of,
// and @vitejs/plugin-legacy correctly leaves those in place.
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'acorn';
import { full } from 'acorn-walk';

const LOGICAL_ASSIGNMENT = new Set(['??=', '||=', '&&=']);

function issue(node) {
  switch (node.type) {
    case 'ArrowFunctionExpression': return 'arrow function';
    case 'ClassDeclaration': case 'ClassExpression': return 'class';
    case 'PropertyDefinition': case 'PrivateIdentifier': case 'StaticBlock': return 'class field';
    case 'VariableDeclaration': return node.kind === 'var' ? null : `${node.kind} declaration`;
    case 'AssignmentPattern': return 'default parameter / destructuring default';
    case 'RestElement': return 'rest element';
    case 'ObjectPattern': case 'ArrayPattern': return 'destructuring';
    case 'FunctionDeclaration': case 'FunctionExpression':
      return node.async ? 'async function' : node.generator ? 'generator' : null;
    case 'AwaitExpression': return 'await';
    case 'YieldExpression': return 'yield';
    case 'ChainExpression': return 'optional chaining';
    case 'LogicalExpression': return node.operator === '??' ? 'nullish coalescing' : null;
    case 'AssignmentExpression':
      if (LOGICAL_ASSIGNMENT.has(node.operator)) return 'logical assignment';
      return node.operator === '**=' ? 'exponent operator' : null;
    case 'BinaryExpression': return node.operator === '**' ? 'exponent operator' : null;
    case 'ObjectExpression': return node.properties.some((p) => p.type === 'SpreadElement') ? 'object spread' : null;
    case 'MetaProperty': return 'new.target / import.meta';
    case 'ImportExpression': return 'dynamic import()';
    case 'CatchClause': return node.param ? null : 'optional catch binding';
    case 'ForOfStatement': return node.await ? 'for await' : null;
    case 'Literal':
      if (node.bigint) return 'BigInt literal';
      if (node.regex && /[suyd]/.test(node.regex.flags)) return `regex flag /${node.regex.flags}`;
      return null;
    default: return null;
  }
}

export function findLegacyIssues(source) {
  const issues = [];
  // A newer ecmaVersion lets acorn parse modern syntax so it can be reported
  // with a location, rather than failing on the first unknown token.
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true });
  full(ast, (node) => {
    const problem = issue(node);
    if (problem) issues.push({ problem, line: node.loc.start.line, column: node.loc.start.column });
  });
  return issues;
}

export async function checkLegacyDirectory(directory) {
  const files = (await readdir(directory)).filter((name) => /-legacy-[\w-]+\.js$/.test(name));
  if (!files.length) throw new Error(`No legacy chunks found in ${directory}; run pnpm build first.`);
  const report = [];
  for (const name of files) {
    for (const found of findLegacyIssues(await readFile(join(directory, name), 'utf8'))) report.push({ file: name, ...found });
  }
  return { files, report };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directory = fileURLToPath(new URL('../dist/assets', import.meta.url));
  try {
    const { files, report } = await checkLegacyDirectory(directory);
    if (report.length) {
      for (const item of report.slice(0, 20)) console.error(`${item.file}:${item.line}:${item.column} ${item.problem}`);
      console.error(`${report.length} syntax feature(s) unsupported by Safari 9 / Chrome 49 found in legacy chunks.`);
      process.exitCode = 1;
    } else console.log(`Legacy syntax check passed for ${files.length} chunk(s).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
