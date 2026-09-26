#!/usr/bin/env node
/**
 * On-demand Tailwind compiler for a project stuck on Tailwind 1.9.
 *
 * Tailwind 1.9 generates a fixed stylesheet from the config, so newer syntax
 * such as `w-[250px]`, `bg-black/50`, `bg-sky-500` or `dark:` produces no CSS.
 * This script scans `src/` for class names, skips everything Tailwind 1.9
 * already generates, and writes CSS for the rest to `src/tailwind-jit.css`,
 * which `src/index.tsx` imports after `index.css`.
 *
 * Supported (Tailwind 3 syntax):
 * - Arbitrary values:     w-[250px], top-[-3px], bg-[#1da1f2], grid-cols-[1fr_2fr]
 * - Arbitrary properties: [mask-type:luminance]
 * - Colour opacity:       bg-black/50, text-blue-500/[.35], border-[#f00]/25
 * - Tailwind 4 colours:   the full palette from tailwind.config.js (tailwind.palette.js)
 * - Tailwind 3 utilities: size-*, aspect-*, grow/shrink/basis-*, filters,
 *                         backdrop filters, decoration-*, underline-offset-*,
 *                         indent-*, accent-*, caret-*, fill/stroke colours,
 *                         outline-*, columns-*, mix-blend-*, touch-*, and more
 * - Shadow colours:      shadow-blue-500/50, shadow-[#f00], shadow-[0_2px_4px_#000]
 * - Gradient positions:  from-[20px], to-[85%] (from-10% etc. come from the config)
 * - Variants on anything above AND on every Tailwind 1.9 utility:
 *   sm: md: lg: xl: 2xl:, dark:, print:, motion-safe:, motion-reduce:,
 *   hover: focus: active: visited: disabled: enabled: checked: first: last:
 *   odd: even: focus-within: focus-visible: ... , before: after: placeholder:
 *   selection: file: marker:, aria-selected: aria-[sort=ascending]:,
 *   data-[state=open]:, group-*: / peer-* (incl. group-aria-*, group-data-[..],
 *   group-[.is-open]), supports-[display:grid]:, and arbitrary variants
 *   [&>*]: [&_p]: [.dark_&]: [@media(min-width:900px)]: [@supports(...)]:
 * - Important modifier:   !mt-4, md:!hidden
 *
 * Not supported: container queries (`@container`, `@md:`) and opacity
 * modifiers on non-hex colours (named keywords, var(), rgb()).
 *
 * Usage:
 *   node scripts/tailwind-jit.js           generate once
 *   node scripts/tailwind-jit.js --watch   generate, then regenerate on change
 *
 * Runs on Node 12.1.0: no optional chaining, nullish coalescing or
 * Object.fromEntries.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const OUT_FILE = path.join(SRC_DIR, 'tailwind-jit.css');
const CONFIG_FILE = path.join(ROOT, 'tailwind.config.js');
const SOURCE_EXT = /\.(tsx?|jsx?|html)$/;

const tailwind = require('tailwindcss');
const resolveConfig = require('tailwindcss/resolveConfig');
const flattenColorPalette = require('tailwindcss/lib/util/flattenColorPalette').default;
// Tailwind 1.9 bundles PostCSS 7; use the same copy it was built against.
const postcss = require(require.resolve('postcss', { paths: [path.dirname(require.resolve('tailwindcss'))] }));

// ---------------------------------------------------------------------------
// Tailwind 3 data that 1.9 lacks
// ---------------------------------------------------------------------------

// Colours come from tailwind.config.js, which holds Tailwind 4's full palette.

const DEFAULT_SCREENS = { '2xl': '1536px' };

const BLUR = { none: '0', sm: '4px', DEFAULT: '8px', md: '12px', lg: '16px', xl: '24px', '2xl': '40px', '3xl': '64px' };
const BRIGHTNESS = { 0: '0', 50: '.5', 75: '.75', 90: '.9', 95: '.95', 100: '1', 105: '1.05', 110: '1.1', 125: '1.25', 150: '1.5', 200: '2' };
const CONTRAST = { 0: '0', 50: '.5', 75: '.75', 100: '1', 125: '1.25', 150: '1.5', 200: '2' };
const SATURATE = { 0: '0', 50: '.5', 100: '1', 150: '1.5', 200: '2' };
const HUE_ROTATE = { 0: '0deg', 15: '15deg', 30: '30deg', 60: '60deg', 90: '90deg', 180: '180deg' };
const PERCENT_TOGGLE = { DEFAULT: '100%', 0: '0' };
const DROP_SHADOW = {
  sm: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.05))',
  DEFAULT: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.06))',
  md: 'drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06))',
  lg: 'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.04)) drop-shadow(0 4px 3px rgba(0, 0, 0, 0.1))',
  xl: 'drop-shadow(0 20px 13px rgba(0, 0, 0, 0.03)) drop-shadow(0 8px 5px rgba(0, 0, 0, 0.08))',
  '2xl': 'drop-shadow(0 25px 25px rgba(0, 0, 0, 0.15))',
  none: 'drop-shadow(0 0 #0000)',
};
const WIDTH_SCALE = { 0: '0px', 1: '1px', 2: '2px', 4: '4px', 8: '8px' };
const COLUMNS = { auto: 'auto', '3xs': '16rem', '2xs': '18rem', xs: '20rem', sm: '24rem', md: '28rem', lg: '32rem', xl: '36rem', '2xl': '42rem', '3xl': '48rem', '4xl': '56rem', '5xl': '64rem', '6xl': '72rem', '7xl': '80rem' };
const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity', 'plus-lighter'];

const FILTERS = ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia', 'drop-shadow'];
const BACKDROP_FILTERS = ['blur', 'brightness', 'contrast', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia'];

const FILTER_VALUE = FILTERS.map(f => `var(--tw-${f})`).join(' ');
const BACKDROP_VALUE = BACKDROP_FILTERS.map(f => `var(--tw-backdrop-${f})`).join(' ');
const EMPTY = 'var(--tw-empty, /*!*/ /*!*/)';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const PSEUDO_CLASSES = {
  hover: ':hover', focus: ':focus', active: ':active', visited: ':visited', target: ':target',
  'focus-within': ':focus-within', 'focus-visible': ':focus-visible',
  disabled: ':disabled', enabled: ':enabled', checked: ':checked', indeterminate: ':indeterminate',
  required: ':required', optional: ':optional', valid: ':valid', invalid: ':invalid',
  'read-only': ':read-only', 'placeholder-shown': ':placeholder-shown', autofill: ':autofill',
  default: ':default', empty: ':empty', open: '[open]',
  first: ':first-child', last: ':last-child', only: ':only-child',
  odd: ':nth-child(odd)', even: ':nth-child(even)',
  'first-of-type': ':first-of-type', 'last-of-type': ':last-of-type', 'only-of-type': ':only-of-type',
};

const PSEUDO_ELEMENTS = {
  before: '::before', after: '::after', placeholder: '::placeholder', selection: '::selection',
  file: '::file-selector-button', marker: '::marker', 'first-letter': '::first-letter', 'first-line': '::first-line',
};

const MEDIA_FEATURES = {
  dark: '(prefers-color-scheme: dark)',
  'motion-safe': '(prefers-reduced-motion: no-preference)',
  'motion-reduce': '(prefers-reduced-motion: reduce)',
  portrait: '(orientation: portrait)',
  landscape: '(orientation: landscape)',
};

// Tailwind 3's boolean aria-* variants: aria-selected -> [aria-selected="true"]
const ARIA_BOOLEANS = ['busy', 'checked', 'disabled', 'expanded', 'hidden', 'pressed', 'readonly', 'required', 'selected'];

/** `[key=value]` or `[key]` inside aria-[...] / data-[...] as an attribute selector. */
function attributeSelector(attrPrefix, raw) {
  const inner = decodeArbitrary(raw);
  const eq = inner.indexOf('=');
  if (eq === -1) return /^[a-zA-Z0-9_-]+$/.test(inner) ? `[${attrPrefix}${inner}]` : null;
  const key = inner.slice(0, eq);
  const value = inner.slice(eq + 1).replace(/^["']|["']$/g, '');
  if (!/^[a-zA-Z0-9_-]+$/.test(key)) return null;
  return `[${attrPrefix}${key}="${value.replace(/"/g, '\\"')}"]`;
}

/**
 * Selector fragment for a state variant attached to the element itself:
 * hover, first, aria-selected, aria-[sort=ascending], data-[state=open].
 */
function stateSelector(name) {
  if (PSEUDO_CLASSES[name]) return PSEUDO_CLASSES[name];
  let m;
  if ((m = /^aria-(.+)$/.exec(name))) {
    if (ARIA_BOOLEANS.indexOf(m[1]) !== -1) return `[aria-${m[1]}="true"]`;
    const arb = /^\[(.+)\]$/.exec(m[1]);
    return arb ? attributeSelector('aria-', arb[1]) : null;
  }
  if ((m = /^data-\[(.+)\]$/.exec(name))) return attributeSelector('data-', m[1]);
  return null;
}

/** group-[.is-open] / peer-[:checked]: an arbitrary selector on the group or peer. */
function arbitraryState(name) {
  const m = /^\[(.+)\]$/.exec(name);
  if (!m) return null;
  const inner = decodeArbitrary(m[1]);
  return /^[.:\[]/.test(inner) ? inner : null;
}

/** supports-[display:grid] -> (display:grid); supports-[backdrop-filter] -> (backdrop-filter: var(--tw)). */
function supportsCondition(inner) {
  if (/^(not|\()/.test(inner)) return inner;
  if (inner.indexOf(':') !== -1) return `(${inner})`;
  return `(${inner}: var(--tw))`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeClass(name) {
  let out = name.replace(/[^a-zA-Z0-9_-]/g, c => '\\' + c);
  if (/^[0-9]/.test(out)) out = '\\3' + out[0] + ' ' + out.slice(1);
  return out;
}

function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(h)) return null;
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Arbitrary value text: `_` means a space, `\_` a literal underscore, and
 * operators inside calc()/min()/max()/clamp() get the spaces CSS requires
 * (`calc(100vh-4rem)` becomes `calc(100vh - 4rem)`), as Tailwind 3 does.
 */
function decodeArbitrary(raw) {
  if (/^url\(/.test(raw)) return raw;
  const spaced = raw.replace(/\\_/g, '\u0000').replace(/_/g, ' ').replace(/\u0000/g, '_');
  return spaced.replace(/(calc|min|max|clamp)\((.*)\)/g, (match, fn, inner) =>
    `${fn}(${inner.replace(/([0-9a-z%)])\s*([+\-*/])\s*(?=[0-9.(]|var\()/gi, '$1 $2 ')})`);
}

function isColorValue(v) {
  return /^(#[0-9a-fA-F]{3,8}|(rgba?|hsla?|hwb|lab|lch|oklch|oklab|color)\(.*\)|transparent|currentColor|current|inherit)$/.test(v);
}

function isLengthValue(v) {
  return /^-?(\d+\.?\d*|\.\d+)(px|rem|em|%|vh|vw|vmin|vmax|dvh|svh|lvh|ch|ex|pt|pc|cm|mm|in|fr)?$/.test(v) ||
    /^(calc|min|max|clamp)\(/.test(v);
}

function negate(value) {
  if (/^-?(\d+\.?\d*|\.\d+)[a-z%]*$/.test(value)) return value.charAt(0) === '-' ? value.slice(1) : '-' + value;
  return `calc(${value} * -1)`;
}

function fraction(key) {
  const m = /^(\d+)\/(\d+)$/.exec(key);
  if (!m || Number(m[2]) === 0) return null;
  return `${+(Number(m[1]) / Number(m[2]) * 100).toFixed(6)}%`;
}

// ---------------------------------------------------------------------------
// Tailwind 1.9 baseline
// ---------------------------------------------------------------------------

/**
 * Builds the stylesheet Tailwind 1.9 would generate for the project config and
 * returns (a) every class it defines and (b) the declarations of each plain
 * utility, so variants can be applied to 1.9 utilities it has no variant for.
 */
function buildBaseline() {
  delete require.cache[CONFIG_FILE];
  const input = '@tailwind base; @tailwind components; @tailwind utilities;';
  return postcss([tailwind(CONFIG_FILE)]).process(input, { from: undefined }).then(result => {
    const defined = new Set();
    const utilities = new Map();
    const classRe = /^\.((?:\\.|[a-zA-Z0-9_-])+)(.*)$/;
    // Suffixes a plain utility may carry (placeholder colours, space/divide).
    const reusableSuffix = /^(::?[a-z-]+)?$|^ > :not\(template\) ~ :not\(template\)$/;

    result.root.walkRules(rule => {
      const topLevel = rule.parent.type === 'root';
      rule.selectors.forEach(selector => {
        const m = classRe.exec(selector.trim());
        if (!m) return;
        const name = m[1].replace(/\\(.)/g, '$1');
        defined.add(name);
        if (!topLevel || name.indexOf(':') !== -1 || !reusableSuffix.test(m[2])) return;
        const decls = [];
        rule.walkDecls(d => { decls.push([d.prop, d.value]); });
        if (!utilities.has(name)) utilities.set(name, []);
        utilities.get(name).push({ suffix: m[2], decls });
      });
    });
    return { defined, utilities };
  });
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

function loadTheme() {
  delete require.cache[CONFIG_FILE];
  const theme = resolveConfig(require(CONFIG_FILE)).theme;

  const colors = flattenColorPalette(theme.colors);
  colors.current = 'currentColor';
  colors.inherit = 'inherit';

  const screens = Object.assign({}, theme.screens, DEFAULT_SCREENS, theme.screens);
  const screenOrder = Object.keys(screens).sort((a, b) => parseFloat(screens[a]) - parseFloat(screens[b]));

  return {
    colors,
    spacing: theme.spacing,
    opacity: theme.opacity,
    screens,
    screenOrder,
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Colour utilities: prefix -> how a colour is applied. */
const COLOR_UTILITIES = {
  bg: { props: ['background-color'], opacityVar: '--bg-opacity' },
  text: { props: ['color'], opacityVar: '--text-opacity' },
  border: { props: ['border-color'], opacityVar: '--border-opacity' },
  'border-x': { props: ['border-left-color', 'border-right-color'] },
  'border-y': { props: ['border-top-color', 'border-bottom-color'] },
  'border-t': { props: ['border-top-color'] },
  'border-r': { props: ['border-right-color'] },
  'border-b': { props: ['border-bottom-color'] },
  'border-l': { props: ['border-left-color'] },
  divide: { props: ['border-color'], opacityVar: '--divide-opacity', suffix: ' > :not(template) ~ :not(template)' },
  placeholder: { props: ['color'], opacityVar: '--placeholder-opacity', suffix: '::placeholder' },
  ring: { ring: true },
  'ring-offset': { props: ['--tw-ring-offset-color'] },
  shadow: { shadow: true },
  from: { gradient: 'from' },
  via: { gradient: 'via' },
  to: { gradient: 'to' },
  fill: { props: ['fill'] },
  stroke: { props: ['stroke'] },
  decoration: { props: ['text-decoration-color'] },
  accent: { props: ['accent-color'] },
  caret: { props: ['caret-color'] },
  outline: { props: ['outline-color'] },
};

function transparentOf(color) {
  const rgb = color.charAt(0) === '#' ? hexToRgb(color) : null;
  return rgb ? `rgba(${rgb.join(', ')}, 0)` : 'rgba(255, 255, 255, 0)';
}

/** Declarations for a colour utility. `alpha` is null for no modifier. */
function colorDecls(prefix, color, alpha) {
  const spec = COLOR_UTILITIES[prefix];
  const rgb = color.charAt(0) === '#' ? hexToRgb(color) : null;
  if (alpha !== null && !rgb) return null; // Opacity needs a hex colour to split.

  const fixed = alpha !== null ? `rgba(${rgb.join(', ')}, ${alpha})` : color;

  if (spec.ring) {
    if (alpha !== null) return { decls: [['--tw-ring-color', fixed]] };
    if (rgb) return { decls: [['--tw-ring-opacity', '1'], ['--tw-ring-color', `rgba(${rgb.join(', ')}, var(--tw-ring-opacity))`]] };
    return { decls: [['--tw-ring-color', color]] };
  }

  if (spec.shadow) {
    // Same variables as the config's shadowPlugin.
    return { decls: [['--tw-shadow-color', fixed], ['--tw-shadow', 'var(--tw-shadow-colored)']] };
  }

  if (spec.gradient) {
    // Same variables as the config's gradientPlugin (Tailwind 3.3 stops).
    const clear = `${transparentOf(color)} var(--tw-gradient-to-position)`;
    if (spec.gradient === 'to') return { decls: [['--tw-gradient-to', `${fixed} var(--tw-gradient-to-position)`]] };
    if (spec.gradient === 'from') {
      return { decls: [
        ['--tw-gradient-from', `${fixed} var(--tw-gradient-from-position)`],
        ['--tw-gradient-to', clear],
        ['--tw-gradient-stops', 'var(--tw-gradient-from), var(--tw-gradient-to)'],
      ] };
    }
    return { decls: [
      ['--tw-gradient-to', clear],
      ['--tw-gradient-stops', `var(--tw-gradient-from), ${fixed} var(--tw-gradient-via-position), var(--tw-gradient-to)`],
    ] };
  }

  const decls = [];
  if (alpha === null && rgb && spec.opacityVar) {
    // Match 1.9 so bg-opacity-*, text-opacity-* etc. still apply.
    decls.push([spec.opacityVar, '1']);
    spec.props.forEach(p => { decls.push([p, color]); decls.push([p, `rgba(${rgb.join(', ')}, var(${spec.opacityVar}))`]); });
  } else {
    spec.props.forEach(p => decls.push([p, fixed]));
  }
  return { decls, suffix: spec.suffix || '' };
}

function resolveAlpha(modifier, theme) {
  if (modifier === null) return null;
  const arbitrary = /^\[(.+)\]$/.exec(modifier);
  if (arbitrary) return arbitrary[1];
  if (/^\d+$/.test(modifier)) {
    if (theme.opacity[modifier] !== undefined) return theme.opacity[modifier];
    const n = Number(modifier);
    return n <= 100 ? String(n / 100) : null;
  }
  return null;
}

/** Arbitrary-value utilities: prefix -> (value, ctx) => decls | null. */
function single(prop) { return v => [[prop, v]]; }
function multi(props) { return v => props.map(p => [p, v]); }

// Matches the config's transformPlugin: each utility applies the transform itself.
const TRANSFORM = 'translateX(var(--transform-translate-x)) translateY(var(--transform-translate-y)) ' +
  'rotate(var(--transform-rotate)) skewX(var(--transform-skew-x)) skewY(var(--transform-skew-y)) ' +
  'scaleX(var(--transform-scale-x)) scaleY(var(--transform-scale-y))';
function transformVar(names) {
  return v => [].concat(names).map(n => [n, v]).concat([['transform', TRANSFORM]]);
}

const SHADOW_COMPOSE = 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)';

/** Arbitrary shadow, composable with rings and shadow-{colour} like the config's shadowPlugin. */
function arbitraryShadow(value) {
  const colored = value
    .split(/,(?![^(]*\))/)
    .map(layer => {
      const trimmed = layer.trim();
      const swapped = trimmed.replace(/(rgba?\([^)]*\)|hsla?\([^)]*\)|#[0-9a-f]{3,8})\s*$/i, 'var(--tw-shadow-color)');
      return swapped === trimmed ? `${trimmed} var(--tw-shadow-color)` : swapped;
    })
    .join(', ');
  return [['--tw-shadow', value], ['--tw-shadow-colored', colored], ['box-shadow', SHADOW_COMPOSE]];
}

const ARBITRARY = {
  w: single('width'), h: single('height'),
  'min-w': single('min-width'), 'max-w': single('max-width'),
  'min-h': single('min-height'), 'max-h': single('max-height'),
  size: multi(['width', 'height']),
  p: single('padding'), px: multi(['padding-left', 'padding-right']), py: multi(['padding-top', 'padding-bottom']),
  pt: single('padding-top'), pr: single('padding-right'), pb: single('padding-bottom'), pl: single('padding-left'),
  m: single('margin'), mx: multi(['margin-left', 'margin-right']), my: multi(['margin-top', 'margin-bottom']),
  mt: single('margin-top'), mr: single('margin-right'), mb: single('margin-bottom'), ml: single('margin-left'),
  top: single('top'), right: single('right'), bottom: single('bottom'), left: single('left'),
  inset: multi(['top', 'right', 'bottom', 'left']), 'inset-x': multi(['left', 'right']), 'inset-y': multi(['top', 'bottom']),
  gap: single('gap'), 'gap-x': single('column-gap'), 'gap-y': single('row-gap'),
  'space-x': v => ({ suffix: ' > :not(template) ~ :not(template)', decls: [['--space-x-reverse', '0'], ['margin-right', `calc(${v} * var(--space-x-reverse))`], ['margin-left', `calc(${v} * calc(1 - var(--space-x-reverse)))`]] }),
  'space-y': v => ({ suffix: ' > :not(template) ~ :not(template)', decls: [['--space-y-reverse', '0'], ['margin-top', `calc(${v} * calc(1 - var(--space-y-reverse)))`], ['margin-bottom', `calc(${v} * var(--space-y-reverse))`]] }),
  z: single('z-index'), order: single('order'), opacity: single('opacity'),
  basis: single('flex-basis'), flex: single('flex'), grow: single('flex-grow'), shrink: single('flex-shrink'),
  leading: single('line-height'), tracking: single('letter-spacing'), indent: single('text-indent'),
  'underline-offset': single('text-underline-offset'),
  'grid-cols': single('grid-template-columns'), 'grid-rows': single('grid-template-rows'),
  col: single('grid-column'), 'col-start': single('grid-column-start'), 'col-end': single('grid-column-end'),
  row: single('grid-row'), 'row-start': single('grid-row-start'), 'row-end': single('grid-row-end'),
  'auto-cols': single('grid-auto-columns'), 'auto-rows': single('grid-auto-rows'),
  rounded: single('border-radius'),
  'rounded-t': multi(['border-top-left-radius', 'border-top-right-radius']),
  'rounded-r': multi(['border-top-right-radius', 'border-bottom-right-radius']),
  'rounded-b': multi(['border-bottom-right-radius', 'border-bottom-left-radius']),
  'rounded-l': multi(['border-top-left-radius', 'border-bottom-left-radius']),
  'rounded-tl': single('border-top-left-radius'), 'rounded-tr': single('border-top-right-radius'),
  'rounded-br': single('border-bottom-right-radius'), 'rounded-bl': single('border-bottom-left-radius'),
  duration: single('transition-duration'), delay: single('transition-delay'),
  ease: single('transition-timing-function'), transition: single('transition-property'),
  animate: single('animation'),
  'translate-x': transformVar('--transform-translate-x'), 'translate-y': transformVar('--transform-translate-y'),
  rotate: transformVar('--transform-rotate'),
  'skew-x': transformVar('--transform-skew-x'), 'skew-y': transformVar('--transform-skew-y'),
  scale: transformVar(['--transform-scale-x', '--transform-scale-y']),
  'scale-x': transformVar('--transform-scale-x'), 'scale-y': transformVar('--transform-scale-y'),
  origin: single('transform-origin'),
  aspect: v => [['aspect-ratio', v.replace(/\s*\/\s*/, ' / ')]],
  columns: single('columns'),
  object: single('object-position'),
  'outline-offset': single('outline-offset'),
  content: v => [['--tw-content', v], ['content', 'var(--tw-content)']],
  'line-clamp': v => [['overflow', 'hidden'], ['display', '-webkit-box'], ['-webkit-box-orient', 'vertical'], ['-webkit-line-clamp', v]],
  cursor: single('cursor'),
  'will-change': single('will-change'),
};

/** Utilities whose meaning depends on the value's type. */
function typedArbitrary(prefix, value, hint) {
  const asColor = hint === 'color' || (!hint && isColorValue(value));
  const asLength = hint === 'length' || (!hint && isLengthValue(value));
  switch (prefix) {
    case 'text':
      if (asColor) return 'color';
      return [['font-size', value]];
    case 'bg':
      if (hint === 'url' || hint === 'image' || /^(url|linear-gradient|radial-gradient|conic-gradient)\(/.test(value)) return [['background-image', value]];
      if (hint === 'position') return [['background-position', value]];
      if (hint === 'size') return [['background-size', value]];
      return 'color';
    case 'border': case 'border-x': case 'border-y': case 'border-t': case 'border-r': case 'border-b': case 'border-l': {
      if (!asLength) return 'color';
      const sides = { border: ['border-width'], 'border-x': ['border-left-width', 'border-right-width'], 'border-y': ['border-top-width', 'border-bottom-width'], 'border-t': ['border-top-width'], 'border-r': ['border-right-width'], 'border-b': ['border-bottom-width'], 'border-l': ['border-left-width'] };
      return sides[prefix].map(p => [p, value]);
    }
    case 'ring':
      if (asLength) return ringWidth(value);
      return 'color';
    case 'ring-offset':
      if (asLength) return [['--tw-ring-offset-width', value]];
      return 'color';
    case 'decoration':
      if (asLength) return [['text-decoration-thickness', value]];
      return 'color';
    case 'outline':
      if (asLength) return [['outline-width', value]];
      return 'color';
    case 'stroke':
      if (asLength || hint === 'number' || /^\d+$/.test(value)) return [['stroke-width', value]];
      return 'color';
    case 'font':
      if (hint === 'weight' || /^\d+$/.test(value)) return [['font-weight', value]];
      return [['font-family', value]];
    case 'shadow':
      if (asColor) return 'color';
      return arbitraryShadow(value);
    case 'from': case 'via': case 'to':
      // A length or percentage is a stop position: from-[20px], to-[85%].
      if (hint === 'length' || hint === 'percentage' || (!hint && isLengthValue(value))) {
        return [[`--tw-gradient-${prefix}-position`, value]];
      }
      return 'color';
    case 'fill': case 'accent': case 'caret': case 'divide': case 'placeholder':
      return 'color';
    default:
      return null;
  }
}

function ringWidth(width) {
  return [
    ['--tw-ring-offset-shadow', 'var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color)'],
    ['--tw-ring-shadow', `var(--tw-ring-inset) 0 0 0 calc(${width} + var(--tw-ring-offset-width)) var(--tw-ring-color)`],
    ['box-shadow', 'var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000)'],
  ];
}

function filterDecls(name, value, backdrop) {
  const variable = backdrop ? `--tw-backdrop-${name}` : `--tw-${name}`;
  const fn = name === 'drop-shadow' ? null : name;
  return {
    decls: [[variable, fn ? `${fn}(${value})` : value], [backdrop ? 'backdrop-filter' : 'filter', backdrop ? BACKDROP_VALUE : FILTER_VALUE]],
    needs: backdrop ? 'backdrop' : 'filter',
  };
}

function lookup(scale, key) {
  if (key === '') return scale.DEFAULT !== undefined ? scale.DEFAULT : undefined;
  return Object.prototype.hasOwnProperty.call(scale, key) ? scale[key] : undefined;
}

/** Tailwind 3 named utilities that 1.9 does not have. */
function namedUtility(name, negative, theme) {
  const spacingOr = (key, extra) => {
    if (extra && extra[key] !== undefined) return extra[key];
    if (theme.spacing[key] !== undefined) return theme.spacing[key];
    return fraction(key);
  };
  let m;

  const simple = {
    'aspect-auto': [['aspect-ratio', 'auto']], 'aspect-square': [['aspect-ratio', '1 / 1']], 'aspect-video': [['aspect-ratio', '16 / 9']],
    grow: [['flex-grow', '1']], 'grow-0': [['flex-grow', '0']], shrink: [['flex-shrink', '1']], 'shrink-0': [['flex-shrink', '0']],
    'text-ellipsis': [['text-overflow', 'ellipsis']], 'text-clip': [['text-overflow', 'clip']],
    'text-wrap': [['text-wrap', 'wrap']], 'text-nowrap': [['text-wrap', 'nowrap']], 'text-balance': [['text-wrap', 'balance']], 'text-pretty': [['text-wrap', 'pretty']],
    'decoration-solid': [['text-decoration-style', 'solid']], 'decoration-double': [['text-decoration-style', 'double']],
    'decoration-dotted': [['text-decoration-style', 'dotted']], 'decoration-dashed': [['text-decoration-style', 'dashed']],
    'decoration-wavy': [['text-decoration-style', 'wavy']],
    'decoration-auto': [['text-decoration-thickness', 'auto']], 'decoration-from-font': [['text-decoration-thickness', 'from-font']],
    'underline-offset-auto': [['text-underline-offset', 'auto']],
    'scroll-smooth': [['scroll-behavior', 'smooth']], 'scroll-auto': [['scroll-behavior', 'auto']],
    isolate: [['isolation', 'isolate']], 'isolation-auto': [['isolation', 'auto']],
    'content-none': [['--tw-content', 'none'], ['content', 'none']],
    'outline-dashed': [['outline-style', 'dashed']], 'outline-dotted': [['outline-style', 'dotted']], 'outline-double': [['outline-style', 'double']],
    'break-keep': [['word-break', 'keep-all']],
    'box-decoration-clone': [['box-decoration-break', 'clone']], 'box-decoration-slice': [['box-decoration-break', 'slice']],
    'touch-auto': [['touch-action', 'auto']], 'touch-none': [['touch-action', 'none']], 'touch-pan-x': [['touch-action', 'pan-x']],
    'touch-pan-y': [['touch-action', 'pan-y']], 'touch-manipulation': [['touch-action', 'manipulation']], 'touch-pinch-zoom': [['touch-action', 'pinch-zoom']],
    'will-change-auto': [['will-change', 'auto']], 'will-change-scroll': [['will-change', 'scroll-position']],
    'will-change-contents': [['will-change', 'contents']], 'will-change-transform': [['will-change', 'transform']],
    'line-clamp-none': [['overflow', 'visible'], ['display', 'block'], ['-webkit-box-orient', 'horizontal'], ['-webkit-line-clamp', 'none']],
    'filter-none': [['filter', 'none']], 'backdrop-filter-none': [['backdrop-filter', 'none']],
  };
  if (!negative && simple[name]) return { decls: simple[name] };

  if (!negative && (m = /^size-(.+)$/.exec(name))) {
    const v = spacingOr(m[1], { auto: 'auto', full: '100%', min: 'min-content', max: 'max-content', fit: 'fit-content' });
    return v !== null && v !== undefined ? { decls: [['width', v], ['height', v]] } : null;
  }
  if (!negative && (m = /^basis-(.+)$/.exec(name))) {
    const v = spacingOr(m[1], { auto: 'auto', full: '100%' });
    return v !== null && v !== undefined ? { decls: [['flex-basis', v]] } : null;
  }
  if ((m = /^indent-(.+)$/.exec(name)) && theme.spacing[m[1]] !== undefined) {
    const v = theme.spacing[m[1]];
    return { decls: [['text-indent', negative ? negate(v) : v]] };
  }
  if (!negative && (m = /^underline-offset-(\d+)$/.exec(name)) && WIDTH_SCALE[m[1]]) {
    return { decls: [['text-underline-offset', WIDTH_SCALE[m[1]]]] };
  }
  if (!negative && (m = /^decoration-(\d+)$/.exec(name)) && WIDTH_SCALE[m[1]]) {
    return { decls: [['text-decoration-thickness', WIDTH_SCALE[m[1]]]] };
  }
  if (!negative && (m = /^outline-(\d+)$/.exec(name)) && WIDTH_SCALE[m[1]]) {
    return { decls: [['outline-width', WIDTH_SCALE[m[1]]]] };
  }
  if (!negative && (m = /^outline-offset-(\d+)$/.exec(name)) && WIDTH_SCALE[m[1]]) {
    return { decls: [['outline-offset', WIDTH_SCALE[m[1]]]] };
  }
  if (!negative && (m = /^columns-(.+)$/.exec(name))) {
    if (COLUMNS[m[1]]) return { decls: [['columns', COLUMNS[m[1]]]] };
    if (/^([1-9]|1[0-2])$/.test(m[1])) return { decls: [['columns', m[1]]] };
    return null;
  }
  if (!negative && (m = /^(mix-blend|bg-blend)-(.+)$/.exec(name)) && BLEND_MODES.indexOf(m[2]) !== -1) {
    return { decls: [[m[1] === 'mix-blend' ? 'mix-blend-mode' : 'background-blend-mode', m[2]]] };
  }

  // Filters and backdrop filters, composable like Tailwind 3.
  const filterMatch = /^(backdrop-)?(blur|brightness|contrast|grayscale|hue-rotate|invert|saturate|sepia|drop-shadow|opacity)(?:-(.+))?$/.exec(name);
  if (filterMatch) {
    const backdrop = !!filterMatch[1];
    const kind = filterMatch[2];
    const key = filterMatch[3] || '';
    if (kind === 'opacity' && !backdrop) return null;
    if (kind === 'drop-shadow' && backdrop) return null;
    const scales = {
      blur: BLUR, brightness: BRIGHTNESS, contrast: CONTRAST, grayscale: PERCENT_TOGGLE, invert: PERCENT_TOGGLE,
      sepia: PERCENT_TOGGLE, saturate: SATURATE, 'hue-rotate': HUE_ROTATE, 'drop-shadow': DROP_SHADOW,
      opacity: theme.opacity,
    };
    let value = lookup(scales[kind], key);
    if (value === undefined) return null;
    if (negative) {
      if (kind !== 'hue-rotate') return null;
      value = negate(value);
    }
    if (kind === 'opacity' && backdrop) return filterDecls('opacity', value, true);
    return filterDecls(kind, value, backdrop);
  }

  return null;
}

const COLOR_PREFIX_RE = /^(bg|text|border-x|border-y|border-t|border-r|border-b|border-l|border|divide|placeholder|ring-offset|ring|shadow|from|via|to|fill|stroke|decoration|accent|caret|outline)-(.+)$/;

/** True for a named colour utility (bg-sky-500) or an arbitrary colour one (bg-[#123]). */
function isColorUtility(name, theme) {
  const m = COLOR_PREFIX_RE.exec(name);
  if (!m) return false;
  if (theme.colors[m[2]] !== undefined) return true;
  const arbitrary = /^\[(?:color:)?(.+)\]$/.exec(m[2]);
  return !!arbitrary && (/^\[color:/.test(m[2]) || isColorValue(decodeArbitrary(arbitrary[1])));
}

/**
 * Resolves the utility part of a class (after variants) to declarations.
 * Returns { decls, suffix, needs } or null.
 */
function resolveUtility(utility, baseline, theme) {
  // 1.9 already knows it: reuse its declarations (used when adding variants).
  if (baseline.utilities.has(utility)) {
    return baseline.utilities.get(utility).map(r => ({ decls: r.decls, suffix: r.suffix }));
  }

  // Arbitrary property: [mask-type:luminance]
  let m = /^\[([a-zA-Z-]+):(.+)\]$/.exec(utility);
  if (m) return [{ decls: [[m[1], decodeArbitrary(m[2])]] }];

  let negative = false;
  let name = utility;
  if (name.charAt(0) === '-') { negative = true; name = name.slice(1); }

  // Split an opacity modifier (bg-black/50, bg-[#123]/[.3]) only when the part
  // before the slash is a colour utility, so fractions like basis-1/2 survive.
  let modifier = null;
  let base = name;
  m = /^(.*[^\/])\/(\d+|\[[^\]]+\])$/.exec(name);
  if (m && isColorUtility(m[1], theme)) { base = m[1]; modifier = m[2]; }

  // Arbitrary value: prefix-[value]
  m = /^([a-z][a-z0-9-]*?)-\[(.+)\]$/.exec(base);
  if (m) {
    const prefix = m[1];
    let raw = m[2];
    let hint = null;
    const hinted = /^(length|color|url|number|percentage|image|position|size|family|weight|any):(.+)$/.exec(raw);
    if (hinted) { hint = hinted[1]; raw = hinted[2]; }
    const value = decodeArbitrary(raw);

    if (COLOR_UTILITIES[prefix] || prefix === 'font') {
      const typed = typedArbitrary(prefix, value, hint);
      if (typed === 'color') {
        if (negative) return null;
        const alpha = resolveAlpha(modifier, theme);
        if (modifier !== null && alpha === null) return null;
        const color = value === 'current' ? 'currentColor' : value;
        const res = colorDecls(prefix, color, alpha);
        return res ? [res] : null;
      }
      if (!typed || modifier !== null) return null;
      return [{ decls: typed.map(d => [d[0], negative ? negate(d[1]) : d[1]]) }];
    }

    const handler = ARBITRARY[prefix];
    if (!handler || modifier !== null) return null;
    const out = handler(negative ? negate(value) : value);
    if (Array.isArray(out)) return [{ decls: out }];
    return [out];
  }

  // Named colour: bg-sky-500, text-blue-500/50, ring-rose-400/[.2]
  const colorMatch = COLOR_PREFIX_RE.exec(base);
  if (colorMatch && !negative && theme.colors[colorMatch[2]] !== undefined) {
    const alpha = resolveAlpha(modifier, theme);
    if (modifier !== null && alpha === null) return null;
    const res = colorDecls(colorMatch[1], theme.colors[colorMatch[2]], alpha);
    return res ? [res] : null;
  }

  if (modifier !== null) return null;
  const named = namedUtility(base, negative, theme);
  return named ? [named] : null;
}

// ---------------------------------------------------------------------------
// Class parsing and rule building
// ---------------------------------------------------------------------------

/** Splits `md:hover:!bg-[a:b]` into variants and utility, respecting brackets. */
function splitVariants(token) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < token.length; i++) {
    const c = token[i];
    if (c === '[') depth++;
    if (c === ']') depth--;
    if (c === ':' && depth === 0) { parts.push(current); current = ''; continue; }
    current += c;
  }
  parts.push(current);
  return { variants: parts.slice(0, -1), utility: parts[parts.length - 1] };
}

function buildRule(token, baseline, theme) {
  const split = splitVariants(token);
  if (split.variants.some(v => v === '')) return null;
  let utility = split.utility;
  let important = false;
  if (utility.charAt(0) === '!') { important = true; utility = utility.slice(1); }
  if (!utility) return null;

  // Resolve variants first; an unknown one means this is not a class.
  const media = [];
  const supports = [];
  let mediaRank = 0;
  let print = false;
  const pseudoClasses = [];
  const pseudoElements = [];
  const templates = [];
  let prefix = '';
  for (let i = 0; i < split.variants.length; i++) {
    const v = split.variants[i];
    let m;
    let state;
    if (theme.screens[v]) {
      media.push(`(min-width: ${theme.screens[v]})`);
      mediaRank = Math.max(mediaRank, 1 + theme.screenOrder.indexOf(v));
    } else if (MEDIA_FEATURES[v]) {
      media.push(MEDIA_FEATURES[v]);
      mediaRank = Math.max(mediaRank, 100 + Object.keys(MEDIA_FEATURES).indexOf(v));
    } else if (v === 'print') {
      print = true;
      mediaRank = Math.max(mediaRank, 200);
    } else if ((state = stateSelector(v))) {
      pseudoClasses.push(state);
    } else if (PSEUDO_ELEMENTS[v]) {
      pseudoElements.push(PSEUDO_ELEMENTS[v]);
    } else if ((m = /^(group|peer)-(.+)$/.exec(v)) && (state = stateSelector(m[2]) || arbitraryState(m[2]))) {
      prefix += m[1] === 'group' ? `.group${state} ` : `.peer${state} ~ `;
    } else if ((m = /^supports-\[(.+)\]$/.exec(v))) {
      supports.push(supportsCondition(decodeArbitrary(m[1])));
      mediaRank = Math.max(mediaRank, 300);
    } else if ((m = /^\[(.+)\]$/.exec(v))) {
      // Arbitrary variant: [&>*], [&_p], [.dark_&], [@media(...)], [@supports(...)]
      const inner = decodeArbitrary(m[1]);
      if (/^@media\b/.test(inner)) {
        media.push(inner.replace(/^@media\s*/, ''));
        mediaRank = Math.max(mediaRank, 250);
      } else if (/^@supports\b/.test(inner)) {
        supports.push(inner.replace(/^@supports\s*/, ''));
        mediaRank = Math.max(mediaRank, 300);
      } else if (inner.indexOf('&') !== -1) {
        templates.push(inner);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  const hasAtRule = media.length > 0 || print || supports.length > 0;
  // Plain 1.9 classes are already in index.css. Classes with a media variant
  // are re-emitted so they cascade after everything they should override.
  if (baseline.defined.has(token) && !hasAtRule) return null;

  const resolved = resolveUtility(utility, baseline, theme);
  if (!resolved || resolved.length === 0) return null;

  let selectorBase = `${prefix}.${escapeClass(token)}${pseudoClasses.join('')}`;
  templates.forEach(template => {
    selectorBase = template.replace(/&/g, selectorBase);
  });
  const needs = [];
  const blocks = resolved.map(r => {
    const decls = r.decls.slice();
    if (r.needs) needs.push(r.needs);
    const isBeforeAfter = pseudoElements.some(p => p === '::before' || p === '::after');
    if (isBeforeAfter) {
      needs.push('content');
      if (!decls.some(d => d[0] === 'content')) decls.unshift(['content', 'var(--tw-content)']);
    }
    const body = decls.map(d => `  ${d[0]}: ${d[1]}${important ? ' !important' : ''};`).join('\n');
    return `${selectorBase}${r.suffix || ''}${pseudoElements.join('')} {\n${body}\n}`;
  });

  let query = null;
  if (media.length > 0 || print) query = (print ? ['print'] : []).concat(media).join(' and ');

  return {
    token,
    css: blocks.join('\n'),
    query,
    supports: supports.length > 0 ? supports.join(' and ') : null,
    mediaRank,
    variantCount: split.variants.length,
    declCount: resolved.reduce((n, r) => n + r.decls.length, 0),
    needs,
  };
}

// ---------------------------------------------------------------------------
// Scanning and output
// ---------------------------------------------------------------------------

function walk(dir, out) {
  fs.readdirSync(dir).forEach(name => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.test(name)) out.push(full);
  });
  return out;
}

/**
 * Splits source text into candidate class names. Quotes, `;`, braces and
 * angle brackets separate tokens only outside `[...]`, so `[&>*]:p-2` and
 * `bg-[url('/a.png')]` stay whole; whitespace always separates.
 */
function tokenize(text) {
  const out = [];
  let current = '';
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c) || (depth === 0 && /["'`;{}<>]/.test(c))) {
      if (current) out.push(current);
      current = '';
      depth = 0;
      continue;
    }
    if (c === '[') depth++;
    else if (c === ']' && depth > 0) depth--;
    current += c;
  }
  if (current) out.push(current);
  return out;
}

function scanTokens() {
  const tokens = new Set();
  walk(SRC_DIR, []).forEach(file => {
    tokenize(fs.readFileSync(file, 'utf8')).forEach(t => {
      // Trim JSX/JS punctuation that can cling to a class at the edges.
      const token = t.replace(/^[(,]+/, '').replace(/[),]+$/, '');
      if (token && token.length < 200 && /[a-z]/.test(token)) tokens.add(token);
    });
  });
  return tokens;
}

const BASE_CSS = {
  // Tailwind 3 preflight: before:/after: render an empty box unless content-* says otherwise.
  content: "::before, ::after {\n  --tw-content: '';\n}",
  filter: `*, ::before, ::after {\n${FILTERS.map(f => `  --tw-${f}: ${EMPTY};`).join('\n')}\n}`,
  backdrop: `*, ::before, ::after {\n${BACKDROP_FILTERS.map(f => `  --tw-backdrop-${f}: ${EMPTY};`).join('\n')}\n}`,
};

function render(rules) {
  rules.sort((a, b) =>
    a.mediaRank - b.mediaRank ||
    a.variantCount - b.variantCount ||
    b.declCount - a.declCount ||
    (a.token < b.token ? -1 : a.token > b.token ? 1 : 0));

  const needs = new Set();
  rules.forEach(r => r.needs.forEach(n => needs.add(n)));

  const out = [
    '/* Generated by scripts/tailwind-jit.js. Do not edit: changes are overwritten. */',
    '/* Tailwind 3 classes that the installed Tailwind 1.9 cannot generate. */',
  ];
  needs.forEach(n => out.push(BASE_CSS[n]));

  // Consecutive rules sharing the same @supports/@media wrappers share one block.
  let open = null;
  let depth = 0;
  rules.forEach(r => {
    const key = `${r.supports || ''}|${r.query || ''}`;
    if (key !== open) {
      for (; depth > 0; depth--) out.push('}');
      if (r.supports) { out.push(`@supports ${r.supports} {`); depth++; }
      if (r.query) { out.push(`@media ${r.query} {`); depth++; }
      open = key;
    }
    out.push(r.css);
  });
  for (; depth > 0; depth--) out.push('}');
  return out.join('\n') + '\n';
}

function generate(baseline, theme) {
  const rules = [];
  scanTokens().forEach(token => {
    const rule = buildRule(token, baseline, theme);
    if (rule) rules.push(rule);
  });
  const css = render(rules);
  const previous = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  if (css !== previous) fs.writeFileSync(OUT_FILE, css);
  return { count: rules.length, changed: css !== previous };
}

function log(message) {
  console.log(`[tailwind-jit] ${message}`);
}

function run() {
  const started = Date.now();
  // Inside the promise chain, so a broken tailwind.config.js (a typo, or a save
  // caught mid-edit) rejects instead of throwing out of a watch timer and
  // killing the dev server that hosts the watcher.
  return Promise.resolve().then(() => {
    const theme = loadTheme();
    return buildBaseline().then(baseline => {
      const result = generate(baseline, theme);
      log(`${result.count} on-demand classes${result.changed ? ' written to' : ', unchanged in'} src/tailwind-jit.css (${Date.now() - started}ms)`);
      return { baseline, theme };
    });
  });
}

/** Regenerates whenever a source file or the Tailwind config changes. */
function watch() {
  let state = null;
  let timer = null;
  let configChanged = false;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const refresh = configChanged || !state
        ? run()
        : Promise.resolve(state).then(s => {
          const result = generate(s.baseline, s.theme);
          if (result.changed) log(`${result.count} on-demand classes written to src/tailwind-jit.css`);
          return s;
        });
      configChanged = false;
      refresh.then(s => { state = s; }).catch(err => log(`failed: ${err.message}`));
    }, 150);
  };

  run().then(s => { state = s; }).catch(err => log(`failed: ${err.message}`));

  fs.watch(SRC_DIR, { recursive: true }, (event, file) => {
    if (!file) return;
    const full = path.join(SRC_DIR, file);
    if (full === OUT_FILE || !SOURCE_EXT.test(file)) return;
    schedule();
  });
  fs.watch(CONFIG_FILE, () => { configChanged = true; schedule(); });
  log('watching src/ for class changes');
}

module.exports = { run, watch, buildRule, resolveUtility, loadTheme, buildBaseline, render, tokenize };

if (require.main === module) {
  if (process.argv.indexOf('--watch') !== -1) {
    watch();
  } else {
    run().catch(err => {
      console.error('[tailwind-jit] failed:', err);
      process.exit(1);
    });
  }
}
