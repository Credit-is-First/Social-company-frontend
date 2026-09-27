#!/usr/bin/env node
/**
 * Tests for scripts/tailwind-jit.js (the on-demand Tailwind compiler) and the
 * config plugins it builds on.
 *
 *   npm run test:tailwind
 *
 * Plain Node + assert, so it runs offline on Node 12.1.0 without a test
 * framework. It builds Tailwind 1.9's stylesheet from the real config, so it
 * exercises the project's actual setup.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const jit = require('./tailwind-jit');

const postcss = require(require.resolve('postcss', { paths: [path.dirname(require.resolve('tailwindcss'))] }));

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push(`${name}\n    ${String(err.message).split('\n').join('\n    ')}`);
  }
}

Promise.all([jit.buildBaseline(), Promise.resolve(jit.loadTheme())]).then(([baseline, theme]) => {
  const rule = token => jit.buildRule(token, baseline, theme);
  const css = token => {
    const r = rule(token);
    return r ? r.css.replace(/\s+/g, ' ') : null;
  };
  /** Tokens in the order render() puts their rules; later wins the cascade. */
  const sorted = tokens => {
    const rules = tokens.map(t => {
      const r = rule(t);
      assert.ok(r, `no rule for ${t}`);
      return r;
    });
    jit.render(rules);
    return rules.map(r => r.token);
  };
  const assertBefore = (first, second) => {
    const order = sorted([second, first]);
    assert.ok(order.indexOf(first) < order.indexOf(second), `${first} should come before ${second}, got ${order.join(', ')}`);
  };

  // -------------------------------------------------------------------------
  // Robustness: words from source code must never crash the run
  // -------------------------------------------------------------------------

  ['constructor', 'toString', 'valueOf', 'hasOwnProperty', '__proto__', 'bg-constructor', 'text-toString',
    'valueOf:p-4', 'constructor:bg-red-500', 'w-[constructor]', 'hover:', ':', '[', ']:', 'e.g.', 'https://x.y']
    .forEach(token => test(`does not throw on "${token}"`, () => {
      const r = rule(token);
      if (/^(valueOf|constructor):/.test(token)) assert.strictEqual(r, null, 'unknown variant must not match');
    }));

  // -------------------------------------------------------------------------
  // Cascade order (the rule later in the file wins)
  // -------------------------------------------------------------------------

  test('longhand after shorthand for re-emitted 1.9 classes (md:p-4 md:px-2)', () => assertBefore('md:p-4', 'md:px-2'));
  test('longhand after shorthand for arbitrary values (p-[3px] px-[5px])', () => assertBefore('p-[3px]', 'px-[5px]'));
  test('pl after px for arbitrary values', () => assertBefore('px-[2px]', 'pl-[5px]'));
  test('rounded-t after rounded', () => assertBefore('rounded-[4px]', 'rounded-t-[8px]'));
  test('bg-opacity-* after an arbitrary bg colour', () => assertBefore('bg-[#123]', 'bg-opacity-50'));
  test('text-opacity-* after an arbitrary text colour', () => assertBefore('text-[#123]', 'text-opacity-50'));
  test('a named to-* after an arbitrary from-*', () => assertBefore('from-[#f00]', 'to-blue-500'));
  test('a shadow colour after an arbitrary shadow', () => assertBefore('shadow-[0_2px_4px_#000]', 'shadow-red-500'));
  test('plain utilities before variants', () => assertBefore('bg-blue-500', 'hover:bg-red-500'));
  test('hover before focus (focus wins when both apply)', () => assertBefore('hover:bg-red-500', 'focus:bg-blue-500'));
  test('screen sizes smallest first', () => {
    const order = sorted(['lg:p-4', 'sm:p-4', 'md:p-4', '2xl:p-4', 'xl:p-4']);
    assert.deepStrictEqual(order, ['sm:p-4', 'md:p-4', 'lg:p-4', 'xl:p-4', '2xl:p-4']);
  });
  test('screen sizes after dark:, as in Tailwind 3', () => assertBefore('dark:bg-[#222]', 'lg:bg-[#111]'));
  test('transform-none after translate so it can cancel it', () => assertBefore('translate-x-4', 'transform-none'));

  // -------------------------------------------------------------------------
  // Values
  // -------------------------------------------------------------------------

  const hasDecl = (token, decl) => test(`${token} → ${decl}`, () => {
    const out = css(token);
    assert.ok(out && out.indexOf(decl) !== -1, `got ${out}`);
  });

  hasDecl('h-[calc(100vh-4rem)]', 'height: calc(100vh - 4rem)');
  hasDecl('w-[calc(100%-var(--gap-2))]', 'width: calc(100% - var(--gap-2))');
  hasDecl('p-[calc(var(--space-1)*2)]', 'padding: calc(var(--space-1) * 2)');
  hasDecl('h-[calc(100vh-env(safe-area-inset-bottom))]', 'height: calc(100vh - env(safe-area-inset-bottom))');
  hasDecl('w-[calc(1e-3px+2px)]', 'width: calc(1e-3px + 2px)');
  hasDecl('m-[calc(-1*var(--x))]', 'margin: calc(-1 * var(--x))');
  hasDecl('grid-cols-[minmax(0,1fr)_2fr]', 'grid-template-columns: minmax(0,1fr) 2fr');
  hasDecl('min-h-[clamp(10rem,50vh,30rem)]', 'min-height: clamp(10rem,50vh,30rem)');
  hasDecl('bg-[#11223380]', 'background-color: rgba(17, 34, 51, 0.502)');
  hasDecl('text-[#1238]', 'color: rgba(17, 34, 51, 0.533)');
  hasDecl('bg-[#11223380]/50', 'background-color: rgba(17, 34, 51, 0.251)');
  hasDecl('text-[red]', 'color: red');
  hasDecl('text-[var(--brand)]', 'color: var(--brand)');
  hasDecl('text-[13px]', 'font-size: 13px');
  hasDecl('bg-[length:200px_100px]', 'background-size: 200px 100px');
  hasDecl('bg-[center_top_1rem]', 'background-position: center top 1rem');
  hasDecl('bg-[50%]', 'background-position: 50%');
  hasDecl('bg-[red]', 'background-color: red');
  hasDecl('stroke-[red]', 'stroke: red');
  hasDecl('stroke-[2]', 'stroke-width: 2');
  hasDecl('outline-[red]', 'outline-color: red');
  hasDecl('bg-blue-500/50', 'background-color: rgba(43, 127, 255, 0.5)');
  hasDecl('rotate-[17deg]', 'transform: translateX(');
  hasDecl('line-clamp-none', 'display: block');
  hasDecl('transform-none', 'transform: none');
  hasDecl('shadow-[0_2px_4px_#000]', '--tw-shadow-colored: 0 2px 4px var(--tw-shadow-color)');
  hasDecl('from-[20px]', '--tw-gradient-from-position: 20px');

  // Exact selectors for the variants with the most room for error.
  const selector = (token, expected) => test(`selector for ${token}`, () => {
    const r = rule(token);
    assert.ok(r, 'no rule');
    assert.strictEqual(r.css.split(' {')[0], expected);
  });
  selector('aria-selected:bg-blue-500', '.aria-selected\\:bg-blue-500[aria-selected="true"]');
  selector('data-[state=open]:block', '.data-\\[state\\=open\\]\\:block[data-state="open"]');
  selector('group-aria-expanded:rotate-180', '.group[aria-expanded="true"] .group-aria-expanded\\:rotate-180');
  selector('[&>*]:p-2', '.\\[\\&\\>\\*\\]\\:p-2>*');
  selector('[.dark_&]:text-white', '.dark .\\[\\.dark_\\&\\]\\:text-white');
  selector('2xl:p-4', '.\\32 xl\\:p-4');

  // -------------------------------------------------------------------------
  // Tokenizer
  // -------------------------------------------------------------------------

  const tokens = source => jit.tokenize(source);
  test('keeps bracketed classes whole inside JSX', () => {
    const t = tokens(`<div className="[&>*]:p-2 bg-[url('/a.png')] data-[state=open]:block">x</div>`);
    ['[&>*]:p-2', "bg-[url('/a.png')]", 'data-[state=open]:block'].forEach(c => assert.ok(t.indexOf(c) !== -1, `${c} in ${t}`));
  });
  test('finds the first class of an array literal', () => {
    const t = tokens("const c = ['w-[3px]', 'bg-black/50'];");
    assert.ok(t.indexOf('w-[3px]') !== -1, JSON.stringify(t));
    assert.ok(t.indexOf('bg-black/50') !== -1, JSON.stringify(t));
  });
  test('finds classes in template literals and conditionals', () => {
    const t = tokens('className={`p-4 ${active ? \'bg-sky-500\' : "bg-gray-100"}`}');
    ['p-4', 'bg-sky-500', 'bg-gray-100'].forEach(c => assert.ok(t.indexOf(c) !== -1, `${c} in ${t}`));
  });

  // -------------------------------------------------------------------------
  // Coverage: new syntax that must generate, and non-classes that must not
  // -------------------------------------------------------------------------

  ['w-[250px]', '-top-[3px]', 'grid-cols-[1fr_2fr]', 'bg-[#1da1f2]', "bg-[url('/img/hero.png')]", 'z-[60]',
    'space-y-[7px]', 'aspect-[4/3]', 'font-[650]', '[mask-type:luminance]', "content-['']", 'ring-[3px]',
    'bg-black/50', 'text-blue-500/75', 'bg-sky-500/[.35]', 'ring-rose-400/40', 'bg-taupe-500', 'bg-gray-950',
    'size-10', 'aspect-video', 'grow', 'shrink-0', 'basis-1/2', 'text-ellipsis', 'decoration-sky-500', 'blur-sm',
    'backdrop-blur', 'drop-shadow-md', 'dark:bg-gray-800', 'active:bg-blue-700', 'focus-visible:ring-2',
    'peer-checked:bg-blue-500', 'lg:hover:bg-sky-600', 'print:hidden', 'motion-reduce:transition-none',
    'after:absolute', 'odd:bg-gray-50', '!mt-4', 'md:!hidden', 'supports-[display:grid]:grid',
    '[@media(min-width:900px)]:flex', 'w-fit', 'h-dvh', 'min-h-10', 'max-w-7xl', 'border-x', 'rounded-s-lg',
    'overflow-clip', 'shadow-blue-500/50', 'from-10%']
    .forEach(token => test(`generates ${token}`, () => assert.ok(rule(token), 'no rule')));

  ['first', 'hover:', 'className=', 'unknownvariant:bg-red-500', 'bg-notacolor-500', 'bg-blue-500/abc',
    '[p]:mt-4', '@md:flex', 'aria-bogus:underline', 'data-[bad key]:block']
    .forEach(token => test(`ignores ${token}`, () => assert.strictEqual(rule(token), null)));

  test('rendered output is valid CSS', () => {
    const all = ['bg-[#123]', 'md:p-4', 'dark:lg:bg-[#111]', 'supports-[display:grid]:grid', 'after:absolute',
      'blur-sm', 'hover:[&>*]:underline', 'w-[calc(100%-var(--gap-2))]'].map(rule);
    postcss.parse(jit.render(all));
  });

  // -------------------------------------------------------------------------

  if (failures.length > 0) {
    console.error(`tailwind-jit: ${failures.length} failed, ${passed} passed\n`);
    failures.forEach(f => console.error(`  ✗ ${f}\n`));
    process.exit(1);
  }
  console.log(`tailwind-jit: all ${passed} tests passed`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
