#!/usr/bin/env node
/**
 * Generates the data and preview CSS for this Tailwind documentation site
 * from the project's real setup, so the site always matches what the
 * frontend actually produces:
 *
 *   - frontend/tailwind.config.js (resolved with Tailwind 1.9's defaults),
 *   - Tailwind 1.9's real output for it (every utility and its CSS),
 *   - Tailwind 1.9's stock output (to mark what this project adds),
 *   - frontend/tailwind.palette.js (Tailwind 4 colours, OKLCH source + hex),
 *   - frontend/scripts/tailwind-jit.js (the on-demand compiler) for every
 *     new-syntax example and for the preview stylesheet.
 *
 * Run with Node 12.1.0 (the project's version) from anywhere:
 *   npm run docs:tailwind            (from frontend/)
 *   node docs/tailwind/generate.js   (the same, directly)
 *
 * Writes assets/data.js and assets/preview.css. index.html, assets/app.js and
 * assets/site.css are hand-written and not touched.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const DOC_DIR = __dirname;
const FRONTEND = path.join(DOC_DIR, '..', '..'); // docs/tailwind -> frontend
const fromFrontend = m => require(require.resolve(m, { paths: [FRONTEND] }));

const jit = require(path.join(FRONTEND, 'scripts', 'tailwind-jit.js'));
const palette = require(path.join(FRONTEND, 'tailwind.palette.js'));
const projectConfig = require(path.join(FRONTEND, 'tailwind.config.js'));
const tailwind = fromFrontend('tailwindcss');
const resolveConfig = fromFrontend('tailwindcss/resolveConfig');
const tailwindPkg = fromFrontend('tailwindcss/package.json');
const postcss = require(require.resolve('postcss', { paths: [path.dirname(require.resolve('tailwindcss', { paths: [FRONTEND] }))] }));

// ---------------------------------------------------------------------------
// Page taxonomy (mirrors the Tailwind docs)
// ---------------------------------------------------------------------------

/** [section, [[page title, variants key, preview kind, description]]] */
const SECTIONS = [
  ['Layout', [
    ['Container', 'container', null, 'A component for fixing an element\'s width to the current breakpoint.'],
    ['Box Sizing', 'boxSizing', null, 'Utilities for controlling how the browser should calculate an element\'s total size.'],
    ['Display', 'display', null, 'Utilities for controlling the display box type of an element.'],
    ['Floats', 'float', null, 'Utilities for controlling the wrapping of content around an element.'],
    ['Clear', 'clear', null, 'Utilities for controlling the wrapping of content around an element.'],
    ['Object Fit', 'objectFit', null, 'Utilities for controlling how a replaced element\'s content should be resized.'],
    ['Object Position', 'objectPosition', null, 'Utilities for controlling how a replaced element\'s content should be positioned within its container.'],
    ['Overflow', 'overflow', null, 'Utilities for controlling how an element handles content that is too large for the container. Includes the backfilled `overflow-clip`.'],
    ['Overscroll Behavior', 'overscrollBehavior', null, 'Utilities for controlling how the browser behaves when reaching the boundary of a scrolling area.'],
    ['Position', 'position', null, 'Utilities for controlling how an element is positioned in the DOM.'],
    ['Top / Right / Bottom / Left', 'inset', null, 'Utilities for controlling the placement of positioned elements. The spacing scale, `1/2` and `full` are backfilled from Tailwind 2.'],
    ['Visibility', 'visibility', null, 'Utilities for controlling the visibility of an element.'],
    ['Z-Index', 'zIndex', null, 'Utilities for controlling the stack order of an element.'],
  ]],
  ['Flexbox & Grid', [
    ['Flex Direction', 'flexDirection', null, 'Utilities for controlling the direction of flex items.'],
    ['Flex Wrap', 'flexWrap', null, 'Utilities for controlling how flex items wrap.'],
    ['Flex', 'flex', null, 'Utilities for controlling how flex items both grow and shrink.'],
    ['Flex Grow', 'flexGrow', null, 'Utilities for controlling how flex items grow. Tailwind 3\'s shorter `grow` / `grow-0` also work, through the compiler.'],
    ['Flex Shrink', 'flexShrink', null, 'Utilities for controlling how flex items shrink. Tailwind 3\'s shorter `shrink` / `shrink-0` also work, through the compiler.'],
    ['Order', 'order', null, 'Utilities for controlling the order of flex and grid items.'],
    ['Grid Template Columns', 'gridTemplateColumns', null, 'Utilities for specifying the columns in a grid layout.'],
    ['Grid Column Start / End', 'gridColumn', null, 'Utilities for controlling how elements are sized and placed across grid columns.'],
    ['Grid Template Rows', 'gridTemplateRows', null, 'Utilities for specifying the rows in a grid layout.'],
    ['Grid Row Start / End', 'gridRow', null, 'Utilities for controlling how elements are sized and placed across grid rows.'],
    ['Grid Auto Flow', 'gridAutoFlow', null, 'Utilities for controlling how elements in a grid are auto-placed.'],
    ['Grid Auto Columns', 'gridAutoColumns', null, 'Utilities for controlling the size of implicitly-created grid columns.'],
    ['Grid Auto Rows', 'gridAutoRows', null, 'Utilities for controlling the size of implicitly-created grid rows.'],
    ['Gap', 'gap', null, 'Utilities for controlling gutters between grid rows and columns.'],
    ['Justify Content', 'justifyContent', null, 'Utilities for controlling how flex and grid items are positioned along a container\'s main axis.'],
    ['Justify Items', 'justifyItems', null, 'Utilities for controlling how grid items are aligned along their inline axis.'],
    ['Justify Self', 'justifySelf', null, 'Utilities for controlling how an individual grid item is aligned along its inline axis.'],
    ['Align Content', 'alignContent', null, 'Utilities for controlling how rows are positioned in multi-row flex and grid containers.'],
    ['Align Items', 'alignItems', null, 'Utilities for controlling how flex and grid items are positioned along a container\'s cross axis.'],
    ['Align Self', 'alignSelf', null, 'Utilities for controlling how an individual flex or grid item is positioned along its container\'s cross axis.'],
    ['Place Content', 'placeContent', null, 'Utilities for controlling how content is justified and aligned at the same time.'],
    ['Place Items', 'placeItems', null, 'Utilities for controlling how items are justified and aligned at the same time.'],
    ['Place Self', 'placeSelf', null, 'Utilities for controlling how an individual item is justified and aligned at the same time.'],
  ]],
  ['Spacing', [
    ['Padding', 'padding', 'padding', 'Utilities for controlling an element\'s padding. The half steps `0.5`, `1.5`, `2.5` and `3.5` are backfilled from Tailwind 2.'],
    ['Margin', 'margin', 'margin', 'Utilities for controlling an element\'s margin, including negative margins.'],
    ['Space Between', 'space', null, 'Utilities for controlling the space between child elements.'],
  ]],
  ['Sizing', [
    ['Width', 'width', 'width', 'Utilities for setting the width of an element. `fit`, `min`, `max` and the viewport units `svw` / `lvw` / `dvw` are backfilled from Tailwind 3.'],
    ['Min-Width', 'minWidth', null, 'Utilities for setting the minimum width of an element, on the spacing scale plus intrinsic sizes.'],
    ['Max-Width', 'maxWidth', null, 'Utilities for setting the maximum width of an element. `7xl`, `prose` and intrinsic sizes are backfilled.'],
    ['Height', 'height', null, 'Utilities for setting the height of an element, including `fit` and the viewport units `svh` / `lvh` / `dvh`.'],
    ['Min-Height', 'minHeight', null, 'Utilities for setting the minimum height of an element, on the spacing scale plus intrinsic and viewport sizes.'],
    ['Max-Height', 'maxHeight', null, 'Utilities for setting the maximum height of an element, on the spacing scale plus intrinsic and viewport sizes.'],
  ]],
  ['Typography', [
    ['Font Family', 'fontFamily', 'text', 'Utilities for controlling the font family of an element.'],
    ['Font Size', 'fontSize', 'text', 'Utilities for controlling the font size of an element. `7xl`–`9xl` are backfilled.'],
    ['Font Smoothing', 'fontSmoothing', null, 'Utilities for controlling the font smoothing of an element.'],
    ['Font Style', 'fontStyle', 'text', 'Utilities for controlling the style of text.'],
    ['Font Weight', 'fontWeight', 'text', 'Utilities for controlling the font weight of an element.'],
    ['Font Variant Numeric', 'fontVariantNumeric', null, 'Utilities for controlling the variant of numbers.'],
    ['Letter Spacing', 'letterSpacing', 'text', 'Utilities for controlling the tracking (letter spacing) of an element.'],
    ['Line Height', 'lineHeight', null, 'Utilities for controlling the leading (line height) of an element.'],
    ['List Style', 'listStyleType', null, 'Utilities for controlling the bullet style and position of a list.'],
    ['Placeholder Color', 'placeholderColor', 'color', 'Utilities for controlling the color of placeholder text. Inputs without one use the palette\'s `gray-400`.'],
    ['Placeholder Opacity', 'placeholderOpacity', null, 'Utilities for controlling the opacity of an element\'s placeholder color.'],
    ['Text Align', 'textAlign', null, 'Utilities for controlling the alignment of text.'],
    ['Text Color', 'textColor', 'color', 'Utilities for controlling the text color of an element.'],
    ['Text Opacity', 'textOpacity', null, 'Utilities for controlling the opacity of an element\'s text color. With the compiler you can also write `text-blue-500/50`.'],
    ['Text Decoration', 'textDecoration', 'text', 'Utilities for controlling the decoration of text.'],
    ['Text Transform', 'textTransform', 'text', 'Utilities for controlling the transformation of text.'],
    ['Text Overflow', 'textOverflow', null, 'Utilities for controlling text that overflows an element. Tailwind 3\'s `text-ellipsis` / `text-clip` also work, through the compiler.'],
    ['Line Clamp', 'lineClamp', null, 'Utilities for clamping text to a specific number of lines (backfilled from Tailwind 3).'],
    ['Vertical Align', 'verticalAlign', null, 'Utilities for controlling the vertical alignment of an inline or table-cell box.'],
    ['Whitespace', 'whitespace', null, 'Utilities for controlling an element\'s white-space property. `whitespace-nowrap` (Tailwind 2\'s spelling) is backfilled next to 1.9\'s `whitespace-no-wrap`.'],
    ['Word Break', 'wordBreak', null, 'Utilities for controlling word breaks in an element.'],
  ]],
  ['Backgrounds', [
    ['Background Attachment', 'backgroundAttachment', null, 'Utilities for controlling how a background image behaves when scrolling.'],
    ['Background Clip', 'backgroundClip', null, 'Utilities for controlling the bounding box of an element\'s background.'],
    ['Background Color', 'backgroundColor', 'color', 'Utilities for controlling an element\'s background color, using the Tailwind 4 palette.'],
    ['Background Opacity', 'backgroundOpacity', null, 'Utilities for controlling the opacity of an element\'s background color. With the compiler you can also write `bg-blue-500/50`.'],
    ['Background Position', 'backgroundPosition', null, 'Utilities for controlling the position of an element\'s background image.'],
    ['Background Repeat', 'backgroundRepeat', null, 'Utilities for controlling the repetition of an element\'s background image.'],
    ['Background Size', 'backgroundSize', null, 'Utilities for controlling the background size of an element\'s background image.'],
    ['Background Image', 'backgroundImage', 'gradient', 'Utilities for controlling an element\'s background image. The gradients use Tailwind 3\'s `--tw-gradient-stops`.'],
    ['Gradient Color Stops', 'gradientColorStops', 'color', 'Utilities for controlling the color stops in background gradients. Replaced plugin: stop positions (`from-10%`, `via-30%`, `to-90%`) work as in Tailwind 3.3.'],
  ]],
  ['Borders', [
    ['Border Radius', 'borderRadius', 'radius', 'Utilities for controlling the border radius of an element, including the logical corners `rounded-s/e/ss/se/es/ee` (backfilled).'],
    ['Border Width', 'borderWidth', null, 'Utilities for controlling the width of an element\'s borders, including `border-x/y/s/e` (backfilled).'],
    ['Border Color', 'borderColor', 'color', 'Utilities for controlling the color of an element\'s borders. The default border color is the palette\'s `gray-200`, as in Tailwind 3.'],
    ['Border Opacity', 'borderOpacity', null, 'Utilities for controlling the opacity of an element\'s border color.'],
    ['Border Style', 'borderStyle', null, 'Utilities for controlling the style of an element\'s borders.'],
    ['Divide Width', 'divideWidth', null, 'Utilities for controlling the border width between elements.'],
    ['Divide Color', 'divideColor', 'color', 'Utilities for controlling the border color between elements.'],
    ['Divide Opacity', 'divideOpacity', null, 'Utilities for controlling the opacity of borders between elements.'],
    ['Divide Style', 'divideStyle', null, 'Utilities for controlling the border style between elements.'],
    ['Ring Width', 'ring', 'ring', 'Utilities for creating outline rings with box-shadows (backfilled from Tailwind 2). Rings stack with shadows.'],
    ['Ring Color', 'ring', 'color', 'Utilities for setting the color of outline rings.'],
    ['Ring Opacity', 'ring', null, 'Utilities for setting the opacity of outline rings.'],
    ['Ring Offset Width', 'ring', null, 'Utilities for simulating an offset when adding outline rings.'],
    ['Ring Offset Color', 'ring', 'color', 'Utilities for setting the color of outline ring offsets.'],
  ]],
  ['Effects', [
    ['Box Shadow', 'boxShadow', 'shadow', 'Utilities for controlling the box shadow of an element. Replaced plugin: shadows compose with rings through `--tw-shadow`, as in Tailwind 3.'],
    ['Box Shadow Color', 'boxShadow', 'color', 'Utilities for controlling the color of a box shadow (Tailwind 3). Combine with a size: `shadow-lg shadow-blue-500`; with the compiler, `shadow-blue-500/50`.'],
    ['Opacity', 'opacity', 'opacity', 'Utilities for controlling the opacity of an element. The steps 5, 10, 20 … 95 are backfilled.'],
  ]],
  ['Tables', [
    ['Border Collapse', 'borderCollapse', null, 'Utilities for controlling whether table borders should collapse or be separated.'],
    ['Table Layout', 'tableLayout', null, 'Utilities for controlling the table layout algorithm.'],
  ]],
  ['Transitions & Animation', [
    ['Transition Property', 'transitionProperty', null, 'Utilities for controlling which CSS properties transition.'],
    ['Transition Duration', 'transitionDuration', null, 'Utilities for controlling the duration of CSS transitions.'],
    ['Transition Timing Function', 'transitionTimingFunction', null, 'Utilities for controlling the easing of CSS transitions.'],
    ['Transition Delay', 'transitionDelay', null, 'Utilities for controlling the delay of CSS transitions.'],
    ['Animation', 'animation', 'animate', 'Utilities for animating elements with CSS animations.'],
  ]],
  ['Transforms', [
    ['Transform', 'transform', null, 'The `transform` class still works, but is no longer needed: in this project every transform utility applies the transform itself, as in Tailwind 3.'],
    ['Transform Origin', 'transformOrigin', null, 'Utilities for specifying the origin for an element\'s transformations.'],
    ['Scale', 'scale', 'transform', 'Utilities for scaling elements with transform. Replaced plugin: works without the `transform` class.'],
    ['Rotate', 'rotate', 'transform', 'Utilities for rotating elements with transform. Replaced plugin: works without the `transform` class.'],
    ['Translate', 'translate', 'transform', 'Utilities for translating elements with transform. Replaced plugin: works without the `transform` class.'],
    ['Skew', 'skew', 'transform', 'Utilities for skewing elements with transform. Replaced plugin: works without the `transform` class.'],
  ]],
  ['Interactivity', [
    ['Appearance', 'appearance', null, 'Utilities for suppressing native form control styling.'],
    ['Cursor', 'cursor', null, 'Utilities for controlling the cursor style when hovering over an element.'],
    ['Outline', 'outline', null, 'Utilities for controlling an element\'s outline. With the compiler: `outline-2`, `outline-offset-2`, `outline-blue-500`.'],
    ['Pointer Events', 'pointerEvents', null, 'Utilities for controlling whether an element responds to pointer events.'],
    ['Resize', 'resize', null, 'Utilities for controlling how an element can be resized.'],
    ['User Select', 'userSelect', null, 'Utilities for controlling whether the user can select text in an element.'],
    ['Scrolling', 'overflow', null, 'Utilities for controlling touch scrolling on iOS (`scrolling-touch` / `scrolling-auto`).'],
  ]],
  ['SVG', [
    ['Fill', 'fill', null, 'Utilities for styling the fill of SVG elements. With the compiler, any palette colour: `fill-blue-500`.'],
    ['Stroke', 'stroke', null, 'Utilities for styling the stroke of SVG elements. With the compiler, any palette colour: `stroke-blue-500`.'],
    ['Stroke Width', 'strokeWidth', null, 'Utilities for styling the stroke width of SVG elements.'],
  ]],
  ['Accessibility', [
    ['Screen Readers', 'accessibility', null, 'Utilities for improving accessibility with screen readers.'],
  ]],
];

const slugify = title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ---------------------------------------------------------------------------
// Classifying a utility onto a page, by the CSS it sets
// ---------------------------------------------------------------------------

const PROPERTY_PAGE = {
  'box-sizing': 'Box Sizing', display: 'Display', float: 'Floats', clear: 'Clear',
  'object-fit': 'Object Fit', 'object-position': 'Object Position',
  overflow: 'Overflow', 'overflow-x': 'Overflow', 'overflow-y': 'Overflow',
  'overscroll-behavior': 'Overscroll Behavior', 'overscroll-behavior-x': 'Overscroll Behavior', 'overscroll-behavior-y': 'Overscroll Behavior',
  position: 'Position', top: 'Top / Right / Bottom / Left', right: 'Top / Right / Bottom / Left',
  bottom: 'Top / Right / Bottom / Left', left: 'Top / Right / Bottom / Left',
  visibility: 'Visibility', 'z-index': 'Z-Index',
  'flex-direction': 'Flex Direction', 'flex-wrap': 'Flex Wrap', flex: 'Flex', 'flex-grow': 'Flex Grow', 'flex-shrink': 'Flex Shrink',
  order: 'Order', 'grid-template-columns': 'Grid Template Columns', 'grid-column': 'Grid Column Start / End',
  'grid-column-start': 'Grid Column Start / End', 'grid-column-end': 'Grid Column Start / End',
  'grid-template-rows': 'Grid Template Rows', 'grid-row': 'Grid Row Start / End', 'grid-row-start': 'Grid Row Start / End',
  'grid-row-end': 'Grid Row Start / End', 'grid-auto-flow': 'Grid Auto Flow', 'grid-auto-columns': 'Grid Auto Columns',
  'grid-auto-rows': 'Grid Auto Rows', 'grid-gap': 'Gap', 'grid-column-gap': 'Gap', 'grid-row-gap': 'Gap', gap: 'Gap',
  'column-gap': 'Gap', 'row-gap': 'Gap',
  'justify-content': 'Justify Content', 'justify-items': 'Justify Items', 'justify-self': 'Justify Self',
  'align-content': 'Align Content', 'align-items': 'Align Items', 'align-self': 'Align Self',
  'place-content': 'Place Content', 'place-items': 'Place Items', 'place-self': 'Place Self',
  padding: 'Padding', 'padding-top': 'Padding', 'padding-right': 'Padding', 'padding-bottom': 'Padding', 'padding-left': 'Padding',
  margin: 'Margin', 'margin-top': 'Margin', 'margin-right': 'Margin', 'margin-bottom': 'Margin', 'margin-left': 'Margin',
  width: 'Width', 'min-width': 'Min-Width', 'max-width': 'Max-Width', height: 'Height', 'min-height': 'Min-Height', 'max-height': 'Max-Height',
  'font-variant-numeric': 'Font Variant Numeric',
  'font-family': 'Font Family', 'font-size': 'Font Size', '-webkit-font-smoothing': 'Font Smoothing', 'font-style': 'Font Style',
  'font-weight': 'Font Weight', 'letter-spacing': 'Letter Spacing', 'line-height': 'Line Height',
  'list-style-type': 'List Style', 'list-style-position': 'List Style', 'text-align': 'Text Align', color: 'Text Color',
  'text-decoration': 'Text Decoration', 'text-transform': 'Text Transform', 'vertical-align': 'Vertical Align',
  'white-space': 'Whitespace', 'word-wrap': 'Word Break', 'word-break': 'Word Break', 'overflow-wrap': 'Word Break',
  'background-attachment': 'Background Attachment', 'background-clip': 'Background Clip', 'background-color': 'Background Color',
  'background-position': 'Background Position', 'background-repeat': 'Background Repeat', 'background-size': 'Background Size',
  'background-image': 'Background Image', 'border-radius': 'Border Radius', 'border-style': 'Border Style', 'border-color': 'Border Color',
  'border-collapse': 'Border Collapse', 'table-layout': 'Table Layout', 'box-shadow': 'Box Shadow', opacity: 'Opacity',
  'transition-property': 'Transition Property', 'transition-duration': 'Transition Duration',
  'transition-timing-function': 'Transition Timing Function', 'transition-delay': 'Transition Delay', animation: 'Animation',
  transform: 'Transform', 'transform-origin': 'Transform Origin', appearance: 'Appearance', cursor: 'Cursor', outline: 'Outline',
  'pointer-events': 'Pointer Events', resize: 'Resize', 'user-select': 'User Select', '-webkit-overflow-scrolling': 'Scrolling',
  fill: 'Fill', stroke: 'Stroke', 'stroke-width': 'Stroke Width',
};

function classify(name, decls) {
  const n = name.replace(/^-/, '');
  // Name-based first: classes whose first property says little about them.
  if (/^(sr-only|not-sr-only)$/.test(n)) return 'Screen Readers';
  if (n === 'container') return 'Container';
  if (n === 'truncate') return 'Text Overflow';
  if (/^line-clamp-/.test(n)) return 'Line Clamp';
  if (n === 'clearfix') return 'Floats';
  if (/^placeholder-/.test(n) && !/^placeholder-opacity-/.test(n)) return 'Placeholder Color';
  if (/^divide-(solid|dashed|dotted|double|none)$/.test(n)) return 'Divide Style';

  const custom = decls.filter(d => d[0].indexOf('--') === 0).map(d => d[0]);
  const real = decls.filter(d => d[0].indexOf('--') !== 0).map(d => d[0]);
  const first = decls.length ? decls[0][0] : null;

  if (first && first.indexOf('--') === 0) {
    if (first === '--bg-opacity') return /^bg-opacity-/.test(n) ? 'Background Opacity' : 'Background Color';
    if (first === '--text-opacity') return /^text-opacity-/.test(n) ? 'Text Opacity' : 'Text Color';
    if (first === '--border-opacity') return /^border-opacity-/.test(n) ? 'Border Opacity' : 'Border Color';
    if (first === '--divide-opacity') return /^divide-opacity-/.test(n) ? 'Divide Opacity' : 'Divide Color';
    if (first === '--placeholder-opacity') return /^placeholder-opacity-/.test(n) ? 'Placeholder Opacity' : 'Placeholder Color';
    if (/^--divide-[xy]-reverse$/.test(first)) return 'Divide Width';
    if (/^--space-[xy]-reverse$/.test(first)) return 'Space Between';
    if (/^--tw-gradient-/.test(first)) return 'Gradient Color Stops';
    if (first === '--tw-shadow') return 'Box Shadow';
    if (first === '--tw-shadow-color') return 'Box Shadow Color';
    if (/^ring-opacity-/.test(n)) return 'Ring Opacity';
    if (first === '--tw-ring-offset-color') return 'Ring Offset Color';
    if (first === '--tw-ring-offset-width') return 'Ring Offset Width';
    if (first === '--tw-ring-offset-shadow' || first === '--tw-ring-inset') return 'Ring Width';
    if (first === '--tw-ring-opacity' || first === '--tw-ring-color') return 'Ring Color';
    if (/^--font-variant-numeric/.test(first) || custom.some(c => /^--font-variant-numeric/.test(c))) return 'Font Variant Numeric';
    if (/^--transform-scale/.test(first)) return 'Scale';
    if (/^--transform-rotate/.test(first)) return 'Rotate';
    if (/^--transform-translate/.test(first)) return n === 'transform' ? 'Transform' : 'Translate';
    if (/^--transform-skew/.test(first)) return 'Skew';
  }
  // Truncate-like and line-clamp-like rules start with overflow; handled above.
  if (real.length && PROPERTY_PAGE[real[0]]) return PROPERTY_PAGE[real[0]];
  if (real.length && /^border-.*radius$/.test(real[0])) return 'Border Radius';
  if (real.length && /^border-.*width$/.test(real[0])) return 'Border Width';
  if (real.length && /^border-.*color$/.test(real[0])) return 'Border Color';
  if (real.length && real[0] === 'text-overflow') return 'Text Overflow';
  return null;
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildCss(config, input) {
  return postcss([tailwind(config)]).process(input, { from: undefined }).then(r => r.css);
}

function classesOf(css) {
  const set = new Set();
  const re = /\.((?:\\.|[a-zA-Z0-9_-])+)/g;
  let m;
  while ((m = re.exec(css))) set.add(m[1].replace(/\\(.)/g, '$1'));
  return set;
}

const declText = decls => decls.map(d => `${d[0]}: ${d[1]};`).join('\n');

function firstHex(decls) {
  for (let i = 0; i < decls.length; i++) {
    const m = /#[0-9a-fA-F]{3,8}\b/.exec(decls[i][1]);
    if (m) return m[0];
  }
  return null;
}

// ---------------------------------------------------------------------------
// New-syntax pages (all examples compiled by the project's own compiler)
// ---------------------------------------------------------------------------

const NEW_SYNTAX = [
  {
    title: 'Arbitrary Values',
    intro: 'Put any CSS value in square brackets after a utility prefix. Use `_` for spaces; operators inside `calc()` are spaced for you.',
    examples: [
      ['w-[250px]', 'size'], ['h-[calc(100vh-4rem)]', null], ['top-[117px]', null], ['-mt-[3px]', null],
      ['grid-cols-[1fr_2fr_1fr]', null], ['p-[calc(var(--gap)*2)]', null], ['text-[13px]', 'text'], ['text-[#be123c]', 'text'],
      ['bg-[#1da1f2]', 'swatch'], ["bg-[url('/img/hero.png')]", null], ['bg-[length:200px_100px]', null],
      ['border-[3px]', 'border'], ['rounded-[10px]', 'radius'], ['shadow-[0_8px_24px_rgba(0,0,0,0.25)]', 'shadow'],
      ['ring-[3px]', 'ring'], ['z-[60]', null], ['aspect-[4/3]', null], ['font-[650]', 'text'], ['rotate-[17deg]', 'transform'],
      ['from-[20px]', null], ['space-y-[7px]', null], ["content-['→']", null],
    ],
  },
  {
    title: 'Arbitrary Properties',
    intro: 'For CSS that has no utility at all, write the whole declaration in brackets.',
    examples: [['[mask-type:luminance]', null], ['[text-wrap:balance]', null], ['[scrollbar-width:thin]', null]],
  },
  {
    title: 'Opacity Modifiers',
    intro: 'Add `/<opacity>` to any colour utility: a number from the opacity scale, any whole percentage, or an arbitrary value in brackets. Works for hex colours (the whole palette is hex).',
    examples: [
      ['bg-blue-500/50', 'swatch'], ['bg-black/25', 'swatch'], ['text-rose-600/75', 'text'], ['border-emerald-500/40', 'border'],
      ['bg-sky-500/[.35]', 'swatch'], ['ring-violet-500/60', 'ring'], ['shadow-blue-500/50', 'shadow'],
      ['from-emerald-500/20', null], ['bg-[#11223380]', 'swatch'],
    ],
  },
  {
    title: 'Tailwind 3 Utilities',
    intro: 'Utilities that Tailwind 1.9 never had, compiled on demand.',
    examples: [
      ['size-10', 'size'], ['aspect-video', null], ['aspect-square', null], ['grow', null], ['shrink-0', null], ['basis-1/2', null],
      ['text-ellipsis', null], ['text-balance', null], ['decoration-2', 'text'], ['decoration-wavy', 'text'],
      ['decoration-rose-500', 'text'], ['underline-offset-4', 'text'], ['indent-4', null], ['accent-violet-600', null],
      ['caret-rose-500', null], ['fill-sky-500', null], ['stroke-emerald-600', null], ['outline-2', null], ['outline-offset-2', null],
      ['columns-3', null], ['mix-blend-multiply', null], ['blur-sm', 'box'], ['brightness-125', 'box'], ['grayscale', 'box'],
      ['drop-shadow-md', 'box'], ['hue-rotate-90', 'box'], ['backdrop-blur', null], ['scroll-smooth', null], ['touch-none', null],
      ['isolate', null], ['will-change-transform', null], ['bg-taupe-500', 'swatch'], ['text-mist-700', 'text'],
    ],
  },
  {
    title: 'Variants',
    intro: 'Every variant below works on every utility — Tailwind 1.9 classes included — because the compiler builds the variant from the utility\'s CSS. Stack them freely: `md:hover:bg-sky-600`.',
    examples: [
      ['2xl:p-8', null], ['dark:bg-slate-900', null], ['print:hidden', null], ['motion-reduce:transition-none', null],
      ['active:bg-blue-700', null], ['focus-visible:ring-2', null], ['disabled:opacity-50', null], ['first:pt-0', null],
      ['odd:bg-gray-50', null], ['group-hover:text-white', null], ['group-focus:underline', null], ['peer-checked:bg-blue-500', null],
      ['aria-selected:bg-blue-500', null], ['aria-[sort=ascending]:underline', null], ['data-[state=open]:block', null],
      ['group-aria-expanded:rotate-180', null], ['group-[.is-open]:block', null], ['supports-[display:grid]:grid', null],
      ['before:content-[\'\']', null], ['after:absolute', null], ['placeholder:text-gray-400', null], ['selection:bg-sky-200', null],
      ['[&>*]:p-2', null], ['[&_p]:mt-4', null], ['[.dark_&]:text-white', null], ['[@media(min-width:900px)]:flex', null],
      ['lg:hover:bg-sky-600', null], ['!mt-4', null], ['md:!hidden', null],
    ],
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const started = Date.now();
  const resolved = resolveConfig(projectConfig);
  const theme = jit.loadTheme();

  return Promise.all([
    jit.buildBaseline(),
    // Stock Tailwind 1.9, to mark additions. Not `{}`: given an empty object,
    // 1.9 falls back to ./tailwind.config.js in the working directory — which,
    // run from frontend/, is the project's own config.
    buildCss({ theme: {} }, '@tailwind utilities;'),
    buildCss(path.join(FRONTEND, 'tailwind.config.js'), '@tailwind base;'),
  ]).then(([baseline, stockCss, baseCss]) => {
    const stock = classesOf(stockCss);

    // Pages
    const pages = new Map();
    SECTIONS.forEach(([section, list]) => list.forEach(([title, variantsKey, preview, description]) => {
      pages.set(title, { section, title, slug: slugify(title), variantsKey, preview, description, utilities: [] });
    }));
    const other = { section: 'Other', title: 'Other', slug: 'other', variantsKey: null, preview: null, description: 'Utilities not covered by another page.', utilities: [] };

    const previewTokens = new Set();
    baseline.utilities.forEach((rules, name) => {
      if (name.indexOf(':') !== -1) return; // variants are documented, not listed
      const decls = rules[0].decls;
      const pageTitle = classify(name, decls);
      const page = pageTitle && pages.has(pageTitle) ? pages.get(pageTitle) : other;
      // A class can have several rules (overflow-clip: 1.9's text-overflow and
      // the backfilled overflow); show them all.
      const css = rules.map(r => (r.suffix ? `/* ${r.suffix.trim()} */\n` : '') + declText(r.decls)).join('\n');
      page.utilities.push({
        c: name,
        css,
        n: stock.has(name) ? 0 : 1,
        hex: /color|Color/.test(page.title) || page.preview === 'color' ? firstHex(decls) : null,
      });
      if (page.preview && page.preview !== 'color') previewTokens.add(name);
    });

    // Background-image previews draw each gradient direction between two stops.
    previewTokens.add('from-sky-400');
    previewTokens.add('to-violet-500');

    // Tailwind order within each page (1.9's own).
    const orderOf = c => (baseline.order.has(c) ? baseline.order.get(c) : 0);
    pages.forEach(p => p.utilities.sort((a, b) => orderOf(a.c) - orderOf(b.c)));

    const variantsConfig = resolved.variants || {};
    const sections = SECTIONS.map(([section, list]) => ({
      title: section,
      pages: list.map(([title]) => {
        const p = pages.get(title);
        return {
          slug: p.slug, title: p.title, preview: p.preview, description: p.description,
          variants: p.variantsKey && variantsConfig[p.variantsKey] ? variantsConfig[p.variantsKey] : [],
          utilities: p.utilities,
        };
      }).filter(p => p.utilities.length > 0),
    }));
    if (other.utilities.length > 0) sections.push({ title: 'Other', pages: [other] });

    // New syntax, compiled by the real compiler.
    const newSyntax = NEW_SYNTAX.map(group => ({
      slug: slugify(group.title),
      title: group.title,
      intro: group.intro,
      examples: group.examples.map(([token, preview]) => {
        const r = jit.buildRule(token, baseline, theme);
        if (!r) throw new Error(`The compiler produced nothing for example "${token}"`);
        previewTokens.add(token);
        const wrap = [r.supports ? `@supports ${r.supports}` : null, r.query ? `@media ${r.query}` : null].filter(Boolean);
        return { c: token, css: (wrap.length ? `/* ${wrap.join(' / ')} */\n` : '') + r.css.trim(), preview };
      }),
    }));

    // Palette with its OKLCH source.
    const paletteFamilies = Object.keys(palette.OKLCH).map(name => ({
      name,
      shades: Object.keys(palette.OKLCH[name]).map(shade => ({ shade, hex: palette.colors[name][shade], oklch: palette.OKLCH[name][shade] })),
    }));

    // Theme scales.
    const t = resolved.theme;
    const pickTheme = key => (typeof t[key] === 'object' ? t[key] : {});
    const themeScales = {
      spacing: pickTheme('spacing'),
      screens: Object.assign({}, pickTheme('screens'), { '2xl': '1536px (compiler only)' }),
      fontFamily: Object.keys(pickTheme('fontFamily')).reduce((o, k) => { o[k] = [].concat(t.fontFamily[k]).join(', '); return o; }, {}),
      fontSize: pickTheme('fontSize'),
      fontWeight: pickTheme('fontWeight'),
      letterSpacing: pickTheme('letterSpacing'),
      lineHeight: pickTheme('lineHeight'),
      borderRadius: pickTheme('borderRadius'),
      borderWidth: pickTheme('borderWidth'),
      boxShadow: pickTheme('boxShadow'),
      opacity: pickTheme('opacity'),
      ringWidth: pickTheme('ringWidth'),
      ringOffsetWidth: pickTheme('ringOffsetWidth'),
      zIndex: pickTheme('zIndex'),
      transitionDuration: pickTheme('transitionDuration'),
    };

    // Preview CSS: the project's base layer, then every previewed class
    // compiled by the project's own compiler (in Tailwind order).
    const previewRules = [];
    previewTokens.forEach(token => {
      const r = jit.buildRule(token, baseline, theme);
      if (r) previewRules.push(r);
    });
    const previewCss = [
      '/* Generated by frontend/docs/tailwind/generate.js — the project\'s Tailwind base layer and the classes',
      '   the documentation previews, compiled by frontend/scripts/tailwind-jit.js. Scoped to .d-preview. */',
      scopeToPreview(baseCss),
      scopeToPreview(jit.render(previewRules)),
    ].join('\n');

    const totalUtilities = sections.reduce((n, s) => n + s.pages.reduce((m, p) => m + p.utilities.length, 0), 0);
    const addedUtilities = sections.reduce((n, s) => n + s.pages.reduce((m, p) => m + p.utilities.filter(u => u.n).length, 0), 0);
    const variantUtilities = Array.from(baseline.defined).filter(c => c.indexOf(':') !== -1).length;

    const data = {
      meta: {
        generated: new Date().toISOString(),
        tailwindVersion: tailwindPkg.version,
        paletteSource: 'tailwindcss@4.3.3',
        totalUtilities,
        addedUtilities,
        variantUtilities,
        pages: sections.reduce((n, s) => n + s.pages.length, 0),
        otherCount: other.utilities.length,
        colors: paletteFamilies.length * 11,
      },
      sections,
      newSyntax,
      palette: paletteFamilies,
      theme: themeScales,
      compilerVariants: {
        screens: ['sm', 'md', 'lg', 'xl', '2xl'],
        media: ['dark', 'print', 'motion-safe', 'motion-reduce', 'portrait', 'landscape'],
        states: ['hover', 'focus', 'focus-within', 'focus-visible', 'active', 'visited', 'target', 'disabled', 'enabled',
          'checked', 'indeterminate', 'required', 'optional', 'valid', 'invalid', 'read-only', 'placeholder-shown', 'autofill',
          'default', 'empty', 'open', 'first', 'last', 'only', 'odd', 'even', 'first-of-type', 'last-of-type', 'only-of-type'],
        pseudoElements: ['before', 'after', 'placeholder', 'selection', 'file', 'marker', 'first-letter', 'first-line'],
        attributes: ['aria-busy', 'aria-checked', 'aria-disabled', 'aria-expanded', 'aria-hidden', 'aria-pressed', 'aria-readonly',
          'aria-required', 'aria-selected', 'aria-[…]', 'data-[…]'],
        relational: ['group-*', 'peer-*', 'group-[…]', 'peer-[…]'],
        other: ['supports-[…]', '[&…]', '[@media(…)]', '[@supports(…)]', '!important'],
      },
    };

    const assets = path.join(DOC_DIR, 'assets');
    if (!fs.existsSync(assets)) fs.mkdirSync(assets);
    fs.writeFileSync(path.join(assets, 'data.js'),
      '/* Generated by frontend/docs/tailwind/generate.js — do not edit. */\nwindow.TW_DOCS = ' + JSON.stringify(data) + ';\n');
    fs.writeFileSync(path.join(assets, 'preview.css'), previewCss);

    console.log(`[docs:tailwind] ${totalUtilities} utilities on ${data.meta.pages} pages (${addedUtilities} added by the project), ` +
      `${newSyntax.reduce((n, g) => n + g.examples.length, 0)} compiled examples, ${data.meta.colors} colours, ` +
      `${other.utilities.length} unclassified — ${Date.now() - started}ms`);
    if (other.utilities.length > 0) {
      console.log('[docs:tailwind] unclassified: ' + other.utilities.map(u => u.c).join(' '));
    }
  });
}

/**
 * Scopes the project's CSS to preview boxes, so its base styles (preflight)
 * and utilities never touch the documentation's own layout. Every selector is
 * prefixed with `.d-preview`; element-level base rules (html, body, *) are
 * mapped onto the preview container itself.
 */
function scopeToPreview(css) {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;
    rule.selectors = rule.selectors.map(sel => {
      const s = sel.trim();
      if (/^(html|body|:root)$/.test(s)) return '.d-preview';
      if (/^\*|^::(before|after)|^::-/.test(s)) return `.d-preview ${s}, .d-preview${s.replace(/^\*/, '')}`.replace(/, \.d-preview$/, '');
      return `.d-preview ${s}`;
    });
  });
  return root.toString();
}

main().catch(err => {
  console.error('[docs:tailwind] failed:', err);
  process.exit(1);
});
