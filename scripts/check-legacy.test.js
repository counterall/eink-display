import { describe, expect, it } from 'vitest';
import { findLegacyIssues } from './check-legacy.mjs';

const problems = (source) => findLegacyIssues(source).map((item) => item.problem);

describe('legacy syntax check', () => {
  it('accepts ES2015 syntax that Safari 9 supports', () => {
    expect(problems('var a = `x${1}`, b = { [a]: 1, a }; for (var v of [1]) {} function f() { return [].concat([1]); }')).toEqual([]);
  });
  it.each([
    ['var f = () => 1;', 'arrow function'],
    ['class A {}', 'class'],
    ['let a = 1;', 'let declaration'],
    ['const a = 1;', 'const declaration'],
    ['function f(a = 1) {}', 'default parameter / destructuring default'],
    ['function f(...a) {}', 'rest element'],
    ['var { a } = {};', 'destructuring'],
    ['async function f() {}', 'async function'],
    ['function* g() {}', 'generator'],
    ['var a = b?.c;', 'optional chaining'],
    ['var a = b ?? c;', 'nullish coalescing'],
    ['var a = 2 ** 3;', 'exponent operator'],
    ['var a = { ...b };', 'object spread'],
    ['try {} catch {}', 'optional catch binding'],
    ['var r = /a/u;', 'regex flag /u'],
  ])('rejects %s', (source, problem) => {
    expect(problems(source)).toContain(problem);
  });
  it('reports the line of the problem', () => {
    expect(findLegacyIssues('var a;\nvar f = () => 1;')[0]).toMatchObject({ line: 2 });
  });
});
